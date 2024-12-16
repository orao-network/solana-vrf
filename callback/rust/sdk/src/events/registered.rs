use anchor_lang::prelude::*;

/// Event that signals that new client was registered.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[non_exhaustive]
pub struct Registered {
    pub owner: Pubkey,
    pub program: Pubkey,
    pub state: Pubkey,
    pub client: Pubkey,
}

impl Registered {
    pub fn new(owner: Pubkey, program: Pubkey, state: Pubkey, client: Pubkey) -> Self {
        Self {
            owner,
            program,
            state,
            client,
        }
    }
}
