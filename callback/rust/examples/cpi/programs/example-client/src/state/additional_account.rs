use anchor_lang::prelude::*;

/// This account illustrates optional additional accounts that could be forwarded
/// to a callback call.
///
/// This account will hold latest callback parameter and randomness and used
/// to test the VRF behavior.
#[account]
pub struct AdditionalAccount {
    pub bump: u8,
    pub randomness: [u8; 64],
    pub param: u8,
}

impl AdditionalAccount {
    pub const SIZE: usize = 1 + 64 + 1;
}
