use anchor_lang::prelude::*;

mod handler;
pub use handler::handler as register_handler;

use super::super::{
    error::ErrorCode,
    state::{
        client::{Callback, Client},
        network_state::NetworkState,
    },
    CB_CLIENT_ACCOUNT_SEED, CB_CONFIG_ACCOUNT_SEED,
};

fn parse_program_state(account: &AccountInfo<'_>) -> Option<UpgradeableLoaderState> {
    let account_data = account.data.try_borrow().ok()?;
    UpgradeableLoaderState::try_deserialize(&mut &**account_data).ok()
}

fn program_data_address_matches(
    program_account: &AccountInfo<'_>,
    expected_program_data_address: Pubkey,
) -> bool {
    match parse_program_state(program_account) {
        Some(UpgradeableLoaderState::Program {
            programdata_address,
        }) => programdata_address == expected_program_data_address,
        _ => false,
    }
}

/// [`Register`] instruction parameters.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(feature = "sdk", derive(Debug))]
#[non_exhaustive]
pub struct RegisterParams {
    /// Seeds used to generate the [`Register::state`] PDA.
    ///
    /// Note that the last seed must be the PDA bump (see [`Pubkey::create_program_address`]).
    pub state_seeds: Vec<Vec<u8>>,
    /// An optional client-level callback (see [`Client::callback`]).
    pub callback: Option<Callback>,
}

impl RegisterParams {
    /// Creates new params with empty callback.
    pub fn new(state_seeds: Vec<Vec<u8>>) -> Self {
        Self {
            state_seeds,
            callback: None,
        }
    }

    /// Sets the callback.
    pub fn with_callback(mut self, callback: Option<Callback>) -> Self {
        self.callback = callback;
        self
    }
}

/// This instruction registers a client program.
///
/// Note that there might exist multiple registrations for the same program
/// as long as unique state accounts are used.
///
/// New client PDA will be created for every registration — its balance will be
/// used to pay request rent and fees.
///
/// ### Parameters:
///
/// 1.  `params` — see [`RegisterParams`].
///
/// ### Accounts:
///
/// See docs on individual fields.
#[derive(Accounts)]
#[instruction(params: RegisterParams)]
pub struct Register<'info> {
    /// This must be the upgrade authority of the client program being registered.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The client program being registered.
    ///
    /// CHECK: It is asserted via the anchor constraint that this program is not an arbitrary
    /// program but the one owned by the payer.
    #[account(
        constraint = program_data_address_matches(&program, program_data.key()) @ ErrorCode::UnexpectedClientProgramData,
        executable,
    )]
    pub program: AccountInfo<'info>,
    /// The program data account of the program being registered.
    #[account(constraint = program_data.upgrade_authority_address == Some(payer.key()) @ ErrorCode::WrongOwner)]
    pub program_data: Account<'info, ProgramData>,
    /// Opaque program's side client state (a PDA). This is the request authority.
    ///
    /// CHECK: Checked by [`Register::validate`].
    pub state: AccountInfo<'info>,
    /// Client PDA being created.
    #[account(
        init,
        payer = payer,
        space = 8 + Client::STATIC_SIZE + params.callback.as_ref().map(|x| x.valid_size()).unwrap_or_default(),
        seeds = [CB_CLIENT_ACCOUNT_SEED, program.key().as_ref(), state.key().as_ref()],
        bump,
    )]
    pub client: Account<'info, Client>,
    /// A PDA holding the oracle state and configuration.
    #[account(mut, seeds = [CB_CONFIG_ACCOUNT_SEED], bump = network_state.bump)]
    pub network_state: Account<'info, NetworkState>,
    pub system_program: Program<'info, System>,
}

impl Register<'_> {
    pub fn validate(&self, ctx: &Context<Self>, params: &RegisterParams) -> Result<()> {
        // validate that the state account belongs to the client program
        let state_seeds = params
            .state_seeds
            .iter()
            .map(|x| x.as_slice())
            .collect::<Vec<_>>();
        let expected_state = Pubkey::create_program_address(&state_seeds, ctx.accounts.program.key)
            .map_err(|_| ErrorCode::UnexpectedClientState)?;

        if expected_state != ctx.accounts.state.key() {
            return Err(ErrorCode::UnexpectedClientState.into());
        }

        Ok(())
    }
}
