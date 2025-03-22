use anchor_lang::prelude::*;

/// Event that signals that a client ownership was transferred.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub struct Transferred {
    pub owner: Pubkey,
    pub client: Pubkey,
    pub new_owner: Pubkey,
}

impl Transferred {
    pub fn new(owner: Pubkey, client: Pubkey, new_owner: Pubkey) -> Self {
        Self {
            owner,
            client,
            new_owner,
        }
    }
}
