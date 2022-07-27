use anchor_lang::prelude::*;
use state::{NetworkState, OraoTokenFeeConfig, Randomness};

pub use crate::error::Error;

pub mod error;
pub mod state;

mod sdk;
#[cfg(feature = "sdk")]
pub use crate::sdk::*;

declare_id!("VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y");

/// This is the seed used for creating request/fulfillment accounts.
pub const RANDOMNESS_ACCOUNT_SEED: &[u8] = b"orao-vrf-randomness-request";

/// This is the seed used for creating network-wide configuration PDA
/// account, that sets things like fulfillment authorities, costs, etc.
pub const CONFIG_ACCOUNT_SEED: &[u8] = b"orao-vrf-network-configuration";

// this is the number of public keys that are allowed to generate randomness
pub const MAX_FULFILLMENT_AUTHORITIES_COUNT: usize = 10;

/// Helper that XORes `r` into `l`.
pub fn xor_array<const N: usize>(l: &mut [u8; N], r: &[u8; N]) {
    for i in 0..N {
        l[i] ^= r[i];
    }
}

/// Helper that checks for Byzantine quorum.
pub fn quorum(count: usize, total: usize) -> bool {
    count >= (total * 2 / 3 + 1)
}

#[allow(unused_variables)]
#[program]
pub mod orao_vrf {
    use super::*;

    pub fn init_network(
        ctx: Context<InitNetwork>,
        fee: u64,
        config_authority: Pubkey,
        fulfillment_authorities: Vec<Pubkey>,
        token_fee_config: Option<OraoTokenFeeConfig>,
    ) -> Result<()> {
        Ok(())
    }

    pub fn update_network(
        ctx: Context<UpdateNetwork>,
        fee: u64,
        config_authority: Pubkey,
        fulfillment_authorities: Vec<Pubkey>,
        token_fee_config: Option<OraoTokenFeeConfig>,
    ) -> Result<()> {
        Ok(())
    }

    pub fn request<'info>(
        ctx: Context<'_, '_, '_, 'info, Request<'info>>,
        seed: [u8; 32],
    ) -> Result<()> {
        Ok(())
    }

    pub fn fulfill(ctx: Context<Fulfill>) -> Result<()> {
        Ok(())
    }
}

/// Initialize network configuration.
///
/// Remaining accounts (necessary if token fee config given):
/// * token mint account
/// * token treasury account
#[derive(Accounts)]
pub struct InitNetwork<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + 464,
        seeds = [CONFIG_ACCOUNT_SEED.as_ref()],
        bump,
    )]
    network_state: Account<'info, NetworkState>,
    /// CHECK:
    treasury: AccountInfo<'info>,
    system_program: Program<'info, System>,
}

/// Update network configuration.
///
/// Remaining accounts (necessary if token fee config given):
/// * token mint account
/// * token treasury account
#[derive(Accounts)]
pub struct UpdateNetwork<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED.as_ref()],
        bump,
        constraint = network_state.config.authority == authority.key(),
    )]
    network_state: Account<'info, NetworkState>,
    /// CHECK:
    treasury: AccountInfo<'info>,
}

/// Request randomness.
///
/// If token fee configuration exists and given treasury equals token treasury,
/// then remaining accounts are required:
/// * (writable) token payer account
/// * token program account (necessary to execute the transfer)
#[derive(Accounts)]
#[instruction(seed: [u8; 32])]
pub struct Request<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED.as_ref()],
        bump,
    )]
    network_state: Account<'info, NetworkState>,
    /// CHECK:
    #[account(
        mut,
        constraint = network_state.config.treasury == treasury.key() ||
        network_state.config.token_fee_config.as_ref().map(|x| x.treasury) == Some(treasury.key())
        @ Error::UnknownTreasuryGiven)]
    treasury: AccountInfo<'info>,
    #[account(
        init,
        payer = payer,
        space = 10240,
        seeds = [RANDOMNESS_ACCOUNT_SEED.as_ref(), &seed],
        bump,
    )]
    request: Account<'info, Randomness>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Fulfill<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    /// CHECK:
    instruction_acc: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED.as_ref()],
        bump,
    )]
    network_state: Account<'info, NetworkState>,
    #[account(
        mut,
        seeds = [RANDOMNESS_ACCOUNT_SEED.as_ref(), &request.seed],
        bump,
    )]
    request: Account<'info, Randomness>,
}
