use anchor_lang::prelude::*;

use super::{FulfillAlt, FulfillAltParams};

pub fn handler<'info>(
    _ctx: Context<'info, FulfillAlt<'info>>,
    _params: FulfillAltParams,
) -> Result<()> {
    Ok(())
}
