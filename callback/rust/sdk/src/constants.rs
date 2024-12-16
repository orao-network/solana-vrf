use anchor_lang::prelude::*;

/// Maximum number of fulfill authorities supported by the program.
#[constant]
pub const MAX_FULFILLMENT_AUTHORITIES: u64 = 10;

/// Base [`crate::state::network_state::NetworkState`] PDA seed.
#[constant]
pub const CB_CONFIG_ACCOUNT_SEED: &[u8] = b"OraoVrfCbConfig";

/// Base [`crate::state::client::Client`] PDA seed.
#[constant]
pub const CB_CLIENT_ACCOUNT_SEED: &[u8] = b"OraoVrfCbClient";

/// Base [`crate::state::request::RequestAccount`] PDA seed.
#[constant]
pub const CB_REQUEST_ACCOUNT_SEED: &[u8] = b"OraoVrfCbRequest";
