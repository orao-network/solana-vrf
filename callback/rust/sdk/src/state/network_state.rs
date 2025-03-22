use anchor_lang::{account, prelude::Pubkey, AnchorDeserialize, AnchorSerialize, Discriminator};

use super::super::borsh;

/// This PDA holds oracle state and configuration.
#[account]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct NetworkState {
    /// Account bump.
    pub bump: u8,
    /// Active configuration.
    pub config: NetworkConfiguration,
    /// Total number of received requests.
    pub num_requests: u64,
    /// Total number of registered clients.
    pub num_registered: u64,
    /// Total number of terminated clients.
    pub num_terminated: u64,
}

impl NetworkState {
    pub const STATIC_SIZE: usize = 1 + NetworkConfiguration::STATIC_SIZE + 8 + 8 + 8;

    /// Creates new instance with the given configuration.
    pub fn new(bump: u8, config: NetworkConfiguration) -> Self {
        Self {
            bump,
            config,
            num_requests: 0,
            num_registered: 0,
            num_terminated: 0,
        }
    }

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE + self.config.dynamic_size()
    }

    /// Finds the network state PDA address and bump for the given VRF address.
    ///
    /// - `vrf_id` — use the [`crate::id()`] to get the proper address.
    pub fn find_address(vrf_id: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[crate::CB_CONFIG_ACCOUNT_SEED], vrf_id)
    }
}

/// Oracle configuration
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct NetworkConfiguration {
    /// An authority.
    pub authority: Pubkey,
    /// Treasury account address.
    pub treasury: Pubkey,
    /// Per-request fee paid by a client.
    pub request_fee: u64,
    /// Callback deadline measured in slots (1 slot is approximately 400ms).
    ///
    /// If callback keeps failing util this deadline reached, then the request
    /// will be fulfilled without calling the callback.
    ///
    /// Note that well-written callback should never fail, so this should never
    /// apply to your client.
    pub callback_deadline: u64,
    /// This parties are authorized to fulfill requests.
    pub fulfill_authorities: Vec<Pubkey>,
}

impl NetworkConfiguration {
    pub const STATIC_SIZE: usize = 32 + 32 + 8 + 8 + 4;
    /// Approximately one hour.
    pub(crate) const DEFAULT_CALLBACK_DEADLINE: u64 = 1000 * 60 * 60 / 400;

    /// Creates new instance.
    pub fn new(authority: Pubkey, treasury: Pubkey, request_fee: u64) -> Self {
        Self {
            authority,
            treasury,
            request_fee,
            callback_deadline: Self::DEFAULT_CALLBACK_DEADLINE,
            fulfill_authorities: vec![],
        }
    }

    pub fn is_fulfill_authority(&self, key: &Pubkey) -> bool {
        self.fulfill_authorities.contains(key)
    }

    pub fn dynamic_size(&self) -> usize {
        self.fulfill_authorities.len() * 32
    }

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE + self.dynamic_size()
    }
}
