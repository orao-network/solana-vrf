use super::{Configure, ConfigureParams};
use anchor_lang::prelude::*;

pub fn handler(_ctx: Context<Configure>, _params: ConfigureParams) -> Result<()> {
    Ok(())
}
