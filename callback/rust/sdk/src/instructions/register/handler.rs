use anchor_lang::prelude::*;

use super::{Register, RegisterParams};

pub fn handler(_ctx: Context<Register>, _params: RegisterParams) -> Result<()> {
    Ok(())
}
