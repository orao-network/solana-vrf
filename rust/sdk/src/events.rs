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

#[cfg(feature = "sdk")]
impl std::fmt::Display for Request {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Request: seed={} client={} paid_with_spl={}",
            anchor_client::solana_sdk::bs58::encode(&self.seed[..]).into_string(),
            self.client,
            self.paid_with_spl,
        )
    }
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

#[cfg(feature = "sdk")]
impl std::fmt::Display for Fulfill {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Fulfill: seed={} randomness={}",
            anchor_client::solana_sdk::bs58::encode(&self.seed[..]).into_string(),
            anchor_client::solana_sdk::bs58::encode(&self.randomness[..]).into_string(),
        )
    }
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

#[cfg(feature = "sdk")]
impl std::fmt::Display for Response {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Response: seed={} authority={} randomness={}",
            anchor_client::solana_sdk::bs58::encode(&self.seed[..]).into_string(),
            self.authority,
            anchor_client::solana_sdk::bs58::encode(&self.randomness[..]).into_string(),
        )
    }
}
