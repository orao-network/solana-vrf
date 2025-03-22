use anchor_lang::prelude::*;

/// Event that signals that a callback was called.
#[event]
#[derive(Debug, Clone, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub struct CalledBack {
    pub program: Pubkey,
}

impl CalledBack {
    pub fn new(program: Pubkey) -> Self {
        Self { program }
    }
}
