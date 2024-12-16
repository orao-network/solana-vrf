use anchor_lang::prelude::*;

use super::super::{error::ErrorCode, state::client::Client, CB_CLIENT_ACCOUNT_SEED};

mod handler;
pub use handler::handler as withdraw_handler;

/// [`Withdraw`] instruction parameters.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[non_exhaustive]
pub struct WithdrawParams {
    /// An amount to withdraw (in lamports).
    ///
    /// Note that you can't withdraw past the client PDA rent.
    pub amount: u64,
}

impl WithdrawParams {
    /// Creates new params.
    pub fn new(amount: u64) -> Self {
        Self { amount }
    }
}

/// This instruction withdraws funds from the client PDA.
///
/// ### Parameters:
///
/// 1.  `params` — see [`WithdrawParams`].
///
/// ### Accounts:
///
/// See docs on individual fields.
#[derive(Accounts)]
#[instruction(params: WithdrawParams)]
pub struct Withdraw<'info> {
    /// This must be the client owner.
    ///
    /// The withdrawn amount will go to the payer.
    #[account(mut, constraint = payer.key() == client.owner @ ErrorCode::NotAuthorized)]
    pub payer: Signer<'info>,
    /// A client PDA to withdraw from.
    #[account(
        mut,
        seeds = [CB_CLIENT_ACCOUNT_SEED, client.program.as_ref(), client.state.as_ref()],
        bump = client.bump,
    )]
    pub client: Account<'info, Client>,
}

impl Withdraw<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &WithdrawParams) -> Result<()> {
        Ok(())
    }
}
