use std::ops::Deref;

use anchor_client::solana_sdk::instruction::Instruction;
use anchor_client::solana_sdk::signer::Signer;
use anchor_client::solana_sdk::system_program;
use anchor_lang::prelude::Pubkey;
use anchor_lang::{InstructionData, ToAccountMetas};

use crate::state::client::Callback;
use crate::SetCallbackParams;

use crate::sdk::ComputeBudgetConfig;

/// [`SetCallback`] instruction builder.
///
/// Note:
///
/// *   prioritization fees here are handled automatically based on the recent
///     prioritization fees — use [`SetCallbackBuilder::with_compute_unit_price`] to opt-out.
/// *   this builder is added for convenience —
///     use [`SetCallbackBuilder::into_raw_instruction`] to get the raw instruction,
///     or build it yourself (see the [`SetCallbackBuilder::into_raw_instruction`] source).
///
/// [`SetCallback`]: crate::SetCallback
#[derive(Debug, Clone)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub struct SetCallbackBuilder {
    params: SetCallbackParams,
    compute_budget_config: ComputeBudgetConfig,
}

impl SetCallbackBuilder {
    /// Creates a new builder with the given new callback.
    pub fn new(new_callback: Option<Callback>) -> Self {
        Self {
            params: SetCallbackParams::new(new_callback),
            compute_budget_config: Default::default(),
        }
    }

    /// Defines a prioritization fee in micro-lamports (applied per compute unit).
    ///
    /// Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
    ///
    /// *   if not specified, then median fee of the last 150 confirmed
    ///     slots is used (this is by default)
    /// *   if zero, then compute unit price is not applied at all.
    pub fn with_compute_unit_price(mut self, compute_unit_price: u64) -> Self {
        self.compute_budget_config.compute_unit_price = Some(compute_unit_price);
        self
    }

    /// Defines a multiplier that is applied to a median compute unit price.
    ///
    /// This is only applied if no compute_unit_price specified, i.e. if compute unit price
    /// is measured as a median fee of the last 150 confirmed slots.
    ///
    /// *   if not specified, then no multiplier is applied (this is by default)
    /// *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
    pub fn with_compute_unit_price_multiplier(mut self, multiplier: f64) -> Self {
        self.compute_budget_config.compute_unit_price_multiplier = Some(multiplier);
        self
    }

    /// Defines a specific compute unit limit that the transaction is allowed to consume.
    ///
    /// Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
    ///
    /// *   if not specified, then compute unit limit is not applied at all
    ///     (this is by default)
    /// *   if specified, then applied as is
    pub fn with_compute_unit_limit(mut self, compute_unit_limit: u32) -> Self {
        self.compute_budget_config.compute_unit_limit = Some(compute_unit_limit);
        self
    }

    /// Builds the raw [`SetCallback`] instruction based on this builder.
    ///
    /// This is a low-level function, consider using [`SetCallbackBuilder::build`].
    ///
    /// * `id` — the VRF program id (usually the [`crate::id`])
    /// * `payer` — transaction fee payer that will sign the tx (see [`SetCallback::payer`])
    /// * `client` — client PDA address (see [`SetCallback::client`])
    ///
    /// Compute Budget Program configuration is ignored.
    ///
    /// [`SetCallback`]: crate::SetCallback
    /// [`SetCallback::payer`]: crate::SetCallback::payer
    /// [`SetCallback::client`]: crate::SetCallback::client
    pub fn into_raw_instruction(self, id: Pubkey, payer: Pubkey, client: Pubkey) -> Instruction {
        Instruction::new_with_bytes(
            id,
            &crate::instruction::SetCallback {
                params: self.params,
            }
            .data(),
            crate::accounts::SetCallback {
                payer,
                client,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    /// Builds the request.
    ///
    /// Note that this function returns an [`anchor_client::RequestBuilder`] instance,
    /// so feel free to put more instructions into it.
    pub async fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
        client: Pubkey,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let mut builder = orao_vrf.request();

        for ix in self
            .compute_budget_config
            .get_instructions(orao_vrf)
            .await?
        {
            builder = builder.instruction(ix);
        }

        builder = builder
            .accounts(crate::accounts::SetCallback {
                payer: orao_vrf.payer(),
                client,
                system_program: system_program::ID,
            })
            .args(crate::instruction::SetCallback {
                params: self.params,
            });

        Ok(builder)
    }
}
