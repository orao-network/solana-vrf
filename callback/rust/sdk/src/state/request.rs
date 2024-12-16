use anchor_lang::{prelude::*, solana_program::clock::Slot};

use super::{
    super::{majority, MAX_FULFILLMENT_AUTHORITIES},
    client::ValidatedCallback,
};

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Debug)]
#[non_exhaustive]
pub struct Response {
    pub pubkey: Pubkey,
    pub randomness: [u8; 64],
}

impl Response {
    pub const SIZE: usize = 32 + 64;

    pub fn new(pubkey: Pubkey, randomness: [u8; 64]) -> Self {
        Self { pubkey, randomness }
    }
}

/// The account holding a randomness request state.
#[account]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct RequestAccount {
    /// PDA bump.
    pub bump: u8,
    /// The slot this request was created at.
    pub slot: Slot,
    /// The client created the request.
    pub client: Pubkey,
    /// Request seed.
    pub seed: [u8; 32],
    /// The state of this randomness request.
    pub state: RequestState,
}

impl RequestAccount {
    pub const STATIC_SIZE: usize = 1 + 8 + 32 + 32;
    pub const FULFILLED_SIZE: usize = Self::STATIC_SIZE + RequestState::FULFILLED_SIZE;

    pub fn new(bump: u8, slot: Slot, client: Pubkey, seed: [u8; 32], state: RequestState) -> Self {
        Self {
            bump,
            slot,
            client,
            seed,
            state,
        }
    }

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE + self.state.size()
    }

    /// Finds the request PDA address and bump for the given client, seed and VRF address.
    ///
    /// - `vrf_id` — use the [`crate::id()`] to get the proper address.
    pub fn find_address(client: &Pubkey, seed: &[u8; 32], vrf_id: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[crate::CB_REQUEST_ACCOUNT_SEED, client.as_ref(), seed],
            vrf_id,
        )
    }

    /// See [`RequestState::fulfilled`].
    #[inline(always)]
    pub const fn fulfilled(&self) -> Option<&Fulfilled> {
        self.state.fulfilled()
    }

    /// See [`RequestState::fulfilled_mut`].
    #[inline(always)]
    pub fn fulfilled_mut(&mut self) -> Option<&mut Fulfilled> {
        self.state.fulfilled_mut()
    }

    /// See [`RequestState::pending`].
    #[inline(always)]
    pub fn pending(&self) -> Option<&Pending> {
        self.state.pending()
    }

    /// See [`RequestState::pending_mut`].
    #[inline(always)]
    pub fn pending_mut(&mut self) -> Option<&mut Pending> {
        self.state.pending_mut()
    }

    /// Returns the request seed.
    #[inline(always)]
    pub const fn seed(&self) -> &[u8; 32] {
        &self.seed
    }

    /// Returns the [`Client`] account address.
    ///
    /// [`Client`]: super::super::state::client::Client
    #[inline(always)]
    pub const fn client(&self) -> &Pubkey {
        &self.client
    }

    /// See [`RequestState::unwrap_pending`].
    #[inline(always)]
    pub fn unwrap_pending(self) -> Pending {
        self.state.unwrap_pending()
    }

    /// See [`RequestState::unwrap_fulfilled`].
    #[inline(always)]
    pub fn unwrap_fulfilled(self) -> Fulfilled {
        self.state.unwrap_fulfilled()
    }
}

/// Pending randomness request.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct Pending {
    /// Responses collected so far.
    pub responses: Vec<Response>,
    /// Callback (if any).
    pub callback: Option<ValidatedCallback>,
    /// If `true` then [`Pending::callback`] is a request-level callback.
    pub callback_override: bool,
}

impl Pending {
    pub const STATIC_SIZE: usize =
        4 + (Response::SIZE) * majority(MAX_FULFILLMENT_AUTHORITIES as usize);

    pub fn new(
        responses: Vec<Response>,
        callback: Option<ValidatedCallback>,
        callback_override: bool,
    ) -> Self {
        Self {
            responses,
            callback,
            callback_override,
        }
    }

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE
            + 1
            + self
                .callback
                .as_ref()
                .map(ValidatedCallback::size)
                .unwrap_or_default()
    }

    pub fn is_fulfilled_by(&self, key: &Pubkey) -> bool {
        self.responses.iter().any(|x| x.pubkey == *key)
    }
}

/// Fulfilled request representation.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct Fulfilled {
    /// Generated randomness.
    ///
    /// It is validated within the fulfill instruction. Please look into the account history logs
    /// and VRF events to observe the individual components.
    pub randomness: [u8; 64],
    /// Individual responses constituting the randomness.
    ///
    /// This going to be `Some` within the callback invocation, and `None` afterwards.
    pub responses: Option<Vec<Response>>,
}

impl Fulfilled {
    pub const FROZEN_SIZE: usize = 64 + 1;
    pub const INITIAL_SIZE: usize =
        64 + 1 + (Response::SIZE) * majority(MAX_FULFILLMENT_AUTHORITIES as usize);

    pub fn new(randomness: [u8; 64], responses: Option<Vec<Response>>) -> Self {
        Self {
            randomness,
            responses,
        }
    }
}

/// Randomness request state.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub enum RequestState {
    Pending(Pending),
    Fulfilled(Fulfilled),
}

impl RequestState {
    pub const FULFILLED_SIZE: usize = 1 + Fulfilled::FROZEN_SIZE;

    /// Creates a pending state.
    pub fn new(callback: Option<ValidatedCallback>, callback_override: bool) -> Self {
        Self::Pending(Pending::new(vec![], callback, callback_override))
    }

    pub fn size(&self) -> usize {
        match self {
            RequestState::Pending(pending) => 1 + pending.size(),
            RequestState::Fulfilled(_) => Self::FULFILLED_SIZE,
        }
    }

    /// Returns fulfilled randomness request.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub const fn fulfilled(&self) -> Option<&Fulfilled> {
        match self {
            RequestState::Pending(_) => None,
            RequestState::Fulfilled(ref x) => Some(x),
        }
    }

    /// Returns fulfilled randomness request.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub fn fulfilled_mut(&mut self) -> Option<&mut Fulfilled> {
        match self {
            RequestState::Pending(_) => None,
            RequestState::Fulfilled(ref mut x) => Some(x),
        }
    }

    /// Returns pending randomness request.
    ///
    /// Returns `None` if randomness is already fulfilled.
    pub fn pending(&self) -> Option<&Pending> {
        match self {
            RequestState::Pending(ref x) => Some(x),
            RequestState::Fulfilled(_) => None,
        }
    }

    /// Returns pending randomness request.
    ///
    /// Returns `None` if randomness is already fulfilled.
    pub fn pending_mut(&mut self) -> Option<&mut Pending> {
        match self {
            RequestState::Pending(ref mut x) => Some(x),
            RequestState::Fulfilled(_) => None,
        }
    }

    /// Returns the pending randomness.
    ///
    /// # Panic
    ///
    /// Panics if the randomness is fulfilled.
    #[inline(always)]
    #[track_caller]
    pub fn unwrap_pending(self) -> Pending {
        match self {
            RequestState::Pending(x) => x,
            RequestState::Fulfilled(_) => {
                panic!("called `RequestState::unwrap_pending()` on a `Fulfilled` request state")
            }
        }
    }

    /// Returns the fulfilled randomness.
    ///
    /// # Panic
    ///
    /// Panics if the randomness is pending.
    #[inline(always)]
    #[track_caller]
    pub fn unwrap_fulfilled(self) -> Fulfilled {
        match self {
            RequestState::Fulfilled(x) => x,
            RequestState::Pending(_) => {
                panic!("called `RequestState::unwrap_fulfilled()` on a `Pending` request state")
            }
        }
    }
}
