pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("EioKxQafFaRbM5Yo1NXp1SP9HaFaqWWErZYpcb1a5eAC");

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

    pub fn request_alt<'info>(
        ctx: Context<'_, '_, '_, 'info, RequestAlt<'info>>,
        seed: [u8; 32],
        override_with_param: Option<HowToOverrideAlt>,
    ) -> Result<()> {
        request_alt::handler_alt(ctx, seed, override_with_param)
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

    pub fn request_level_callback_alt(
        ctx: Context<RequestLevelCallbackAlt>,
        test_parameter: u8,
    ) -> Result<()> {
        request_level_callback_alt::rlc_alt_handler(ctx, test_parameter)
    }
}
