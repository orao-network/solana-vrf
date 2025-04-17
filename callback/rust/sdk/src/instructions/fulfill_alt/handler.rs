use anchor_lang::prelude::*;

use super::{FulfillAlt, FulfillAltParams};

pub fn handler<'a, 'info>(
    _ctx: Context<'a, 'a, 'a, 'info, FulfillAlt<'info>>,
    _params: FulfillAltParams,
) -> Result<()> {
    Ok(())
}
