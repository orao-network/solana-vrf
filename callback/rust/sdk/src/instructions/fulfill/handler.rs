use anchor_lang::prelude::*;

use super::{Fulfill, FulfillParams};

pub fn handler<'a, 'info>(
    _ctx: Context<'a, 'a, 'a, 'info, Fulfill<'info>>,
    _params: FulfillParams,
) -> Result<()> {
    Ok(())
}
