use anchor_lang::prelude::*;

mod handler;
pub use handler::handler as request_handler;

use super::super::{
    error::ErrorCode,
    state::{
        client::{Callback, Client},
        network_state::NetworkState,
    },
    CB_CLIENT_ACCOUNT_SEED, CB_CONFIG_ACCOUNT_SEED, CB_REQUEST_ACCOUNT_SEED,
};

/// [`Request`] instruction parameters.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[non_exhaustive]
pub struct RequestParams {
    /// A random seed necessary to verify the generated randomness.
    pub seed: [u8; 32],
    /// An optional request-level callback.
    ///
    /// This overrides the client-level callback (see [`Client::callback`]).
    pub callback: Option<Callback>,
}

impl RequestParams {
    /// Creates new params with the given seed.
    pub fn new(seed: [u8; 32]) -> Self {
        Self {
            seed,
            callback: None,
        }
    }

    /// Overwrites the callback field.
    pub fn with_callback(mut self, callback: Option<Callback>) -> Self {
        self.callback = callback;
        self
    }
}

/// This instruction creates a randomness request for the given client (invoked via CPI).
///
/// ### Parameters:
///
/// 1.  `params` — see [`RequestParams`].
///
/// ### Accounts:
///
/// See docs on individual fields.
#[derive(Accounts)]
#[instruction(params: RequestParams)]
pub struct Request<'info> {
    /// Whoever sent the transaction to the network.
    ///
    /// This account will only pay tx fess and will not pay rent nor request fee.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// Client request authority PDA (see [`Client::state`]).
    ///
    /// This account signs the CPI call.
    #[account(constraint = client.state == state.key() @ ErrorCode::NotAuthorized)]
    pub state: Signer<'info>,
    /// A client PDA.
    ///
    /// It will pay request rent and fee.
    #[account(
        mut,
        seeds = [CB_CLIENT_ACCOUNT_SEED, client.program.key().as_ref(), state.key().as_ref()],
        bump = client.bump,
    )]
    pub client: Account<'info, Client>,
    /// A PDA holding the oracle state and configuration.
    #[account(mut, seeds = [CB_CONFIG_ACCOUNT_SEED], bump = network_state.bump)]
    pub network_state: Account<'info, NetworkState>,
    /// A treasury address matching the current `network_state`.
    ///
    /// CHECK: proper address is asserted via the anchor constraint.
    #[account(
        mut,
        constraint = network_state.config.treasury == treasury.key() @ ErrorCode::WrongTreasury,
    )]
    pub treasury: AccountInfo<'info>,
    /// Request PDA being created.
    ///
    /// CHECK: It is initialized within the instruction.
    #[account(
        mut,
        seeds = [CB_REQUEST_ACCOUNT_SEED, client.key().as_ref(), &params.seed],
        bump,
    )]
    pub request: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl Request<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &RequestParams) -> Result<()> {
        Ok(())
    }
}
