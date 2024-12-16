use anchor_lang::prelude::*;

use super::super::{state::network_state::NetworkState, CB_CONFIG_ACCOUNT_SEED};

mod handler;
pub use handler::handler as initialize_handler;

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[non_exhaustive]
pub struct InitializeParams {
    /// Per-request fee in lamports.
    pub request_fee: u64,
}

impl InitializeParams {
    /// Creates new params.
    pub fn new(request_fee: u64) -> Self {
        Self { request_fee }
    }
}

/// This instruction initializes the VRF instance.
///
/// ### Parameters:
///
/// 1.  `params` — see [`InitializeParams`].
///
/// ### Accounts:
///
/// See docs on individual fields.
#[derive(Accounts)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[instruction(params: InitializeParams)]
pub struct Initialize<'info> {
    /// This account will be the configuration authority and the treasury address.
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + NetworkState::STATIC_SIZE,
        seeds = [CB_CONFIG_ACCOUNT_SEED],
        bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    pub system_program: Program<'info, System>,
}

impl Initialize<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &InitializeParams) -> Result<()> {
        Ok(())
    }
}
