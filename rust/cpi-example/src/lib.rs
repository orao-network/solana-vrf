#![cfg_attr(not(test), forbid(unsafe_code))]

pub use error::Error;

pub mod error;
pub mod instructions;
pub mod misc;
pub mod state;

#[cfg(not(feature = "no-entrypoint"))]
mod processor;

solana_program::declare_id!("J368Eie6sDWuGuDrkTqYxXXzsDP9wPrUsKst4QnruhpW");
