use std::ops::Deref;

use anchor_client::{
    solana_client::{client_error::ClientError, nonblocking::rpc_client::RpcClient},
    solana_sdk::{
        compute_budget::ComputeBudgetInstruction, instruction::Instruction, signer::Signer,
    },
};

/// Calculates recommended fee based on the median fee of the last 150 slots.
///
/// * if `priority_fee` given, then it's a no-op that returns this priority fee
/// * if `multiplier` given, then multiplies median fee by it (not applied if `priority_fee` given)
#[doc(hidden)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub async fn get_recommended_micro_lamport_fee(
    client: &RpcClient,
    priority_fee: Option<u64>,
    multiplier: Option<f64>,
) -> Result<Option<u64>, ClientError> {
    if priority_fee.is_some() {
        return Ok(priority_fee);
    }

    let mut fees = client.get_recent_prioritization_fees(&[]).await?;

    if fees.is_empty() {
        return Ok(None);
    }

    // Get the median fee from the most recent recent 150 slots' prioritization fee
    fees.sort_unstable_by_key(|fee| fee.prioritization_fee);
    let median_index = fees.len() / 2;

    let mut median_priority_fee = if fees.len() % 2 == 0 {
        (fees[median_index - 1].prioritization_fee + fees[median_index].prioritization_fee) / 2
    } else {
        fees[median_index].prioritization_fee
    };

    if median_priority_fee == 0 {
        return Ok(None);
    }

    if let Some(multiplier) = multiplier {
        median_priority_fee = (median_priority_fee as f64 * multiplier) as u64;
    }

    Ok(Some(median_priority_fee))
}

/// Compute budget configuration helper.
#[derive(Debug, Default, Clone, Copy, PartialEq)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub(crate) struct ComputeBudgetConfig {
    pub(crate) compute_unit_price: Option<u64>,
    pub(crate) compute_unit_price_multiplier: Option<f64>,
    pub(crate) compute_unit_limit: Option<u32>,
}

impl ComputeBudgetConfig {
    /// Returns an initial set of instructions according to the configuration.
    #[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
    pub(crate) async fn get_instructions<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<Vec<Instruction>, anchor_client::ClientError> {
        let mut instructions = Vec::new();

        if !matches!(self.compute_unit_price, Some(0)) {
            if let Some(fee) = get_recommended_micro_lamport_fee(
                &orao_vrf.rpc(),
                self.compute_unit_price,
                self.compute_unit_price_multiplier,
            )
            .await?
            {
                instructions.push(ComputeBudgetInstruction::set_compute_unit_price(fee));
            }
        }

        if let Some(limit) = self.compute_unit_limit {
            instructions.push(ComputeBudgetInstruction::set_compute_unit_limit(limit));
        }

        Ok(instructions)
    }
}
