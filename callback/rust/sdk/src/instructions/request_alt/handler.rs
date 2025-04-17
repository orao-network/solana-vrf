use anchor_lang::prelude::*;

use super::{RequestAlt, RequestAltParams};

pub fn handler(_ctx: Context<RequestAlt>, _params: RequestAltParams) -> Result<()> {
    Ok(())
}
