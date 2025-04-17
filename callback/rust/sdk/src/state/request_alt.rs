use anchor_lang::prelude::*;

use super::{
    super::{majority, MAX_FULFILLMENT_AUTHORITIES},
    client::{Callback, Client, ValidatedCallbackAlt},
    request::{Fulfilled, Response},
};

/// The account holding a randomness request state.
#[account]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct RequestAltAccount {
    /// PDA bump.
    pub bump: u8,
    /// The slot this request was created at.
    pub slot: u64,
    /// The client created the request.
    pub client: Pubkey,
    /// Request seed.
    pub seed: [u8; 32],
    /// The state of this randomness request.
    pub state: RequestAltState,
}

impl RequestAltAccount {
    pub const STATIC_SIZE: usize = 1 + 8 + 32 + 32;
    pub const FULFILLED_SIZE: usize = Self::STATIC_SIZE + RequestAltState::FULFILLED_SIZE;

    /// This function estimates the expected size of the new RequestAccount given the callback used.
    pub fn expected_size(client: &Client, callback: Option<&Callback>) -> usize {
        let callback_size = callback
            .map(|x| x.valid_size())
            .or_else(|| client.callback.as_ref().map(|c| c.size()))
            .unwrap_or_default();

        Self::STATIC_SIZE + 1 + PendingAlt::STATIC_SIZE + 1 + callback_size
    }

    pub fn new(
        bump: u8,
        slot: u64,
        client: Pubkey,
        seed: [u8; 32],
        state: RequestAltState,
    ) -> Self {
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
            &[crate::CB_REQUEST_ALT_ACCOUNT_SEED, client.as_ref(), seed],
            vrf_id,
        )
    }

    /// See [`RequestAltState::fulfilled`].
    #[inline(always)]
    pub const fn fulfilled(&self) -> Option<&Fulfilled> {
        self.state.fulfilled()
    }

    /// See [`RequestAltState::fulfilled_mut`].
    #[inline(always)]
    pub fn fulfilled_mut(&mut self) -> Option<&mut Fulfilled> {
        self.state.fulfilled_mut()
    }

    /// See [`RequestAltState::pending`].
    #[inline(always)]
    pub fn pending(&self) -> Option<&PendingAlt> {
        self.state.pending()
    }

    /// See [`RequestAltState::pending_mut`].
    #[inline(always)]
    pub fn pending_mut(&mut self) -> Option<&mut PendingAlt> {
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

    /// See [`RequestAltState::unwrap_pending`].
    #[inline(always)]
    pub fn unwrap_pending(self) -> PendingAlt {
        self.state.unwrap_pending()
    }

    /// See [`RequestAltState::unwrap_fulfilled`].
    #[inline(always)]
    pub fn unwrap_fulfilled(self) -> Fulfilled {
        self.state.unwrap_fulfilled()
    }
}

/// Pending randomness request.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct PendingAlt {
    /// Responses collected so far.
    pub responses: Vec<Response>,
    /// Callback (if any).
    pub callback: Option<ValidatedCallbackAlt>,
    /// Lookup Tables given to the callback.
    pub lookup_tables: Vec<Pubkey>,
}

impl PendingAlt {
    pub const STATIC_SIZE: usize =
        4 + majority(MAX_FULFILLMENT_AUTHORITIES as usize) * Response::SIZE + 1 + 1 + 4;

    pub fn new(
        responses: Vec<Response>,
        callback: Option<ValidatedCallbackAlt>,
        lookup_tables: Vec<Pubkey>,
    ) -> Self {
        Self {
            responses,
            callback,
            lookup_tables,
        }
    }

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE
            + self
                .callback
                .as_ref()
                .map(ValidatedCallbackAlt::size)
                .unwrap_or_default()
            + self.lookup_tables.len() * 32
    }

    pub fn is_fulfilled_by(&self, key: &Pubkey) -> bool {
        self.responses.iter().any(|x| x.pubkey == *key)
    }
}

/// Randomness request state.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub enum RequestAltState {
    Pending(PendingAlt),
    Fulfilled(Fulfilled),
}

impl RequestAltState {
    pub const FULFILLED_SIZE: usize = 1 + Fulfilled::FROZEN_SIZE;

    /// Creates a pending state.
    pub fn new(lookup_tables: Vec<Pubkey>, callback: Option<ValidatedCallbackAlt>) -> Self {
        Self::Pending(PendingAlt::new(vec![], callback, lookup_tables))
    }

    pub fn size(&self) -> usize {
        match self {
            RequestAltState::Pending(pending) => 1 + pending.size(),
            RequestAltState::Fulfilled(_) => Self::FULFILLED_SIZE,
        }
    }

    /// Returns fulfilled randomness request.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub const fn fulfilled(&self) -> Option<&Fulfilled> {
        match self {
            RequestAltState::Pending(_) => None,
            RequestAltState::Fulfilled(ref x) => Some(x),
        }
    }

    /// Returns fulfilled randomness request.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub fn fulfilled_mut(&mut self) -> Option<&mut Fulfilled> {
        match self {
            RequestAltState::Pending(_) => None,
            RequestAltState::Fulfilled(ref mut x) => Some(x),
        }
    }

    /// Returns pending randomness request.
    ///
    /// Returns `None` if randomness is already fulfilled.
    pub fn pending(&self) -> Option<&PendingAlt> {
        match self {
            RequestAltState::Pending(ref x) => Some(x),
            RequestAltState::Fulfilled(_) => None,
        }
    }

    /// Returns pending randomness request.
    ///
    /// Returns `None` if randomness is already fulfilled.
    pub fn pending_mut(&mut self) -> Option<&mut PendingAlt> {
        match self {
            RequestAltState::Pending(ref mut x) => Some(x),
            RequestAltState::Fulfilled(_) => None,
        }
    }

    /// Returns the pending randomness.
    ///
    /// # Panic
    ///
    /// Panics if the randomness is fulfilled.
    #[inline(always)]
    #[track_caller]
    pub fn unwrap_pending(self) -> PendingAlt {
        match self {
            RequestAltState::Pending(x) => x,
            RequestAltState::Fulfilled(_) => {
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
            RequestAltState::Fulfilled(x) => x,
            RequestAltState::Pending(_) => {
                panic!("called `RequestState::unwrap_fulfilled()` on a `Pending` request state")
            }
        }
    }
}
