use anchor_lang::prelude::*;

use super::{Initialize, InitializeParams};

pub fn handler(_ctx: Context<Initialize>, _params: InitializeParams) -> Result<()> {
    Ok(())
}
