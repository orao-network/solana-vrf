use anchor_lang::prelude::*;
use orao_solana_vrf_cb::{
    state::{client::Client, network_state::NetworkState, request::RequestAccount},
    CB_CLIENT_ACCOUNT_SEED, CB_CONFIG_ACCOUNT_SEED, CB_REQUEST_ACCOUNT_SEED,
};

use crate::{client_state::ClientState, CLIENT_STATE_SEED};

#[derive(Accounts)]
#[instruction(test_parameter: u8)]
pub struct ClientLevelCallback<'info> {
    /// The first account is always the Client PDA (signer).
    ///
    /// This must be thoroughly verified to avoid unauthorized calls.
    #[account(
        signer,
        seeds = [CB_CLIENT_ACCOUNT_SEED, crate::id().as_ref(), client.state.as_ref()],
        bump = client.bump,
        seeds::program = orao_solana_vrf_cb::id(),
        has_one = state,
    )]
    pub client: Account<'info, Client>,

    /// The second account is always the state PDA (mutable).
    ///
    /// In our case it is a `ClientState`.
    #[account(mut, seeds = [CLIENT_STATE_SEED], bump = state.bump)]
    pub state: Account<'info, ClientState>,

    /// The third account is always the NetworkState PDA.
    #[account(
        seeds = [CB_CONFIG_ACCOUNT_SEED],
        bump = network_state.bump,
        seeds::program = orao_solana_vrf_cb::id(),
    )]
    pub network_state: Account<'info, NetworkState>,

    /// The fourth account is always the corresponding request account.
    #[account(
        seeds = [CB_REQUEST_ACCOUNT_SEED, client.key().as_ref(), request.seed()],
        bump = request.bump,
        seeds::program = orao_solana_vrf_cb::id(),
    )]
    pub request: Account<'info, RequestAccount>,
}

/// The handler will update corresponding client_level state variables.
pub fn clc_handler(ctx: Context<ClientLevelCallback>, test_parameter: u8) -> Result<()> {
    ctx.accounts.state.client_level_callback_param = test_parameter;
    ctx.accounts.state.client_level_callback_randomness = ctx
        .accounts
        .request
        .fulfilled()
        .expect("must be fulfilled")
        .randomness;

    Ok(())
}