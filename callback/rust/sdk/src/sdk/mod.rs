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

use anchor_lang::prelude::*;
pub use events::{Event, UnknownEvent};
pub use instructions::*;
pub use priority::*;
use anchor_client::{Instruction, Signer};

pub use anchor_client;

/// Builds the Ed25519 program instruction that verifies `message` signed by `keypair`.
///
/// This mirrors `new_ed25519_instruction` of the Solana 2.x SDK: a single
/// signature with every instruction index set to `u16::MAX` (i.e. "this very
/// instruction"), which is the only layout the VRF program accepts.
pub fn new_ed25519_instruction(
    keypair: &ed25519_dalek::Keypair,
    message: &[u8],
) -> Instruction {
    use ed25519_dalek::Signer as _;

    const PUBKEY_OFFSET: u16 = 2 + 14; // header + offsets
    const SIGNATURE_OFFSET: u16 = PUBKEY_OFFSET + 32;
    const MESSAGE_OFFSET: u16 = SIGNATURE_OFFSET + 64;

    let signature = keypair.sign(message).to_bytes();
    let pubkey = keypair.public.to_bytes();

    let mut data = Vec::with_capacity(MESSAGE_OFFSET as usize + message.len());
    data.extend_from_slice(&[1, 0]); // num_signatures, padding
    for value in [
        SIGNATURE_OFFSET,
        u16::MAX,
        PUBKEY_OFFSET,
        u16::MAX,
        MESSAGE_OFFSET,
        message.len() as u16,
        u16::MAX,
    ] {
        data.extend_from_slice(&value.to_le_bytes());
    }
    data.extend_from_slice(&pubkey);
    data.extend_from_slice(&signature);
    data.extend_from_slice(message);

    Instruction {
        program_id: crate::ED25519_PROGRAM_ID,
        accounts: vec![],
        data,
    }
}

pub async fn client_balance<C: Deref<Target = impl Signer> + Clone>(
    orao_vrf: &anchor_client::Program<C>,
    client_addr: Pubkey,
) -> std::result::Result<u64, anchor_client::ClientError> {
    let rpc = orao_vrf.rpc();
    let account = rpc.get_account(&client_addr).await.map_err(Box::new)?;
    let rent = rpc
        .get_minimum_balance_for_rent_exemption(account.data.len())
        .await
        .map_err(Box::new)?;
    Ok(account.lamports.saturating_sub(rent))
}
