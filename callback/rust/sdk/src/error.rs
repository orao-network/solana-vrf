use anchor_lang::prelude::*;

use crate::state::client::DecompileError;

#[error_code]
#[derive(PartialEq, Eq)]
#[non_exhaustive]
pub enum ErrorCode {
    #[msg("Not authorized")]
    NotAuthorized,
    #[msg("Unexpected client program")]
    UnexpectedClientProgram,
    #[msg("Unexpected client program data")]
    UnexpectedClientProgramData,
    #[msg("Unexpected client state")]
    UnexpectedClientState,
    #[msg("Too many accounts given")]
    TooManyAccounts,
    #[msg("Unable to validate account ownership")]
    WrongOwner,
    #[msg("Wrong treasury given")]
    WrongTreasury,
    #[msg("Malformed fulfill message")]
    MalformedFulfillMessage,
    #[msg("Signature does not match the seed")]
    InvalidFulfillMessage,
    #[msg("Fulfilled")]
    Fulfilled,
    #[msg("Malformed Fulfill instruction")]
    MalformedFulfill,
    #[msg("Callback accounts hash mismatch")]
    CallbackAccountsHashMismatch,
    #[msg("Lookup index out of bounds")]
    LookupIndexOutOfBounds,
    #[msg("Missing lookup tables")]
    MissingLookupTables,
    // Update ErrorCode::from_custom_error in case of a new variant
}

impl From<DecompileError> for ErrorCode {
    fn from(value: DecompileError) -> Self {
        match value {
            DecompileError::LookupError(_) => Self::LookupIndexOutOfBounds,
            DecompileError::AccountsHashMismatch { .. } => Self::CallbackAccountsHashMismatch,
        }
    }
}
