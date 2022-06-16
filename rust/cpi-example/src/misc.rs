use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    program_pack::IsInitialized, pubkey::Pubkey,
};

pub fn get_account_data<T: BorshDeserialize + IsInitialized>(
    account_info: &AccountInfo,
) -> Result<T, ProgramError> {
    if account_info.data_is_empty() {
        return Err(ProgramError::UninitializedAccount);
    }

    let account: T =
        solana_program::borsh::try_from_slice_unchecked(&account_info.data.borrow()[..])?;
    if !account.is_initialized() {
        Err(ProgramError::UninitializedAccount)
    } else {
        Ok(account)
    }
}

pub fn verify_account_address(acc: &AccountInfo, expected: &Pubkey) -> ProgramResult {
    if acc.key != expected {
        msg!(&format!(
            "error invalid account: {}, expected: {}",
            acc.key, expected
        ));
        Err(ProgramError::InvalidAccountData)
    } else {
        Ok(())
    }
}

pub fn find_randomness_request_account(vrf: &Pubkey, seed: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[b"orao-vrf-randomness-request", seed], &vrf).0
}
