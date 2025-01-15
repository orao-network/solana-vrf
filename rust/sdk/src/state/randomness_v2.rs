use anchor_lang::prelude::*;

use crate::{majority, MAX_FULFILLMENT_AUTHORITIES_COUNT};

use super::RandomnessResponse;

/// Pending request representation.
#[cfg_attr(feature = "sdk", derive(Debug))]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct PendingRequest {
    pub client: Pubkey,
    pub seed: [u8; 32],
    /// Responses collected so far.
    pub responses: Vec<RandomnessResponse>,
}

impl PendingRequest {
    pub const SIZE: usize =
        32 + 32 + 4 + (RandomnessResponse::SIZE) * majority(MAX_FULFILLMENT_AUTHORITIES_COUNT);
}

/// Fulfilled request representation.
#[cfg_attr(feature = "sdk", derive(Debug))]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct FulfilledRequest {
    pub client: Pubkey,
    pub seed: [u8; 32],
    /// Generated randomness.
    ///
    /// Please look into the account history logs to observe the individual components.
    pub randomness: [u8; 64],
}

impl FulfilledRequest {
    pub const SIZE: usize = 32 + 32 + 64;
}

#[cfg_attr(feature = "sdk", derive(Debug))]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RequestAccount {
    Pending(PendingRequest),
    Fulfilled(FulfilledRequest),
}

impl RequestAccount {
    pub const FULFILLED_SIZE: usize = 1 + FulfilledRequest::SIZE;
    pub const PENDING_SIZE: usize = 1 + PendingRequest::SIZE;

    /// Returns fulfilled randomness request.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub const fn fulfilled(&self) -> Option<&FulfilledRequest> {
        match self {
            RequestAccount::Pending(_) => None,
            RequestAccount::Fulfilled(ref x) => Some(x),
        }
    }

    /// Returns fulfilled randomness request.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub fn fulfilled_mut(&mut self) -> Option<&mut FulfilledRequest> {
        match self {
            RequestAccount::Pending(_) => None,
            RequestAccount::Fulfilled(ref mut x) => Some(x),
        }
    }

    /// Returns pending randomness request.
    ///
    /// Returns `None` if randomness is already fulfilled.
    pub fn pending(&self) -> Option<&PendingRequest> {
        match self {
            RequestAccount::Pending(ref x) => Some(x),
            RequestAccount::Fulfilled(_) => None,
        }
    }

    /// Returns pending randomness request.
    ///
    /// Returns `None` if randomness is already fulfilled.
    pub fn pending_mut(&mut self) -> Option<&mut PendingRequest> {
        match self {
            RequestAccount::Pending(ref mut x) => Some(x),
            RequestAccount::Fulfilled(_) => None,
        }
    }

    /// Returns the request seed.
    pub const fn seed(&self) -> &[u8; 32] {
        match self {
            RequestAccount::Pending(ref x) => &x.seed,
            RequestAccount::Fulfilled(ref x) => &x.seed,
        }
    }

    /// Returns the request client.
    pub const fn client(&self) -> &Pubkey {
        match self {
            RequestAccount::Pending(ref x) => &x.client,
            RequestAccount::Fulfilled(ref x) => &x.client,
        }
    }

    /// Returns the pending randomness.
    ///
    /// # Panic
    ///
    /// Panics if the randomness is fulfilled.
    #[inline(always)]
    #[track_caller]
    pub fn unwrap_pending(self) -> PendingRequest {
        match self {
            RequestAccount::Pending(x) => x,
            RequestAccount::Fulfilled(_) => {
                panic!("called `Request::unwrap_pending()` on a `Fulfilled` request")
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
    pub fn unwrap_fulfilled(self) -> FulfilledRequest {
        match self {
            RequestAccount::Fulfilled(x) => x,
            RequestAccount::Pending(_) => {
                panic!("called `Request::unwrap_fulfilled()` on a `Pending` request")
            }
        }
    }
}

#[account]
#[derive(Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct RandomnessV2 {
    pub request: RequestAccount,
}

impl RandomnessV2 {
    pub const FULFILLED_SIZE: usize = RequestAccount::FULFILLED_SIZE;
    pub const PENDING_SIZE: usize = RequestAccount::PENDING_SIZE;

    /// See [`Request::fulfilled`].
    #[inline(always)]
    pub const fn fulfilled(&self) -> Option<&FulfilledRequest> {
        self.request.fulfilled()
    }

    /// See [`Request::fulfilled_mut`].
    #[inline(always)]
    pub fn fulfilled_mut(&mut self) -> Option<&mut FulfilledRequest> {
        self.request.fulfilled_mut()
    }

    /// See [`Request::pending`].
    #[inline(always)]
    pub fn pending(&self) -> Option<&PendingRequest> {
        self.request.pending()
    }

    /// See [`Request::pending_mut`].
    #[inline(always)]
    pub fn pending_mut(&mut self) -> Option<&mut PendingRequest> {
        self.request.pending_mut()
    }

    /// See [`Request::seed`].
    #[inline(always)]
    pub const fn seed(&self) -> &[u8; 32] {
        self.request.seed()
    }

    /// See [`Request::client`].
    #[inline(always)]
    pub const fn client(&self) -> &Pubkey {
        self.request.client()
    }

    /// See [`Request::unwrap_pending`].
    #[inline(always)]
    pub fn unwrap_pending(self) -> PendingRequest {
        self.request.unwrap_pending()
    }

    /// See [`Request::unwrap_fulfilled`].
    #[inline(always)]
    pub fn unwrap_fulfilled(self) -> FulfilledRequest {
        self.request.unwrap_fulfilled()
    }
}
