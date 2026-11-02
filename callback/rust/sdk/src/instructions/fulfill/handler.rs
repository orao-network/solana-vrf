use anchor_lang::prelude::*;

use super::{Fulfill, FulfillParams};

pub fn handler<'info>(_ctx: Context<'info, Fulfill<'info>>, _params: FulfillParams) -> Result<()> {
    Ok(())
}
