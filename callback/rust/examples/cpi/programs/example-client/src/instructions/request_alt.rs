use anchor_lang::prelude::*;
use orao_solana_vrf_cb::{
    cpi,
    program::OraoVrfCb,
    state::{
        client::{CallbackAlt, Client, RemainingAccount},
        network_state::NetworkState,
    },
    utils::parse_lookup_tables,
    RequestAltParams, CB_CLIENT_ACCOUNT_SEED, CB_CONFIG_ACCOUNT_SEED, CB_REQUEST_ALT_ACCOUNT_SEED,
};

use crate::{client_state::ClientState, ADDITIONAL_ACCOUNT_SEED, CLIENT_STATE_SEED};

/// How to override client-level callback with request-level callback.
#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize)]
pub struct HowToOverrideAlt {
    /// This value will be given as a request-level callback parameter.
    pub parameter: u8,
    /// Whether to send the additional account to the callback call.
    pub send_additional_account: bool,
    /// How many lookup tables are given to the instruction.
    ///
    /// This instruction will follow the VRF's account order convention
    /// (see the "Account Order Convention" section in [`orao_solana_vrf_cb`]
    /// crate-level documentation).
    ///
    /// This was added for illustration purposes but in fact will always equals `1`.
    pub num_lookup_tables: u8,
}

/// This is basically the same as [`super::Request`] instruction, but the request
/// is performed via VRF's `RequestAlt` instruction to illustrate the Address
/// Lookup Table support.
///
/// * seed — this parameter will be forwarded to the `request` CPI.
/// * override_callback — this parameter will override the client-level
///   callback if given. Note that the actual instance of the [`CallbackAlt`]
///   structure will be created by the instruction.
#[derive(Accounts)]
#[instruction(seed: [u8; 32], override_callback: Option<HowToOverrideAlt>)]
pub struct RequestAlt<'info> {
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
        seeds = [CB_REQUEST_ALT_ACCOUNT_SEED, client.key().as_ref(), &seed],
        seeds::program = orao_solana_vrf_cb::id(),
        bump,
    )]
    pub request: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler_alt<'info>(
    ctx: Context<'_, '_, '_, 'info, RequestAlt<'info>>,
    seed: [u8; 32],
    override_callback: Option<HowToOverrideAlt>,
) -> Result<()> {
    // Setup the CPI accounts
    let cpi_program = ctx.accounts.vrf.to_account_info();
    let mut cpi_accounts = cpi::accounts::RequestAlt {
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

    let num_lookup_tables = override_callback
        .map(|x| x.num_lookup_tables)
        .unwrap_or_default();
    let cpi_call_remaining_accounts = ctx
        .remaining_accounts
        .get(..num_lookup_tables as usize)
        .expect("call does not follow the convention")
        .to_vec();

    // Let's check if we are asked to override the client-level callback.
    let callback = override_callback
        .map(|how| {
            let callback =
                CallbackAlt::from_instruction_data(&crate::instruction::RequestLevelCallbackAlt {
                    test_parameter: how.parameter,
                });

            // Illustrate the usage of Address Lookup Tables
            let lookup_tables =
                parse_lookup_tables(&ctx.remaining_accounts[..num_lookup_tables as usize])?;

            // Send additional account if we asked to.
            if how.send_additional_account {
                let (address, bump) =
                    Pubkey::find_program_address(&[ADDITIONAL_ACCOUNT_SEED], &crate::id());
                msg!("Address: {:?} from {}", address, crate::id());
                // We'll authorize this writable account as Writable PDA, so giving seeds here.
                let seeds = vec![ADDITIONAL_ACCOUNT_SEED.to_vec(), vec![bump]];
                Result::Ok(callback.compile_accounts(
                    vec![RemainingAccount::writable(address, seeds)],
                    &lookup_tables,
                ))
            } else {
                // No additional account was requested, but our example uses Anchor's
                // "optional positional accounts" feature so we must follow the convention
                // and give the program ID in place of an optional account so it could
                // be ignored by the Anchor (see coral-xyz/anchor#2101)
                Result::Ok(callback.compile_accounts(
                    vec![RemainingAccount::readonly(crate::id())],
                    &lookup_tables,
                ))
            }
        })
        .transpose()?;

    msg!(
        "Compiled: {:?}",
        callback
            .as_ref()
            .map(|x| x.accounts_hash().as_ref())
            .unwrap_or_default()
    );

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts)
        .with_signer(signers_seeds)
        // this is given to follow the convention (see [`HowToOverrideAlt::num_lookup_tables`])
        .with_remaining_accounts(cpi_call_remaining_accounts);
    cpi::request_alt(
        cpi_ctx,
        RequestAltParams::new(seed)
            .with_callback(callback)
            .with_num_lookup_tables(num_lookup_tables),
    )?;

    Ok(())
}
