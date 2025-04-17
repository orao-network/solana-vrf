use anchor_lang::{
    error::{
        Error,
        ErrorCode::{AccountDidNotDeserialize, AccountOwnedByWrongProgram},
    },
    prelude::*,
    solana_program::address_lookup_table::{
        self, state::AddressLookupTable, AddressLookupTableAccount,
    },
};

/// This helper will parse the given slice of accounts as Address Lookup Table accounts.
///
/// Note that `accounts` must be a properly ordered slice because the callback call will
/// be rejected if there is an order mismatch between the moment of VRF being requested
/// and the moment callback being called.
pub fn parse_lookup_tables(
    accounts: &[AccountInfo],
) -> anchor_lang::Result<Vec<AddressLookupTableAccount>> {
    let mut lookup_tables = Vec::with_capacity(accounts.len());

    for (i, account_info) in accounts.iter().enumerate() {
        if *account_info.owner != address_lookup_table::program::ID {
            return Err(
                Error::from(AccountOwnedByWrongProgram).with_account_name(format!(
                    "remaining account #{} must be owned by the Address Lookup Table program",
                    i + 1
                )),
            );
        }

        let data = account_info.data.borrow();

        let lookup_table = AddressLookupTable::deserialize(&data).map_err(|e| {
            msg!("Unable to deserialize AddressLookupTable: {}", e);
            Error::from(AccountDidNotDeserialize).with_account_name(format!(
                "remaining account #{} as Address Lookup Table account",
                i + 1
            ))
        })?;

        lookup_tables.push(AddressLookupTableAccount {
            key: *account_info.key,
            addresses: lookup_table.addresses.to_vec(),
        });
    }

    Ok(lookup_tables)
}
