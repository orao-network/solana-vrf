use anchor_lang::prelude::*;

use super::super::{
    error::ErrorCode,
    state::{client::Client, network_state::NetworkState, request_alt::RequestAltAccount},
    CB_CLIENT_ACCOUNT_SEED, CB_CONFIG_ACCOUNT_SEED, CB_REQUEST_ALT_ACCOUNT_SEED,
};

mod handler;
pub use handler::handler as fulfill_alt_handler;

#[derive(Default, Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[non_exhaustive]
pub struct FulfillAltParams {}

impl FulfillAltParams {
    pub fn new() -> Self {
        Self::default()
    }
}

/// Fulfills a request.
#[derive(Accounts)]
#[instruction(params: FulfillAltParams)]
pub struct FulfillAlt<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: It is asserted via constraint that program matches the registered client program.
    #[account(constraint = program.key() == client.program @ ErrorCode::UnexpectedClientProgram)]
    pub program: AccountInfo<'info>,
    /// CHECK: It is asserted via constraint that state matches the registered client state.
    #[account(mut, constraint = state.key() == client.state @ ErrorCode::UnexpectedClientState)]
    pub state: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [CB_CLIENT_ACCOUNT_SEED, program.key().as_ref(), state.key().as_ref()],
        bump = client.bump,
    )]
    pub client: Account<'info, Client>,
    #[account(
        mut,
        seeds = [CB_REQUEST_ALT_ACCOUNT_SEED, client.key().as_ref(), &request.seed],
        bump = request.bump,
    )]
    pub request: Account<'info, RequestAltAccount>,
    #[account(
        seeds = [CB_CONFIG_ACCOUNT_SEED],
        bump = network_state.bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    /// Instructions sysvar account.
    ///
    /// CHECK:
    pub instruction_acc: AccountInfo<'info>,
    // Requests goes as remaining accounts.
}

impl FulfillAlt<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &FulfillAltParams) -> Result<()> {
        Ok(())
    }
}
