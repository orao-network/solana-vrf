use anchor_lang::prelude::*;

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct OraoTokenFeeConfig {
    /// ORAO token mint address.
    pub mint: Pubkey,
    /// ORAO token treasury account.
    pub treasury: Pubkey,
    /// Fee in ORAO SPL token smallest units.
    pub fee: u64,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct NetworkConfiguration {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub request_fee: u64,
    pub fulfillment_authorities: Vec<Pubkey>,
    pub token_fee_config: Option<OraoTokenFeeConfig>,
}

#[account]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct NetworkState {
    pub config: NetworkConfiguration,
    /// Total number of received requests.
    pub num_received: u64,
}

#[account]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct Randomness {
    pub seed: [u8; 32],
    pub randomness: [u8; 64],
    pub responses: Vec<RandomnessResponse>,
}

impl Randomness {
    /// Returns fulfilled randomness.
    ///
    /// Returns `None` if randomness is not yet fulfilled.
    pub fn fulfilled(&self) -> Option<&[u8; 64]> {
        if self.randomness != [0_u8; 64] {
            Some(&self.randomness)
        } else {
            None
        }
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct RandomnessResponse {
    pub pubkey: Pubkey,
    pub randomness: [u8; 64],
}
