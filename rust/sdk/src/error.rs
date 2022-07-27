use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Randomness seed cannot be zero")]
    ZeroSeed,

    #[msg("Another account is using the provided seed, so randomness can be predicted")]
    SeedAlreadyInUse,

    #[msg("The called account doesn't have enough funds to cover the randomness request")]
    InsufficientFunds,

    #[msg("Failed to verify randomness against the public key")]
    RandomnessVerificationFailed,

    #[msg("Serialization error")]
    SerializationError,

    #[msg("Unauthorized fulfillment authority")]
    UnauthorizedFulfillmentAuthority,

    #[msg("Signature does not match the seed")]
    InvalidFulfillMessage,

    #[msg("Missing Ed25519SigVerify instruction")]
    MissingEd25519SigVerifyInstruction,

    #[msg("Failed to validate combined randomness")]
    RandomnessCombinationFailed,

    #[msg("UnknownTreasuryGiven")]
    UnknownTreasuryGiven,
}
