use anchor_lang::prelude::*;

/// Event that signals a new randomness request.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
pub struct Request {
    /// Randomness request seed.
    pub seed: [u8; 32],
    /// Client address.
    pub client: Pubkey,
    /// True if request is paid with SPL token.
    pub paid_with_spl: bool,
}

/// Event that signals a fulfilled randomness request.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
pub struct Fulfill {
    /// Randomness request seed.
    pub seed: [u8; 32],
    /// Generated randomness.
    pub randomness: [u8; 64],
}

/// Event that signals that a request was fulfilled by a single authority.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
pub struct Response {
    /// Randomness request seed.
    pub seed: [u8; 32],
    /// An authority that fulfilled the request.
    pub authority: Pubkey,
    /// An authority's randomness (for the final generated randomness see [`Fulfilled::randomness`]).
    pub randomness: [u8; 64],
}
