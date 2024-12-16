use anchor_lang::prelude::*;
use orao_solana_vrf_cb::{
    cpi,
    program::OraoVrfCb,
    state::{
        client::{Callback, Client, RemainingAccount},
        network_state::NetworkState,
    },
    RequestParams, CB_CLIENT_ACCOUNT_SEED, CB_CONFIG_ACCOUNT_SEED, CB_REQUEST_ACCOUNT_SEED,
};

use crate::{client_state::ClientState, ADDITIONAL_ACCOUNT_SEED, CLIENT_STATE_SEED};

/// How to override client-level callback with request-level callback.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct HowToOverride {
    /// This value will be given as a request-level callback parameter.
    pub parameter: u8,
    /// Whether to send the additional account to the callback call.
    pub send_additional_account: bool,
}

/// Randomness requests are performed by the registered program.
///
/// * seed — this parameter will be forwarded to the `request` CPI.
/// * override_callback — this parameter will override the client-level
///   callback if given.
#[derive(Accounts)]
#[instruction(seed: [u8; 32], override_callback: Option<HowToOverride>)]
pub struct Request<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// VRF program to perform the `request` CPI.
    pub vrf: Program<'info, OraoVrfCb>,
    /// State of a registered client.
    #[account(mut, seeds = [CLIENT_STATE_SEED], bump = client_state.bump)]
    pub client_state: Account<'info, ClientState>,
    /// Registered client PDA.
    #[account(
        mut,
        seeds = [CB_CLIENT_ACCOUNT_SEED, crate::id().as_ref(), client_state.key().as_ref()],
        seeds::program = orao_solana_vrf_cb::id(),
        bump = client.bump,
    )]
    pub client: Account<'info, Client>,
    /// VRF state account.
    #[account(
        mut,
        seeds = [CB_CONFIG_ACCOUNT_SEED],
        seeds::program = orao_solana_vrf_cb::id(),
        bump = network_state.bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    /// VRF Treasury account.
    ///
    /// CHECK: Asserted by the CPI
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// The request account.
    ///
    /// CHECK: Asserted by the CPI
    #[account(
        mut,
        seeds = [CB_REQUEST_ACCOUNT_SEED, client.key().as_ref(), &seed],
        seeds::program = orao_solana_vrf_cb::id(),
        bump,
    )]
    pub request: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Request>,
    seed: [u8; 32],
    override_callback: Option<HowToOverride>,
) -> Result<()> {
    // Setup the CPI accounts
    let cpi_program = ctx.accounts.vrf.to_account_info();
    let mut cpi_accounts = cpi::accounts::Request {
        payer: ctx.accounts.payer.to_account_info(),
        state: ctx.accounts.client_state.to_account_info(),
        client: ctx.accounts.client.to_account_info(),
        network_state: ctx.accounts.network_state.to_account_info(),
        treasury: ctx.accounts.treasury.to_account_info(),
        request: ctx.accounts.request.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    // CPI call must be signed by the registered client state.
    let signers_seeds: &[&[&[u8]]] = &[&[CLIENT_STATE_SEED, &[ctx.accounts.client_state.bump]]];
    cpi_accounts.state.is_signer = true;

    // Let's check if we are asked to override the client-level callback.
    let callback = override_callback.map(|how| {
        let callback = Callback::from_instruction_data(&crate::instruction::RequestLevelCallback {
            test_parameter: how.parameter,
        });

        // Send additional account if we asked to.
        if how.send_additional_account {
            let (address, bump) =
                Pubkey::find_program_address(&[ADDITIONAL_ACCOUNT_SEED], &crate::id());
            // We need to give seeds to verify account ownership.
            callback.with_remaining_account(RemainingAccount::writable(
                address,
                vec![ADDITIONAL_ACCOUNT_SEED.to_vec(), vec![bump]],
            ))
        } else {
            // No additional account was requested, but our example uses Anchor's
            // "optional positional accounts" feature so we must follow the convention
            // and give the program ID in place of an optional account so it could
            // be ignored by the Anchor (see coral-xyz/anchor#2101)
            callback.with_remaining_account(RemainingAccount::readonly(crate::id()))
        }
    });

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts).with_signer(signers_seeds);
    cpi::request(cpi_ctx, RequestParams::new(seed).with_callback(callback))?;

    Ok(())
}
