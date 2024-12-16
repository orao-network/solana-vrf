use anchor_lang::prelude::*;

use super::{Withdraw, WithdrawParams};

pub fn handler(_ctx: Context<Withdraw>, _params: WithdrawParams) -> Result<()> {
    Ok(())
}
