#![cfg(all(feature = "sdk", not(feature = "idl-build")))]
//! Off-chain client module

mod error;
mod events;
mod instructions;
mod priority;
mod state;

pub use events::{Event, UnknownEvent};
pub use instructions::*;
pub use priority::*;

pub use anchor_client;
