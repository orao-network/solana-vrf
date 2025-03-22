#![cfg(all(feature = "sdk", not(feature = "idl-build")))]
//! Off-chain client module

mod error;
mod events;
mod instructions;
#[doc(hidden)]
pub mod misc;
mod priority;
mod state;

use std::ops::Deref;

use anchor_client::solana_sdk::signer::Signer;
use anchor_lang::prelude::*;
pub use events::{Event, UnknownEvent};
pub use instructions::*;
pub use priority::*;

pub use anchor_client;

pub async fn client_balance<C: Deref<Target = impl Signer> + Clone>(
    orao_vrf: &anchor_client::Program<C>,
    client_addr: Pubkey,
) -> std::result::Result<u64, anchor_client::ClientError> {
    let rpc = orao_vrf.rpc();
    let account = rpc.get_account(&client_addr).await?;
    let rent = rpc
        .get_minimum_balance_for_rent_exemption(account.data.len())
        .await?;
    Ok(account.lamports.saturating_sub(rent))
}
