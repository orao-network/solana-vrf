use anchor_lang::prelude::*;

/// Event that signals a new response.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[cfg_attr(
    all(feature = "sdk", not(feature = "idl-build")),
    derive(serde::Serialize, serde::Deserialize)
)]
#[non_exhaustive]
pub struct Responded {
    pub authority: Pubkey,
    pub client: Pubkey,
    pub seed: [u8; 32],
    #[cfg_attr(
        all(feature = "sdk", not(feature = "idl-build")),
        serde(with = "crate::sdk::misc::arrays")
    )]
    pub randomness: [u8; 64],
}

impl Responded {
    pub fn new(authority: Pubkey, client: Pubkey, seed: [u8; 32], randomness: [u8; 64]) -> Self {
        Self {
            authority,
            client,
            seed,
            randomness,
        }
    }
}
