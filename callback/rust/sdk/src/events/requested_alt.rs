use anchor_lang::prelude::*;

use crate::state::client::ValidatedCallbackAlt;

/// Event that signals a new request.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub struct RequestedAlt {
    pub client: Pubkey,
    pub seed: [u8; 32],
    /// The callback that would be called.
    pub callback: Option<ValidatedCallbackAlt>,
    /// Lookup Tables given to the callback.
    pub lookup_tables: Vec<Pubkey>,
}

impl RequestedAlt {
    pub fn new(
        client: Pubkey,
        seed: [u8; 32],
        callback: Option<ValidatedCallbackAlt>,
        lookup_tables: Vec<Pubkey>,
    ) -> Self {
        Self {
            client,
            seed,
            callback,
            lookup_tables,
        }
    }
}
