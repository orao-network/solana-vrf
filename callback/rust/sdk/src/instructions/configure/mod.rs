use anchor_lang::prelude::*;

mod handler;
pub use handler::handler as configure_handler;

use super::super::{
    error::ErrorCode,
    state::network_state::{NetworkConfiguration, NetworkState},
    CB_CONFIG_ACCOUNT_SEED,
};

/// [`Configure`] instruction parameters.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[non_exhaustive]
pub struct ConfigureParams {
    /// New configuration.
    pub new_config: NetworkConfiguration,
}

impl ConfigureParams {
    pub fn new(new_config: NetworkConfiguration) -> Self {
        Self { new_config }
    }
}

#[derive(Accounts)]
#[instruction(params: ConfigureParams)]
pub struct Configure<'info> {
    /// This must be the current configuration authority.
    #[account(
        mut,
        constraint = payer.key() == network_state.config.authority @ ErrorCode::NotAuthorized
    )]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [CB_CONFIG_ACCOUNT_SEED],
        bump = network_state.bump,
        realloc = 8 + NetworkState::new(network_state.bump, params.new_config.clone()).size(),
        realloc::payer = payer,
        realloc::zero = false,
    )]
    pub network_state: Account<'info, NetworkState>,
    pub system_program: Program<'info, System>,
}

impl Configure<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &ConfigureParams) -> Result<()> {
        Ok(())
    }
}
