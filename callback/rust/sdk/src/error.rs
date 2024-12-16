use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq, Eq)]
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
    // Update ErrorCode::from_custom_error in case of a new variant
}
