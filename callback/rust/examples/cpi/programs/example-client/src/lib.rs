pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("7ecjG7TZ1ynYvmtLCh7uXa6UJ6aiSCF1NtgquhY8pZ2d");

#[program]
pub mod example_client {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::initialize_handler(ctx)
    }

    pub fn request(
        ctx: Context<Request>,
        seed: [u8; 32],
        override_with_param: Option<HowToOverride>,
    ) -> Result<()> {
        request::handler(ctx, seed, override_with_param)
    }

    pub fn client_level_callback(
        ctx: Context<ClientLevelCallback>,
        test_parameter: u8,
    ) -> Result<()> {
        client_level_callback::clc_handler(ctx, test_parameter)
    }

    pub fn request_level_callback(
        ctx: Context<RequestLevelCallback>,
        test_parameter: u8,
    ) -> Result<()> {
        request_level_callback::rlc_handler(ctx, test_parameter)
    }
}
