use anchor_lang::prelude::*;

use super::super::{
    error::ErrorCode,
    state::client::{Callback, Client},
    CB_CLIENT_ACCOUNT_SEED,
};

mod handler;
pub use handler::handler as set_callback_handler;

/// [`SetCallback`] instruction parameters.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[non_exhaustive]
pub struct SetCallbackParams {
    /// New value for the client callback (see [`Client::callback`]).
    pub new_callback: Option<Callback>,
}

impl SetCallbackParams {
    /// Creates new params.
    pub fn new(new_callback: Option<Callback>) -> Self {
        Self { new_callback }
    }
}

/// This instruction updates the client-level callback.
///
/// ### Parameters:
///
/// 1.  `params` — see [`SetCallbackParams`].
///
/// ### Accounts:
///
/// See docs on individual fields.
#[derive(Accounts)]
#[instruction(params: SetCallbackParams)]
pub struct SetCallback<'info> {
    /// This must be the client owner.
    #[account(mut, constraint = payer.key() == client.owner @ ErrorCode::NotAuthorized)]
    pub payer: Signer<'info>,
    /// A client PDA.
    #[account(
        mut,
        seeds = [CB_CLIENT_ACCOUNT_SEED, client.program.as_ref(), client.state.as_ref()],
        bump = client.bump,
        realloc = 8 + Client::STATIC_SIZE + params.new_callback.as_ref().map(|x| x.valid_size()).unwrap_or_default(),
        realloc::payer = payer,
        realloc::zero = false,
    )]
    pub client: Account<'info, Client>,
    pub system_program: Program<'info, System>,
}

impl SetCallback<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &SetCallbackParams) -> Result<()> {
        Ok(())
    }
}
