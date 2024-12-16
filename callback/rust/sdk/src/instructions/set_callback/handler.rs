use anchor_lang::prelude::*;

use super::{SetCallback, SetCallbackParams};

pub fn handler(_ctx: Context<SetCallback>, _params: SetCallbackParams) -> Result<()> {
    Ok(())
}
