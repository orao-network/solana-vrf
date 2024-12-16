use anchor_lang::prelude::*;

use super::super::{error::ErrorCode, state::client::Client, CB_CLIENT_ACCOUNT_SEED};

mod handler;
pub use handler::handler as transfer_handler;

/// [`Transfer`] instruction parameters.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[non_exhaustive]
pub struct TransferParams {
    /// An address of a new client owner.
    ///
    /// Fill with caution.
    pub new_owner: Pubkey,
}

impl TransferParams {
    /// Creates new params.
    pub fn new(new_owner: Pubkey) -> Self {
        Self { new_owner }
    }
}

/// This instruction changes the owner of the client.
///
/// ### Parameters:
///
/// 1.  `params` — see [`TransferParams`].
///
/// ### Accounts:
///
/// See docs on individual fields.
#[derive(Accounts)]
#[instruction(params: TransferParams)]
pub struct Transfer<'info> {
    /// This must be the client owner.
    #[account(mut, constraint = payer.key() == client.owner @ ErrorCode::NotAuthorized)]
    pub payer: Signer<'info>,
    /// A client PDA.
    #[account(
        mut,
        seeds = [CB_CLIENT_ACCOUNT_SEED, client.program.as_ref(), client.state.as_ref()],
        bump = client.bump,
    )]
    pub client: Account<'info, Client>,
}

impl Transfer<'_> {
    pub fn validate(&self, _ctx: &Context<Self>, _params: &TransferParams) -> Result<()> {
        Ok(())
    }
}
