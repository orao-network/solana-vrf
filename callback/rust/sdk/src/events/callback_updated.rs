use anchor_lang::prelude::*;

/// Event that signals that a callback was updated.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[non_exhaustive]
pub struct CallbackUpdated {
    pub owner: Pubkey,
    pub client: Pubkey,
    /// `true` if new callback is `Some(_)`.
    pub defined: bool,
}

impl CallbackUpdated {
    pub fn new(owner: Pubkey, client: Pubkey, defined: bool) -> Self {
        Self {
            owner,
            client,
            defined,
        }
    }
}
