use std::mem::size_of;

use borsh::{BorshDeserialize, BorshSerialize};
use orao_solana_vrf::RandomnessAccount;
use solana_program::{
    account_info::AccountInfo, program_error::ProgramError, program_pack::IsInitialized,
    pubkey::Pubkey,
};

#[cfg(feature = "sdk")]
use solana_client::rpc_client::RpcClient;

#[cfg(feature = "sdk")]
use solana_sdk::account::Account;

/// The state of a known player that is stored on-chain.
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Default)]
pub struct PlayerState {
    /// Player identity.
    pub player: Pubkey,
    /// Last force applied (zero when rounds == 0).
    pub force: [u8; 32],
    /// Number of rounds played.
    pub rounds: u64,
}

impl PlayerState {
    pub const SIZE: usize = std::mem::size_of::<Self>();
    pub const ACCOUNT_SEED: &'static [u8] = b"russian-roulette-player-state";

    /// Creates a new state for the `player`.
    pub fn new(player: Pubkey) -> Self {
        Self {
            player,
            force: Default::default(),
            rounds: Default::default(),
        }
    }

    /// Returns state address for the given player.
    pub fn find_address(player: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[Self::ACCOUNT_SEED, player.as_ref()], &crate::id())
    }

    /// Reads state from `AccountInfo`.
    pub fn from_account_info(account_info: &AccountInfo) -> Result<Self, ProgramError> {
        crate::misc::get_account_data(account_info)
    }

    /// Asserts that the player is able to play.
    ///
    /// Returns `Ok` on success.
    pub fn assert_can_play(&self, prev_round_acc: &AccountInfo) -> Result<(), ProgramError> {
        if self.rounds == 0 {
            return Ok(());
        }

        let rand_acc = crate::misc::get_account_data::<RandomnessAccount>(prev_round_acc)?;
        match current_state(rand_acc) {
            CurrentState::Alive => Ok(()),
            CurrentState::Dead => Err(crate::Error::PlayerDead.into()),
            CurrentState::Playing => Err(crate::Error::TheCylinderIsStillSpinning.into()),
        }
    }
}

// Miscellaneous functions for the cli-helper.
#[cfg(feature = "sdk")]
impl PlayerState {
    pub fn from_account(account: &Account) -> std::io::Result<Self> {
        if account.data.is_empty() {
            return Ok(Default::default());
        }
        Self::deserialize(&mut &*account.data)
    }

    pub fn load_account(player: &Pubkey, rpc: &RpcClient) -> anyhow::Result<Option<Account>> {
        let (address, _) = Self::find_address(player);
        match rpc.get_account(&address) {
            Ok(x) => Ok(Some(x)),
            Err(e) if e.to_string().contains("AccountNotFound") => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn load_from_account(player: &Pubkey, rpc: &RpcClient) -> anyhow::Result<Self> {
        match Self::load_account(player, rpc)? {
            Some(x) => Ok(Self::from_account(&x)?),
            None => Ok(Self::new(*player)),
        }
    }

    pub fn load_current_state(
        &self,
        client: &orao_solana_vrf::VrfRequestor,
    ) -> anyhow::Result<CurrentState> {
        if self.rounds == 0 {
            return Ok(CurrentState::Alive);
        }

        let randomness = client.get_randomness_account(&self.force)?;
        Ok(current_state(randomness))
    }

    pub fn describe(&self, client: &orao_solana_vrf::VrfRequestor) -> anyhow::Result<String> {
        if self.rounds == 0 {
            return Ok(format!("Player {} has never played", self.player));
        }

        match self.load_current_state(client)? {
            CurrentState::Alive => Ok(format!(
                "Player {} is alive after {} rounds",
                self.player, self.rounds
            )),
            CurrentState::Dead => Ok(format!(
                "BANG BANG! Player {} is dead after {} rounds",
                self.player, self.rounds
            )),
            CurrentState::Playing => Ok(format!(
                "Player {} is playing round {}",
                self.player, self.rounds
            )),
        }
    }
}

impl IsInitialized for PlayerState {
    fn is_initialized(&self) -> bool {
        self.player != Pubkey::default()
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
fn current_state(randomness: RandomnessAccount) -> CurrentState {
    match randomness {
        RandomnessAccount::RandomnessRequested { .. } => CurrentState::Playing,
        RandomnessAccount::RandomnessFullfilled { randomness, .. } if is_dead(randomness) => {
            CurrentState::Dead
        }
        _ => CurrentState::Alive,
    }
}

/// Decides whether player is dead or alive.
fn is_dead(randomness: [u8; 64]) -> bool {
    // use only first 16 bytes for simplicyty
    let value = randomness[0..size_of::<u128>()].try_into().unwrap();
    u128::from_le_bytes(value) % 6 == 0
}
