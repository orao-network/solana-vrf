use anchor_lang::prelude::*;

#[derive(Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct NetworkConfiguration {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub request_fee: u64,
    pub fulfillment_authorities: Vec<Pubkey>,
    pub token_fee_config: Option<OraoTokenFeeConfig>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct OraoTokenFeeConfig {
    /// ORAO token mint address.
    pub mint: Pubkey,
    /// ORAO token treasury account.
    pub treasury: Pubkey,
    /// Fee in ORAO SPL token smallest units.
    pub fee: u64,
}

#[account]
#[derive(Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(Debug))]
pub struct NetworkState {
    pub config: NetworkConfiguration,
    /// Total number of received requests.
    pub num_received: u64,
}
