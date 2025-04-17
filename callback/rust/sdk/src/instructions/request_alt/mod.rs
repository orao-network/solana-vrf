use anchor_lang::prelude::*;

mod handler;
pub use handler::handler as request_alt_handler;

use crate::state::client::CallbackAlt;

use super::super::{
    error::ErrorCode,
    state::{client::Client, network_state::NetworkState},
    CB_CLIENT_ACCOUNT_SEED, CB_CONFIG_ACCOUNT_SEED, CB_REQUEST_ALT_ACCOUNT_SEED,
};

/// [`RequestAlt`] instruction parameters.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[non_exhaustive]
pub struct RequestAltParams {
    /// A random seed necessary to verify the generated randomness.
    pub seed: [u8; 32],
    /// An optional request-level callback.
    ///
    /// Note that client-level callback won't get applied to this request.
    pub callback: Option<CallbackAlt>,
    /// Number of lookup tables expected in the list of remaining accounts
    /// of the [`RequestAlt`] instruction (see the "Account Order Convention"
    /// section in the main crate docs).
    pub num_lookup_tables: u8,
}

impl RequestAltParams {
    /// Creates new params with the given seed, no callback and no lookup tables.
    pub fn new(seed: [u8; 32]) -> Self {
        Self {
            seed,
            callback: None,
            num_lookup_tables: 0,
        }
    }

    /// Overwrites the [`RequestAltParams::callback`] field.
    pub fn with_callback(mut self, callback: Option<CallbackAlt>) -> Self {
        self.callback = callback;
        self
    }

    /// Overwrites the [`RequestAltParams::num_lookup_tables`] field.
    pub fn with_num_lookup_tables(mut self, num_lookup_tables: u8) -> Self {
        self.num_lookup_tables = num_lookup_tables;
        self
    }
}

/// This instruction creates a randomness request for the given client (invoked via CPI).
///
/// ### Parameters
///
/// 1.  `params` — see [`RequestAltParams`].
///
/// ### Accounts
///
/// Given `n` = `params.num_lookup_tables`:
///
/// * `1       . payer` - see docs on [`RequestAlt::payer`]
/// * `2       . state` - see docs on [`RequestAlt::state`]
/// * `3       . client` - see docs on [`RequestAlt::client`]
/// * `4       . network_state` - see docs on [`RequestAlt::network_state`]
/// * `5       . treasury` - see docs on [`RequestAlt::treasury`]
/// * `6       . request` - see docs on [`RequestAlt::request`]
/// * `7       . system_program` - see docs on [`RequestAlt::system_program`]
/// * `8 to 8+n. ALT accounts` - zero or more Address Lookup Tables accounts
/// * `9+n to _. writable accounts` - zero or more writable accounts to be authorized as "arbitrary writable"
#[derive(Accounts)]
#[instruction(params: RequestAltParams)]
pub struct RequestAlt<'info> {
    /// Whoever sent the transaction to the network.
    ///
    /// This account will only pay tx fees and will not pay rent nor request fee.
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
        seeds = [CB_REQUEST_ALT_ACCOUNT_SEED, client.key().as_ref(), &params.seed],
        bump,
    )]
    pub request: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl RequestAlt<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &RequestAltParams) -> Result<()> {
        Ok(())
    }
}
