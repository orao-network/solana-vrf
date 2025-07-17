use anchor_lang::{
    error::{
        Error,
        ErrorCode::{AccountDidNotDeserialize, AccountOwnedByWrongProgram},
    },
    prelude::{
        borsh::{BorshDeserialize, BorshSerialize},
        *,
    },
    solana_program::{
        address_lookup_table::{self, state::AddressLookupTable, AddressLookupTableAccount},
        program::{get_return_data, set_return_data},
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

/// This helper will parse the given slice of accounts as Address Lookup Tables.
///
/// Same as [`parse_lookup_tables`] but it won't allocate for mapped addresses.
///
/// Note that `accounts` must be a properly ordered slice because the callback call will
/// be rejected if there is an order mismatch between the moment of VRF being requested
/// and the moment callback being called.
pub fn with_parsed_lookup_tables<
    T: 'static,
    F: for<'a> FnMut(&[(&'a Pubkey, AddressLookupTable<'a>)]) -> anchor_lang::Result<T>,
>(
    accounts: &[AccountInfo],
    mut f: F,
) -> anchor_lang::Result<T> {
    let mut borrowed_data = Vec::with_capacity(accounts.len());
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

        borrowed_data.push(account_info.try_borrow_data()?);
    }

    for (i, (data, info)) in borrowed_data.iter().zip(accounts).enumerate() {
        let lookup_table = AddressLookupTable::deserialize(&data).map_err(|e| {
            msg!("Unable to deserialize AddressLookupTable: {}", e);
            Error::from(AccountDidNotDeserialize).with_account_name(format!(
                "remaining account #{} as Address Lookup Table account",
                i + 1
            ))
        })?;

        lookup_tables.push((info.key, lookup_table));
    }

    let result = f(&lookup_tables);
    result
}

/// This guard is used to send directives to the VRF contract.
///
/// This feature is backed by the [return data][return-data] functionality,
/// so it is crucial to set return data after all the CPI invoked by the
/// callback. Thats why it's a drop-guard.
///
/// Make sure that the guard is created at the top scope of your callback:
///
/// ```ignore
/// fn your_callback() {
///     let mut guard = DirectiveGuard::default();
///
///     // .. somewhere in your callback
///     guard.reimburse_to(some_key);
///
///     // .. return data set by the drop impl when guard goes out of scope
/// }
/// ```
///
/// [return-data]: https://docs.anza.xyz/proposals/return-data/
#[derive(Default)]
pub struct DirectiveGuard {
    reimburse_to: Option<Pubkey>,
}

impl DirectiveGuard {
    /// Use this directive to override the default VRF behavior of reimbursing
    /// extra rent of the fulfilled request.
    ///
    /// By default VRF will reimburse extra rent to the rent payer (to the client PDA).
    /// If this directive was set, then the extra rent will be reimbursed to the given `pubkey`.
    pub fn reimburse_to(&mut self, pubkey: Pubkey) {
        self.reimburse_to = Some(pubkey);
    }
}

impl Drop for DirectiveGuard {
    fn drop(&mut self) {
        // precalculate the count to save some heap space
        let count = self.reimburse_to.is_some() as usize;

        // return data buffer size
        let mut buf_size = 4;

        if count == 0 {
            return;
        }

        let mut directives = Vec::with_capacity(count);

        if let Some(reimburse_to) = self.reimburse_to {
            let directive = CallbackReturnData::ReimburseTo(reimburse_to);
            buf_size += directive.size();
            directives.push(CallbackReturnData::ReimburseTo(reimburse_to));
        }

        let mut buffer = Vec::with_capacity(buf_size);

        directives.serialize(&mut buffer).unwrap();

        set_return_data(&buffer);
    }
}

#[derive(BorshDeserialize, BorshSerialize)]
pub(crate) enum CallbackReturnData {
    ReimburseTo(Pubkey),
}

impl CallbackReturnData {
    fn size(&self) -> usize {
        match self {
            CallbackReturnData::ReimburseTo(_) => 1 + 32,
        }
    }
}
