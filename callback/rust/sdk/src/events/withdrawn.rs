use anchor_lang::prelude::*;

/// Event that signals that client funds was withdrawn.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[non_exhaustive]
pub struct Withdrawn {
    pub owner: Pubkey,
    pub client: Pubkey,
    pub amount: u64,
}

impl Withdrawn {
    pub fn new(owner: Pubkey, client: Pubkey, amount: u64) -> Self {
        Self {
            owner,
            client,
            amount,
        }
    }
}
