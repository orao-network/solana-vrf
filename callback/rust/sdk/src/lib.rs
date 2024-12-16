//! # ORAO VRF Callback
//!
//! A crate to interact with the  `orao-vrf-cb` smart contract on the Solana network.
//!
//! Provides an interface to request verifiable randomness (Ed25519 Signature)
//! on the Solana network and receive a CPI callback upon fulfill.
//!
//! ### Crate features
//!
//!  * `sdk` (default) — use this feature to build an off-chain client
//!  * `cpi` — use this feature to integrate your program with the oracle
//!
//!     ```toml
//!     [dependencies.orao-solana-vrf-cb]
//!     version = "..."
//!     default-features = false
//!     features = ["cpi"]
//!     ```
//!
//! ### Integration
//!
//! The integration process consists of the following steps:
//!
//! 1.  Write and deploy a client program. It must be able to invoke the [`Request`] instruction
//!     via CPI. It might define the callback.
//! 2.  Register your program as a VRF client by sending the [`Register`] instruction.
//! 3.  Fund a new client created on a previous step (just transfer some SOL to the [`Client`] PDA).
//! 4.  Now you are ready to perform a [`Request`] instruction CPI
//!
//! ### Callback functionality
//!
//! Callback is an instruction invoked via CPI as soon as the randomness request is fulfilled.
//!
//! The following rules are applied to the callback:
//!
//! *   it could be any instruction of the registered program
//! *   it would be called with the following accounts:
//!
//!     *   The [`Client`] PDA (signer).
//!     *   The state PDA (writable) (see [`Client::state`]).
//!     *   The corresponding [`RequestAccount`] PDA (read-only).
//!     *   ... zero or more subsequent accounts (see [`Callback::remaining_accounts`]).
//!
//! The following rules are applied to the list of remaining accounts:
//!
//! *   it is possible to give an arbitrary read-only account
//! *   it is only possible to give a writable account only if it is a registered program's PDA
//!
//! Note that callbacks are optional. You can go without a callback giving `None` during the
//! client registration. Also note, that there are two levels of callbacks:
//!
//! 1.  _Client-level callback_ — defined upon the client registration and couldn't be avoided, but
//!     you can override it with the _Request-level callback_ (see [`Client::callback`]).
//!     You can update the _Client-level callback_ using the [`SetCallback`] instruction.
//! 2.  _Request-level callback_ — overrides the _Client-level callback_ (even if it is not defined).
//!
//! [`Client`]: state::client::Client
//! [`Client::state`]: state::client::Client::state
//! [`RequestAccount`]: state::request::RequestAccount
//! [`Callback::remaining_accounts`]: state::client::Callback::remaining_accounts
//! [`Client::callback`]: state::client::Client::callback
//!
//! #### Callback faults
//!
//! If Callback invocation is somehow fails then it is considered as a client misbehavior -
//! well-written client's callback should never fail.
//!
//! In any case the oracle will continue trying to fulfill such a client's request
//! with increasing interval but eventually will fulfill it without invoking the
//! Callback at all.
//!
//! ### Clients
//!
//! Any program may register any number of clients as long as unique state PDA is used
//! for every registration. Every registered client maintains a SOL balance used to pay
//! request fee and rent (note that the rent is reimbursed upon the fulfill).
//!
//! It is trivial to fund a client — you should transfer some SOL to its address.
//! The [`Withdraw`] instruction should be used to withdraw client funds but note
//! that you couldn't withdraw past the [`Client`] PDA rent.
//!
//! The client ownership might be transferred using the [`Transfer`] instruction.
#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;

#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub mod sdk;

declare_id!("VRFCBePmGTpZ234BhbzNNzmyg39Rgdd6VgdfhHwKypU");

/// Helper that checks for Byzantine quorum.
pub const fn quorum(count: usize, total: usize) -> bool {
    count >= majority(total)
}

/// Helper that returns the majority for the given total value.
pub const fn majority(total: usize) -> usize {
    total * 2 / 3 + 1
}

/// Helper that XORes `r` into `l`.
pub fn xor_array<const N: usize>(l: &mut [u8; N], r: &[u8; N]) {
    for i in 0..N {
        l[i] ^= r[i];
    }
}

#[program]
pub mod orao_vrf_cb {
    use super::*;

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        initialize::initialize_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn configure(ctx: Context<Configure>, params: ConfigureParams) -> Result<()> {
        configure::configure_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn register(ctx: Context<Register>, params: RegisterParams) -> Result<()> {
        register::register_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn withdraw(ctx: Context<Withdraw>, params: WithdrawParams) -> Result<()> {
        withdraw::withdraw_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn transfer(ctx: Context<Transfer>, params: TransferParams) -> Result<()> {
        transfer::transfer_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn set_callback(ctx: Context<SetCallback>, params: SetCallbackParams) -> Result<()> {
        set_callback::set_callback_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn request(ctx: Context<Request>, params: RequestParams) -> Result<()> {
        request::request_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn fulfill<'a, 'info>(
        ctx: Context<'a, 'a, 'a, 'info, Fulfill<'info>>,
        params: FulfillParams,
    ) -> Result<()> {
        fulfill::fulfill_handler(ctx, params)
    }
}
