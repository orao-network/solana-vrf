use anchor_lang::{prelude::Pubkey, AccountDeserialize, Discriminator};

pub use self::network_state::{NetworkConfiguration, NetworkState, OraoTokenFeeConfig};
pub use self::randomness::{Randomness, RandomnessResponse};
pub use self::randomness_v2::{FulfilledRequest, PendingRequest, RandomnessV2, Request};

pub mod network_state;
pub mod randomness;
pub mod randomness_v2;

/// Randomness account version.
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub enum RandomnessAccountVersion {
    /// Legacy
    V1,
    /// Since v0.4.0
    V2,
}

/// Data of a supported randomness account.
#[derive(Clone)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub enum RandomnessAccountData {
    V1(Randomness),
    V2(RandomnessV2),
}

impl RandomnessAccountData {
    /// Returns the request seed.
    pub const fn seed(&self) -> &[u8; 32] {
        match self {
            RandomnessAccountData::V1(x) => &x.seed,
            RandomnessAccountData::V2(x) => x.seed(),
        }
    }

    /// Returns the request client.
    ///
    /// Return `None` for V1 accounts.
    pub const fn client(&self) -> Option<&Pubkey> {
        match self {
            RandomnessAccountData::V1(_) => None,
            RandomnessAccountData::V2(x) => Some(x.client()),
        }
    }

    /// Returns randomness responses collected so far.
    ///
    /// Returns `None` for fulfilled V2 accounts.
    pub fn responses(&self) -> Option<&[RandomnessResponse]> {
        match self {
            RandomnessAccountData::V1(x) => Some(x.responses.as_slice()),
            RandomnessAccountData::V2(x) => x.pending().map(|x| x.responses.as_slice()),
        }
    }

    /// Returns the fulfilled randomness.
    ///
    /// Returns `None` if randomness is pending.
    pub const fn fulfilled_randomness(&self) -> Option<&[u8; 64]> {
        match self {
            Self::V1(x) => x.fulfilled(),
            Self::V2(x) => match x.fulfilled() {
                Some(x) => Some(&x.randomness),
                None => None,
            },
        }
    }

    /// Returns account data version.
    pub const fn version(&self) -> RandomnessAccountVersion {
        match self {
            Self::V1(_) => RandomnessAccountVersion::V1,
            Self::V2(_) => RandomnessAccountVersion::V2,
        }
    }
}

impl AccountDeserialize for RandomnessAccountData {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        let Some(discriminator) = buf.get(..8) else {
            return Err(anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into());
        };

        match discriminator.try_into().unwrap() {
            Randomness::DISCRIMINATOR => {
                Randomness::try_deserialize_unchecked(buf).map(RandomnessAccountData::V1)
            }
            RandomnessV2::DISCRIMINATOR => {
                RandomnessV2::try_deserialize_unchecked(buf).map(RandomnessAccountData::V2)
            }
            _ => Err(
                anchor_lang::error::Error::from(anchor_lang::error::AnchorError {
                    error_name: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.name(),
                    error_code_number: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                        .into(),
                    error_msg: anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
                        .to_string(),
                    error_origin: Some(anchor_lang::error::ErrorOrigin::Source(
                        anchor_lang::error::Source {
                            filename: "",
                            line: 0u32,
                        },
                    )),
                    compared_values: None,
                })
                .with_account_name("RandomnessAccountData"),
            ),
        }
    }
}
