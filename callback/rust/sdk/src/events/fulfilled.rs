use anchor_lang::prelude::*;

/// Event that signals a request was fulfilled.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[cfg_attr(
    all(feature = "sdk", not(feature = "idl-build")),
    derive(serde::Serialize, serde::Deserialize)
)]
#[non_exhaustive]
pub struct Fulfilled {
    pub client: Pubkey,
    pub seed: [u8; 32],
    #[cfg_attr(
        all(feature = "sdk", not(feature = "idl-build")),
        serde(with = "crate::sdk::misc::arrays")
    )]
    pub randomness: [u8; 64],
}

impl Fulfilled {
    pub fn new(client: Pubkey, seed: [u8; 32], randomness: [u8; 64]) -> Self {
        Self {
            client,
            seed,
            randomness,
        }
    }
}
