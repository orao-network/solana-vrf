use std::mem::size_of;

use anchor_lang::prelude::*;
use orao_solana_vrf::state::Randomness;

#[account]
pub struct PlayerState {
    pub player: Pubkey,
    pub force: [u8; 32],
    pub rounds: u64,
}

impl PlayerState {
    pub const SIZE: usize = std::mem::size_of::<Self>();

    /// Creates a new state for the `player`.
    pub fn new(player: Pubkey) -> Self {
        Self {
            player,
            force: Default::default(),
            rounds: Default::default(),
        }
    }

    /// Asserts that the player is able to play.
    ///
    /// Returns `Ok` on success.
    pub fn assert_can_play(&self, prev_round_acc: &AccountInfo) -> Result<()> {
        if self.rounds == 0 {
            return Ok(());
        }
        let rand_acc = crate::misc::get_account_data(prev_round_acc)?;
        match current_state(&rand_acc) {
            CurrentState::Alive => Ok(()),
            CurrentState::Dead => Err(crate::Error::PlayerDead.into()),
            CurrentState::Playing => Err(crate::Error::TheCylinderIsStillSpinning.into()),
        }
    }
}

/// Last round outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurrentState {
    /// Player is alive and able to play.
    Alive,
    /// Player is dead and can't play anymore.
    Dead,
    /// Player is waiting for current round to finish.
    Playing,
}

/// Derives last round outcome.
pub fn current_state(randomness: &Randomness) -> CurrentState {
    if let Some(randomness) = randomness.fulfilled() {
        if is_dead(randomness) {
            CurrentState::Dead
        } else {
            CurrentState::Alive
        }
    } else {
        CurrentState::Playing
    }
}

/// Decides whether player is dead or alive.
fn is_dead(randomness: &[u8; 64]) -> bool {
    // use only first 8 bytes for simplicyty
    let value = randomness[0..size_of::<u64>()].try_into().unwrap();
    u64::from_le_bytes(value) % 6 == 0
}
