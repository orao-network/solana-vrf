//! # ORAO VRF
//!
//! Crate to interact with `orao-vrf` smart contract on Solana network.
//!
//! Provides an interface to request verifiable randomness (Ed25519 Signature)
//! on the Solana network.
//!
//! ## Documentation
//!
//! Please look into the following functions and structures:
//!
//! * [`RequestBuilder`] – convenient builder for randomness requests
//! * [`get_network_state`] – helper to fetch the VRF configuration
//! * [`get_randomness`] – helper to fetch the randomness request state
//! * [`randomness_account_address`] – helper to derive randomness request state address
//! * [`network_state_account_address`] – helper to derive VRF on-chain configuration address
//!
//! ## Cross Program Invocation
//!
//! For CPI please look into the `cpi` example and account requirements for the [`Request`]
//! instruction.
//!
//! **Note:** requires `cpi` feature to be enabled and `sdk` feature to be disabled.
//!
//! ```ignore
//! // assuming ctx to be a context of an instruction that performs CPI
//! let vrf_program = ctx.accounts.vrf.to_account_info();
//! let request_accounts = orao_solana_vrf::cpi::accounts::Request {
//!     payer: ctx.accounts.player.to_account_info(),
//!     network_state: ctx.accounts.config.to_account_info(),
//!     treasury: ctx.accounts.treasury.to_account_info(),
//!     request: ctx.accounts.request.to_account_info(),
//!     system_program: ctx.accounts.system_program.to_account_info(),
//! };
//! let cpi_ctx = CpiContext::new(vrf_program, request_accounts);
//! orao_solana_vrf::cpi::request(cpi_ctx, seed)?;
//! ```
#![cfg_attr(docsrs, feature(doc_cfg))]
#![allow(deprecated)]

use anchor_lang::prelude::*;
use state::{NetworkState, OraoTokenFeeConfig, Randomness, RandomnessV2};

pub use crate::error::Error;

pub mod error;

pub mod events;
pub mod state;

mod sdk;
#[cfg(feature = "sdk")]
pub use crate::sdk::*;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

declare_id!("VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y");

/// This is the seed used for creating request/fulfillment accounts.
pub const RANDOMNESS_ACCOUNT_SEED: &[u8] = b"orao-vrf-randomness-request";

/// This is the seed used to create network-wide configuration PDA
/// account, that sets things like fulfillment authorities, costs, etc.
pub const CONFIG_ACCOUNT_SEED: &[u8] = b"orao-vrf-network-configuration";

// this is the number of public keys that are allowed to generate randomness
pub const MAX_FULFILLMENT_AUTHORITIES_COUNT: usize = 10;

/// Returns network state account address for the given VRF address.
///
/// * `vrf_id` — use [`crate::id`] to get the proper address
pub fn network_state_account_address(vrf_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[CONFIG_ACCOUNT_SEED], vrf_id).0
}

/// Returns randomness account address for the given seed and VRF address.
///
/// * `vrf_id` — use [`crate::id`] to get the proper address
pub fn randomness_account_address(vrf_id: &Pubkey, seed: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[RANDOMNESS_ACCOUNT_SEED, &seed[..]], vrf_id).0
}

/// Helper that XORes `r` into `l`.
pub fn xor_array<const N: usize>(l: &mut [u8; N], r: &[u8; N]) {
    for i in 0..N {
        l[i] ^= r[i];
    }
}

/// Helper that checks for Byzantine quorum.
pub const fn quorum(count: usize, total: usize) -> bool {
    count >= majority(total)
}

/// Helper that returns the majority for the given total value.
pub const fn majority(total: usize) -> usize {
    total * 2 / 3 + 1
}

#[allow(unused_variables)]
#[program]
pub mod orao_vrf {
    use super::*;

    /// Performs VRF initialization (for required accounts see [`crate::InitNetwork`]).
    ///
    /// *  fee – request fee (in lamports)
    /// *  config_authority – VRF config update authority
    /// *  fulfillment_authorities – randomness fulfillment authorities
    /// *  token_fee_config – token fee configuration
    ///
    /// Treasury is given via instruction accounts.
    pub fn init_network(
        ctx: Context<InitNetwork>,
        fee: u64,
        config_authority: Pubkey,
        fulfillment_authorities: Vec<Pubkey>,
        token_fee_config: Option<OraoTokenFeeConfig>,
    ) -> Result<()> {
        Ok(())
    }

    /// Performs VRF configuration update (for required accounts see [`crate::UpdateNetwork`]).
    ///
    /// *  fee – request fee (in lamports)
    /// *  config_authority – VRF config update authority
    /// *  fulfillment_authorities – randomness fulfillment authorities
    /// *  token_fee_config – token fee configuration
    ///
    /// Treasury is given via instruction accounts.
    pub fn update_network(
        ctx: Context<UpdateNetwork>,
        fee: u64,
        config_authority: Pubkey,
        fulfillment_authorities: Vec<Pubkey>,
        token_fee_config: Option<OraoTokenFeeConfig>,
    ) -> Result<()> {
        Ok(())
    }

    /// (**deprecated: see [`crate::Request`]**) Performs a randomness request
    /// (for required accounts see [`crate::Request`]).
    ///
    /// *  seed – unique request seed
    pub fn request<'info>(
        ctx: Context<'_, '_, '_, 'info, Request<'info>>,
        seed: [u8; 32],
    ) -> Result<()> {
        Ok(())
    }

    /// (**deprecated: see [`crate::FulfillV2`]**) Fulfills a randomness request
    /// (for required accounts see [`crate::Fulfill`]).
    pub fn fulfill(ctx: Context<Fulfill>) -> Result<()> {
        Ok(())
    }

    /// Performs a randomness request (for required accounts see [`crate::RequestV2`]).
    ///
    /// *  seed – unique request seed
    pub fn request_v2<'info>(
        ctx: Context<'_, '_, '_, 'info, RequestV2<'info>>,
        seed: [u8; 32],
    ) -> Result<()> {
        Ok(())
    }

    /// Fulfills a randomness request (for required accounts see [`crate::FulfillV2`]).
    pub fn fulfill_v2(ctx: Context<FulfillV2>) -> Result<()> {
        Ok(())
    }
}

/// Initialize network configuration.
///
/// ### Required accounts
///
/// *  (signer) payer – fee payer
/// *  (writable) network_state – VRF network state PDA
///    (see [`network_state_account_address`])
/// *  treasury – SOL treasury account
/// *  system_program - system program account
///
/// ### Remaining accounts
///
/// Following accounts are necessary if `token_fee_config` is given:
///
/// *  mint_account – SPL token mint account (should match the token fee config)
/// *  token_treasury_account – should match SPL token and token fee config
#[derive(Accounts)]
pub struct InitNetwork<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + 464,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    /// CHECK:
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

/// Update network configuration.
///
/// ### Required accounts
///
/// *  (signer) authority – should match configured VRF authority
/// *  (writable) network_state – VRF network state PDA
///    (see [`network_state_account_address`])
/// *  treasury – SOL treasury account
///
/// ### Remaining accounts
///
/// Following accounts are necessary if `token_fee_config` is given:
///
/// *  mint_account – SPL token mint account (should match the token fee config)
/// *  token_treasury_account – should match SPL token and token fee config
#[derive(Accounts)]
pub struct UpdateNetwork<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
        constraint = network_state.config.authority == authority.key(),
    )]
    pub network_state: Account<'info, NetworkState>,
    /// CHECK:
    pub treasury: AccountInfo<'info>,
}

/// (**deprecated: see [`crate::RequestV2`]**) Request randomness.
///
/// ### Required accounts
///
/// *  (signer) payer – request and transaction fee payer
/// *  (writable) network_state – VRF on-chain config PDA
///    (see [`network_state_account_address`])
/// *  (writable) (from VRF on-chain config) treasury – either SOL treasury or token treasury
///    (see remaining accounts)
/// *  (writable) request – randomness request PDA
///    (see [`randomness_account_address`])
/// *  system_program - system program account
///
/// ### Remaining accounts
///
/// If token fee configuration exists and given treasury equals token treasury,
/// then remaining accounts are required:
///
/// *  (writable) token_payer – payer token wallet
/// *  token_program_account – necessary to execute the transfer
///
/// ### Space calculation for account creation (request)
///
/// * 8 (anchor tag) + 32 (seed) + 64 (combined randomness) + 4 (response array length) + (32 (fulfiller pubkey) + 64 (fulfiller randomness))  * 7 (maximum number of responses)
///
#[derive(Accounts)]
#[instruction(seed: [u8; 32])]
#[deprecated(since = "0.4.0", note = "See RequestV2")]
pub struct Request<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    /// CHECK:
    #[account(
        mut,
        constraint = network_state.config.treasury == treasury.key() ||
        network_state.config.token_fee_config.as_ref().map(|x| x.treasury) == Some(treasury.key())
        @ Error::UnknownTreasuryGiven)]
    pub treasury: AccountInfo<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Randomness::SIZE,
        seeds = [RANDOMNESS_ACCOUNT_SEED, &seed],
        bump,
    )]
    pub request: Account<'info, Randomness>,
    pub system_program: Program<'info, System>,
}

/// (**deprecated: see [`crate::FulfillV2`]**) Fulfill randomness.
///
/// ### Required accounts
///
/// *  (signer) payer – transaction fee payer
/// *  instruction_acc – sysvar instruction account
/// *  (writable) network_state – VRF on-chain config PDA
///    (see [`network_state_account_address`])
/// *  (writable) request – randomness request PDA
///    (see [`randomness_account_address`])
#[derive(Accounts)]
#[deprecated(since = "0.4.0", note = "See FulfillV2")]
pub struct Fulfill<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK:
    pub instruction_acc: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    #[account(
        mut,
        seeds = [RANDOMNESS_ACCOUNT_SEED, &request.seed],
        bump,
    )]
    pub request: Account<'info, Randomness>,
}

/// Request randomness (v2).
///
/// ### Required accounts
///
/// *  (signer) payer – request and transaction fee payer
/// *  (writable) network_state – VRF on-chain config PDA
///    (see [`network_state_account_address`])
/// *  (writable) (from VRF on-chain config) treasury – either SOL treasury or token treasury
///    (see remaining accounts)
/// *  (writable) request – randomness request PDA
///    (see [`randomness_account_address`])
/// *  system_program - system program account
///
/// ### Remaining accounts
///
/// If token fee configuration exists and given treasury equals token treasury,
/// then remaining accounts are required:
///
/// *  (writable) token_payer – payer token wallet
/// *  token_program_account – necessary to execute the transfer
///
/// ### Space calculation for account creation (request)
///
/// * 8 (anchor tag) + 32 (client) + 32 (seed) + 4 (response array length) + (32 (fulfiller pubkey) + 64 (fulfiller randomness))  * 7 (maximum number of responses)
///
#[derive(Accounts)]
#[instruction(seed: [u8; 32])]
pub struct RequestV2<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    /// CHECK:
    #[account(
        mut,
        constraint = network_state.config.treasury == treasury.key() ||
        network_state.config.token_fee_config.as_ref().map(|x| x.treasury) == Some(treasury.key())
        @ Error::UnknownTreasuryGiven)]
    pub treasury: AccountInfo<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + RandomnessV2::PENDING_SIZE,
        seeds = [RANDOMNESS_ACCOUNT_SEED, &seed],
        bump,
    )]
    pub request: Account<'info, RandomnessV2>,
    pub system_program: Program<'info, System>,
}

/// Fulfill randomness (v2).
///
/// ### Required accounts
///
/// *  (signer) payer – transaction fee payer
/// *  instruction_acc – sysvar instruction account
/// *  (writable) network_state – VRF on-chain config PDA
///    (see [`network_state_account_address`])
/// *  (writable) request – randomness request PDA
///    (see [`randomness_account_address`])
/// *  (writable) client - client account (see [`Randomness::client`])
#[derive(Accounts)]
pub struct FulfillV2<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK:
    pub instruction_acc: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
    )]
    pub network_state: Account<'info, NetworkState>,
    #[account(
        mut,
        seeds = [RANDOMNESS_ACCOUNT_SEED, request.seed()],
        bump,
    )]
    pub request: Account<'info, RandomnessV2>,
    #[account(mut, constraint = *request.client() == client.key())]
    pub client: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
