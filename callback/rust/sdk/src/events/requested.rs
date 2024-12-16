use anchor_lang::prelude::*;

use crate::state::client::ValidatedCallback;

/// Event that signals a new request.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[non_exhaustive]
pub struct Requested {
    pub client: Pubkey,
    pub seed: [u8; 32],
    /// The callback that would be called.
    pub callback: Option<ValidatedCallback>,
    /// True if [`Requested::callback`] is a request-level callback.
    pub callback_override: bool,
}

impl Requested {
    pub fn new(
        client: Pubkey,
        seed: [u8; 32],
        callback: Option<ValidatedCallback>,
        callback_override: bool,
    ) -> Self {
        Self {
            client,
            seed,
            callback,
            callback_override,
        }
    }
}
