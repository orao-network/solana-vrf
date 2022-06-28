use super::instructions::{Rand, Seed};
use crate::error::Error as VrfError;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{program_pack::IsInitialized, pubkey::Pubkey};

/// Represents the on chain state of a requested randomness
///
#[derive(Debug, PartialEq, Eq)]
pub struct Randomness {
    pub status: RandomnessStatus,
    // Seed used to generate randomness
    pub seed: Vec<u8>,
    /// The random data
    pub randomness: Option<Vec<u8>>,
    pub pubkey: Option<Pubkey>,
}

impl From<RandomnessAccount> for Randomness {
    fn from(other: RandomnessAccount) -> Self {
        match other {
            RandomnessAccount::RandomnessRequested { seed } => Self {
                status: RandomnessStatus::Pending,
                seed: seed.to_vec(),
                randomness: None,
                pubkey: None,
            },
            RandomnessAccount::RandomnessFullfilled {
                seed,
                randomness,
                pubkey,
            } => Self {
                status: RandomnessStatus::Fulfilled,
                seed: seed.to_vec(),
                randomness: Some(randomness.to_vec()),
                pubkey: Some(pubkey),
            },
        }
    }
}

impl Randomness {
    /// Create Randomness from Randomness Account
    pub fn decode_from_bytes(data: &Vec<u8>) -> Result<Self, VrfError> {
        let randomness_acc = RandomnessAccount::deserialize(&mut data.as_slice())
            .map_err(|err| VrfError::RandomnessDecodeError(err.to_string()))?;
        Ok(randomness_acc.into())
    }
}

/// Can be either Pending or Fulfilled status.
///
/// Can be in either status:
/// - *Pending*: Randomness is yet to be fulfilled.
/// - *Fulfilled*: Randomness is fulfilled and can be accessed via `Randomness.randomness` field
#[derive(Debug, PartialEq, Eq)]
pub enum RandomnessStatus {
    Pending,
    /// Randomness is generated and can be accessed in `randomness` field.
    Fulfilled,
}

// Smart contract data

/// On chain Randomness Account
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
pub enum RandomnessAccount {
    RandomnessRequested {
        seed: Seed,
    },
    RandomnessFullfilled {
        seed: Seed,
        randomness: Rand,
        pubkey: Pubkey,
    },
}

impl IsInitialized for RandomnessAccount {
    fn is_initialized(&self) -> bool {
        self != &RandomnessAccount::RandomnessRequested {
            seed: Default::default(),
        }
    }
}

/// On chain Network Configuration
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq)]
pub struct NetworkConfiguration {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub request_fee: u64,
    pub fulfillment_authorities: Vec<Pubkey>,
}

#[cfg(test)]
mod tests {
    use crate::NetworkConfiguration;

    use super::{Randomness, RandomnessStatus};
    use borsh::BorshDeserialize;
    use solana_sdk::pubkey::Pubkey;
    use std::str::FromStr;

    #[test]
    fn test_decode_randomness_requested() {
        // Test pending account data
        let pending_account_data: Vec<u8> = vec![
            0, 135, 46, 191, 247, 160, 171, 188, 173, 230, 92, 164, 239, 240, 30, 190, 183, 47,
            225, 167, 189, 209, 172, 216, 211, 199, 30, 28, 31, 230, 30, 153, 32, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0,
        ];
        let decoded = Randomness::decode_from_bytes(&pending_account_data);
        assert_eq!(decoded.is_ok(), true);
        assert_eq!(
            decoded.unwrap(),
            Randomness {
                status: RandomnessStatus::Pending,
                seed: vec![
                    135, 46, 191, 247, 160, 171, 188, 173, 230, 92, 164, 239, 240, 30, 190, 183,
                    47, 225, 167, 189, 209, 172, 216, 211, 199, 30, 28, 31, 230, 30, 153, 32
                ],
                randomness: None,
                pubkey: None,
            }
        );

        // Test Fulfilled account data
        let fulfilled_account_data: Vec<u8> = vec![
            1, // Tag
            82, 99, 234, 207, 194, 174, 160, 96, 249, 86, 121, 227, 2, 43, 106, 71, 152, 122, 216,
            157, 134, 225, 100, 232, 221, 136, 204, 242, 103, 94, 0, 70, // Seed
            142, 185, 77, 198, 169, 93, 209, 212, 123, 153, 4, 44, 87, 158, 237, 135, 13, 190, 136,
            250, 23, 163, 151, 96, 97, 20, 116, 1, 99, 25, 27, 34, 58, 11, 143, 138, 144, 35, 111,
            118, 117, 49, 128, 88, 145, 14, 141, 202, 6, 172, 51, 193, 199, 254, 172, 142, 189, 2,
            72, 2, 238, 115, 16, 12, // Public key
            22, 9, 56, 134, 48, 255, 91, 50, 91, 100, 234, 229, 1, 85, 222, 13, 136, 140, 147, 52,
            139, 118, 42, 145, 105, 28, 180, 197, 75, 12, 124, 228,
        ];
        let decoded = Randomness::decode_from_bytes(&fulfilled_account_data);
        assert_eq!(decoded.is_ok(), true);
        let pubkey = Pubkey::new(&[
            22, 9, 56, 134, 48, 255, 91, 50, 91, 100, 234, 229, 1, 85, 222, 13, 136, 140, 147, 52,
            139, 118, 42, 145, 105, 28, 180, 197, 75, 12, 124, 228,
        ]);
        assert_eq!(
            decoded.unwrap(),
            Randomness {
                status: RandomnessStatus::Fulfilled,
                seed: vec![
                    82, 99, 234, 207, 194, 174, 160, 96, 249, 86, 121, 227, 2, 43, 106, 71, 152,
                    122, 216, 157, 134, 225, 100, 232, 221, 136, 204, 242, 103, 94, 0, 70,
                ],
                randomness: Some(vec![
                    142, 185, 77, 198, 169, 93, 209, 212, 123, 153, 4, 44, 87, 158, 237, 135, 13,
                    190, 136, 250, 23, 163, 151, 96, 97, 20, 116, 1, 99, 25, 27, 34, 58, 11, 143,
                    138, 144, 35, 111, 118, 117, 49, 128, 88, 145, 14, 141, 202, 6, 172, 51, 193,
                    199, 254, 172, 142, 189, 2, 72, 2, 238, 115, 16, 12,
                ]),
                pubkey: Some(pubkey),
            }
        );
    }

    #[test]
    fn test_decode_contract_config() {
        let config_account_data = vec![
            22, 9, 56, 134, 48, 255, 91, 50, 91, 100, 234, 229, 1, 85, 222, 13, 136, 140, 147, 52,
            139, 118, 42, 145, 105, 28, 180, 197, 75, 12, 124, 228, 22, 9, 56, 134, 48, 255, 91,
            50, 91, 100, 234, 229, 1, 85, 222, 13, 136, 140, 147, 52, 139, 118, 42, 145, 105, 28,
            180, 197, 75, 12, 124, 228, 144, 95, 1, 0, 0, 0, 0, 0, 4, 0, 0, 0, 22, 9, 56, 134, 48,
            255, 91, 50, 91, 100, 234, 229, 1, 85, 222, 13, 136, 140, 147, 52, 139, 118, 42, 145,
            105, 28, 180, 197, 75, 12, 124, 228, 33, 108, 122, 228, 245, 115, 88, 125, 252, 138,
            110, 148, 54, 149, 13, 113, 107, 20, 225, 22, 75, 20, 174, 19, 33, 148, 150, 13, 197,
            97, 31, 209, 58, 48, 244, 227, 122, 102, 168, 2, 50, 152, 40, 91, 36, 19, 192, 101, 25,
            15, 178, 79, 196, 23, 220, 140, 245, 160, 174, 170, 232, 69, 198, 117, 74, 197, 11,
            164, 18, 129, 10, 24, 150, 187, 239, 156, 206, 196, 68, 27, 175, 168, 183, 201, 27,
            131, 11, 113, 222, 72, 99, 89, 218, 234, 153, 175, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ];

        let config = NetworkConfiguration::deserialize(&mut &*config_account_data).unwrap();
        assert_eq!(
            config.treasury,
            Pubkey::from_str("2V28D3jzn7XEuKSqVVzDyXB3YMg8mfWE9QVvvkNvxEWw").unwrap()
        );
    }
}
