use anchor_lang::prelude::*;

use crate::{
    additional_account::AdditionalAccount, client_state::ClientState, ADDITIONAL_ACCOUNT_SEED,
    CLIENT_STATE_SEED,
};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Client state PDA used to register this VRF client.
    ///
    /// This example program will register once, but note that
    /// you can register multiple clients for the same program as long
    /// as different state PDAs are used for every registration.
    #[account(
        init,
        payer = payer,
        space = 8 + ClientState::SIZE,
        seeds = [CLIENT_STATE_SEED],
        bump,
    )]
    pub client_state: Account<'info, ClientState>,

    /// We will also initialize an additional account that is used to illustrate
    /// sending additional accounts to a callback call.
    #[account(
        init,
        payer = payer,
        space = 8 + AdditionalAccount::SIZE,
        seeds = [ADDITIONAL_ACCOUNT_SEED],
        bump,
    )]
    pub additional_account: Account<'info, AdditionalAccount>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_handler(ctx: Context<Initialize>) -> Result<()> {
    ctx.accounts.client_state.set_inner(ClientState {
        bump: ctx.bumps.client_state,
        client_level_callback_randomness: [0_u8; 64],
        client_level_callback_param: 0,
        request_level_callback_randomness: [0_u8; 64],
        request_level_callback_param: 0,
    });

    ctx.accounts
        .additional_account
        .set_inner(AdditionalAccount {
            bump: ctx.bumps.additional_account,
            randomness: [0_u8; 64],
            param: 0,
        });

    Ok(())
}
