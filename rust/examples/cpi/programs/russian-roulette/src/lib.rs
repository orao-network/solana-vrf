mod misc;
pub mod state;

#[cfg(feature = "sdk")]
use std::{ops::Deref, sync::Arc};

#[cfg(feature = "sdk")]
use anchor_client::ThreadSafeSigner;

use anchor_lang::prelude::*;
use orao_solana_vrf::program::OraoVrf;
use orao_solana_vrf::state::NetworkState;
use orao_solana_vrf::CONFIG_ACCOUNT_SEED;
use orao_solana_vrf::RANDOMNESS_ACCOUNT_SEED;
use state::PlayerState;

declare_id!("DTHCPBTw6tFZDwbiSzKXXK8wQ7n7v5zJAH3Ex3uvoSK5");

pub const PLAYER_STATE_ACCOUNT_SEED: &[u8] = b"russian-roulette-player-state";

pub fn player_state_account_address(player: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[PLAYER_STATE_ACCOUNT_SEED, player.as_ref()],
        &crate::id(),
    )
    .0
}

#[program]
pub mod russian_roulette {
    use orao_solana_vrf::cpi::accounts::RequestV2;

    use super::*;

    pub fn spin_and_pull_the_trigger(
        ctx: Context<SpinAndPullTheTrigger>,
        force: [u8; 32],
    ) -> Result<()> {
        // Zero seed is illegal in VRF
        if force == [0_u8; 32] {
            return Err(Error::YouMustSpinTheCylinder.into());
        }

        let player_state = &mut ctx.accounts.player_state;

        // initialize
        if player_state.rounds == 0 {
            **player_state = PlayerState::new(*ctx.accounts.player.as_ref().key);
        }

        // Assert that the player is able to play.
        player_state.assert_can_play(ctx.accounts.prev_round.as_ref())?;

        // Request randomness.
        let cpi_program = ctx.accounts.vrf.to_account_info();
        let cpi_accounts = RequestV2 {
            payer: ctx.accounts.player.to_account_info(),
            network_state: ctx.accounts.config.to_account_info(),
            treasury: ctx.accounts.treasury.to_account_info(),
            request: ctx.accounts.random.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        orao_solana_vrf::cpi::request_v2(cpi_ctx, force)?;

        player_state.rounds += 1;
        player_state.force = force;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(force: [u8; 32])]
pub struct SpinAndPullTheTrigger<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerState::SIZE,
        seeds = [
            PLAYER_STATE_ACCOUNT_SEED,
            player.key().as_ref()
        ],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    /// CHECK:
    #[account(
        seeds = [RANDOMNESS_ACCOUNT_SEED, player_state.force.as_ref()],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub prev_round: AccountInfo<'info>,
    /// CHECK:
    #[account(
        mut,
        seeds = [RANDOMNESS_ACCOUNT_SEED, &force],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub random: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub config: Account<'info, NetworkState>,
    pub vrf: Program<'info, OraoVrf>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum Error {
    #[msg("The player is already dead")]
    PlayerDead,
    #[msg("Unable to serialize a randomness request")]
    RandomnessRequestSerializationError,
    #[msg("Player must spin the cylinder")]
    YouMustSpinTheCylinder,
    #[msg("The cylinder is still spinning")]
    TheCylinderIsStillSpinning,
}

/// Helper that builds the instruction.
#[cfg(feature = "sdk")]
pub async fn spin_and_pull_the_trigger<
    'a,
    C: Deref<Target = impl anchor_client::solana_sdk::signer::Signer> + Clone,
>(
    roulette: &'a anchor_client::Program<C>,
    vrf: &anchor_client::Program<C>,
) -> std::result::Result<anchor_client::RequestBuilder<'a, C, Arc<dyn ThreadSafeSigner>>, anchor_client::ClientError> {
    let seed = rand::random();

    // roulette accounts
    let player_state_address = player_state_account_address(&roulette.payer());

    let player_state: PlayerState = match roulette.account(player_state_address).await {
        Ok(x) => x,
        Err(anchor_client::ClientError::AccountNotFound) => PlayerState::new(roulette.payer()),
        Err(err) => return Err(err),
    };

    // vrf accounts
    let network_state_address =
        orao_solana_vrf::network_state_account_address(&orao_solana_vrf::ID);
    let prev_request_address =
        orao_solana_vrf::randomness_account_address(&orao_solana_vrf::ID, &player_state.force);
    let request_address = orao_solana_vrf::randomness_account_address(&orao_solana_vrf::ID, &seed);

    let vrf_config = vrf
        .account::<NetworkState>(network_state_address)
        .await?
        .config;

    Ok(roulette
        .request()
        .accounts(crate::accounts::SpinAndPullTheTrigger {
            player: roulette.payer(),
            player_state: player_state_address,
            treasury: vrf_config.treasury,
            prev_round: prev_request_address,
            random: request_address,
            config: network_state_address,
            vrf: orao_solana_vrf::id(),
            system_program: anchor_client::solana_sdk::system_program::ID,
        })
        .args(crate::instruction::SpinAndPullTheTrigger { force: seed }))
}
