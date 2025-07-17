//! # ORAO VRF Callback
//!
//! A crate to interact with the  `orao-vrf-cb` smart contract on the Solana network.
//!
//! Provides an interface to request verifiable randomness (Ed25519 Signature)
//! on the Solana network and receive a CPI callback upon fulfill.
//!
//! ## Crate features
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
//! ## Integration
//!
//! The integration process consists of the following steps:
//!
//! 1.  Write and deploy a client program. It must be able to invoke either [`Request`]
//!     or [`RequestAlt`] instruction via CPI. It might define a callback — in fact any program
//!     instruction could be called.
//! 2.  Register your program as a VRF client by sending the [`Register`] instruction.
//! 3.  Fund a new client created on a previous step (just transfer some SOL to the [`Client`] PDA).
//! 4.  Now you are ready to perform a [`Request`]/[`RequestAlt`] instruction CPI.
//!
//! ### Callback functionality
//!
//! > ---
//! >
//! > #### Side Note
//! >
//! > Due to historical reasons callback functionality is split in two parts
//! > with slightly different capabilities:
//! >
//! > 1.  [`Callback`] — normal callback
//! > 2.  [`CallbackAlt`] — _ALT_ here stands for [Address Lookup Tables][lookup-tables].
//! >     This type of callback is able to use Solana's feature that allows developers
//! >     to create a collection of related addresses to efficiently load more addresses
//! >     in a single transaction. This is only possible for a _request-level callback_
//! >     (see bellow).
//! >
//! > For the same reason there are two kinds of request accounts:
//! >
//! > 1.  [`RequestAccount`] — request account created by the [`Request`] instruction.
//! > 2.  [`RequestAltAccount`] — request account created by the [`RequestAlt`] instruction.
//! >
//! > ---
//!
//! #### Account Order Convention
//!
//! There is a convention that [`RequestAlt`] instruction follows:
//!
//! > ---
//! >
//! > **If `n` is the number of Lookup Tables used by a callback then the first `n`
//! > accounts in the [`Context::remaining_accounts`] list must be the corresponding
//! > Lookup Table accounts**.
//! >
//! > ---
//!
//! Namely the instruction accepts the [`RequestAltParams::num_lookup_tables`] parameter
//! and expects the extended list of accounts (see the "Accounts" section in [`RequestAlt`] docs)
//!
//! There is a helper function that simplifies preparing Lookup Table accounts
//! for the [`RequestAlt`] instruction that is [`parse_lookup_tables`] so you are
//! encouraged to use it to prepare the CPI call. You also may follow the same
//! convention if you are using the Anchor Framework:
//!
//! ```ignore
//! let mut cpi_call_remaining_accounts = ctx
//!     .remaining_accounts
//!     .get(..num_lookup_tables as usize)
//!     .expect("call does not follow the convention")
//!     .to_vec();
//! let lookup_tables = orao_vrf_cb::utils::parse_lookup_tables(&cpi_call_remaining_accounts)?;
//!
//! // 1. prepare the callback using `CallbackAlt::compile_accounts`
//! //    and `lookup_tables` obtained above
//! // 2. extend cpi_call_remaining_accounts with writable accounts if necessary
//!
//! let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts)
//!     .with_signer(signers_seeds)
//!     .with_remaining_accounts(cpi_call_remaining_accounts);
//!
//! orao_vrf_cb::cpi::request_alt(
//!     cpi_ctx,
//!     RequestAltParams::new(seed)
//!         .with_callback(Some(callback))
//!         .with_num_lookup_tables(num_lookup_tables),
//! )?;
//! ```
//!
//! #### Callback
//!
//! A _callback_ is an instruction invoked via CPI as soon as the randomness request is fulfilled.
//!
//! Note that callbacks are optional. You can go without a callback giving `None` during the
//! client registration. Also note, that there are two levels of callbacks:
//!
//! 1.  **_Client-level callback_** — defined either upon or after the client registration.
//!     This callback will be used for every [`Request`] (not [`RequestAlt`]) of this client
//!     if not overridden by the _Request-level callback_. Effective client level callback could
//!     be observed in the [`Client::callback`] field of the Client PDA and
//!     could be updated using the [`SetCallback`] instruction.
//! 2.  **_Request-level callback_** — sets a callback for the current request [`Request`]
//!     or [`RequestAlt`] (overrides the _Client-level callback_).
//!
//! #### Callback rules
//!
//! *   callback instruction will be called as an instruction of the registered program
//! *   callback instruction will be called with the following list of accounts:
//!
//!     1.  The [`Client`] PDA (signer).
//!     2.  The state PDA (writable) (see [`Client::state`]).
//!     3.  The [`NetworkState`] PDA (read-only).
//!     4.  The corresponding [`RequestAccount`] PDA (read-only).
//!     5.  [ ... zero or more _remaining accounts_ (see bellow) ]
//!
//! #### Remaining accounts of a callback
//!
//! Use the following helpers to add remaining accounts to the callback:
//!
//! *   **for a normal [`Callback`]** — use [`Callback::with_remaining_account`]
//!     and [`Callback::with_remaining_accounts`] helpers. Or just directly
//!     extend the [`Callback::remaining_accounts`] field.
//! *   **for a [`CallbackAlt`]** — first create a vec of [`RemainingAccount`]s
//!     and then use the [`CallbackAlt::compile_accounts`] helper.
//!
//! There exists three kinds of _remaining accounts_:
//!
//! 1.  **Arbitrary read-only account** — it is possible to give an arbitrary
//!     read-only account to a callback. Use the [`RemainingAccount::readonly`]
//!     constructor to build one.
//! 2.  **Arbitrary writable account** — it is possible to give an arbitrary
//!     writable account as long as it is authorized by the caller - i.e.
//!     if it is given as writable to the corresponding [`Request`]/[`RequestAlt`]
//!     or [`Register`] instruction. Use the [`RemainingAccount::arbitrary_writable`]
//!     constructor.
//! 3.  **Writable PDA** — it is always possible to give a writable account as long
//!     as it is a PDA of the client program - just provide the proper seeds so
//!     that VRF is able to verify the address. Use the [`RemainingAccount::writable`]
//!     constructor.
//!
//! #### Callback faults
//!
//! If Callback invocation is somehow fails then it is considered as a client misbehavior -
//! well-written client's callback should never fail.
//!
//! There are two kinds of callback faults possible:
//!
//! 1.  **On-chain fail** — callback failed after the instruction was accepted
//!     by the network. This faulty call is visible on-chain and the logs could
//!     be easily inspected.
//! 2.  **Off-chain fail** — callback failed before the instruction was accepted
//!     by the network. This faulty call is not visible on-chain and appears as
//!     a request that not get fulfilled (in fact it will be fulfilled after the
//!     [`callback_deadline`] reached). We're working on making
//!     it easier to debug such a case.
//!
//! In any case the oracle will continue trying to fulfill such a client's request
//! with increasing interval but eventually will fulfill it without invoking the
//! Callback at all (see [`NetworkConfiguration::callback_deadline`]).
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
//!
//! [lookup-tables]: https://solana.com/ru/developers/guides/advanced/lookup-tables
//! [`RemainingAccount`]: state::client::RemainingAccount
//! [`RemainingAccount::readonly`]: state::client::RemainingAccount::readonly
//! [`RemainingAccount::arbitrary_writable`]: state::client::RemainingAccount::arbitrary_writable
//! [`RemainingAccount::writable`]: state::client::RemainingAccount::writable
//! [`Client`]: state::client::Client
//! [`Client::callback`]: state::client::Client::callback
//! [`Client::state`]: state::client::Client::state
//! [`RequestAccount`]: state::request::RequestAccount
//! [`RequestAltAccount`]: state::request_alt::RequestAltAccount
//! [`Callback`]: state::client::Callback
//! [`Callback::remaining_accounts`]: state::client::Callback::remaining_accounts
//! [`Callback::with_remaining_account`]: state::client::Callback::with_remaining_account
//! [`Callback::with_remaining_accounts`]: state::client::Callback::with_remaining_accounts
//! [`CallbackAlt`]: state::client::CallbackAlt
//! [`CallbackAlt::compile_accounts`]: state::client::CallbackAlt::compile_accounts
//! [`NetworkState`]: crate::state::network_state::NetworkState
//! [`NetworkConfiguration::callback_deadline`]: crate::state::network_state::NetworkConfiguration::callback_deadline
//! [`callback_deadline`]: crate::state::network_state::NetworkConfiguration::callback_deadline
//! [`parse_lookup_tables`]: crate::utils::parse_lookup_tables
//! [`Context::remaining_accounts`]: anchor_lang::prelude::Context::remaining_accounts
#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;

#[cfg_attr(docsrs, doc(cfg(all(feature = "sdk", not(feature = "idl-build")))))]
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
    pub fn request_alt(ctx: Context<RequestAlt>, params: RequestAltParams) -> Result<()> {
        request_alt::request_alt_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn fulfill<'a, 'info>(
        ctx: Context<'a, 'a, 'a, 'info, Fulfill<'info>>,
        params: FulfillParams,
    ) -> Result<()> {
        fulfill::fulfill_handler(ctx, params)
    }

    #[access_control(ctx.accounts.validate(&ctx, &params))]
    pub fn fulfill_alt<'a, 'info>(
        ctx: Context<'a, 'a, 'a, 'info, FulfillAlt<'info>>,
        params: FulfillAltParams,
    ) -> Result<()> {
        fulfill_alt::fulfill_alt_handler(ctx, params)
    }
}
