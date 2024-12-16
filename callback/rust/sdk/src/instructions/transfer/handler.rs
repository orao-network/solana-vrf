use anchor_lang::prelude::*;

use super::{Transfer, TransferParams};

pub fn handler(_ctx: Context<Transfer>, _params: TransferParams) -> Result<()> {
    Ok(())
}
