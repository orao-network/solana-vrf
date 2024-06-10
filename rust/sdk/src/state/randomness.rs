use anchor_lang::prelude::*;

use crate::{majority, MAX_FULFILLMENT_AUTHORITIES_COUNT};

/// This account is now obsolete and exists as a legacy to observe the old requests.
#[account]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct Randomness {
    pub seed: [u8; 32],
    pub randomness: [u8; 64],
    pub responses: Vec<RandomnessResponse>,
}

impl Randomness {
    pub const SIZE: usize =
        32 + 64 + 4 + RandomnessResponse::SIZE * majority(MAX_FULFILLMENT_AUTHORITIES_COUNT);

    /// Returns fulfilled randomness.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub const fn fulfilled(&self) -> Option<&[u8; 64]> {
        if !matches!(
            self.randomness,
            [
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
            ]
        ) {
            Some(&self.randomness)
        } else {
            None
        }
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct RandomnessResponse {
    pub pubkey: Pubkey,
    pub randomness: [u8; 64],
}

impl RandomnessResponse {
    pub const SIZE: usize = 32 + 64;
}
