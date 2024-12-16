use anchor_lang::prelude::*;

use super::{Request, RequestParams};

pub fn handler(_ctx: Context<Request>, _params: RequestParams) -> Result<()> {
    Ok(())
}
