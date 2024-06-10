#![cfg(feature = "sdk")]

use std::{
    future::Future,
    io,
    ops::Deref,
    sync::{Arc, Mutex},
};

use anchor_client::{
    solana_client::{
        client_error::{ClientError, ClientErrorKind},
        nonblocking::rpc_client::RpcClient,
    },
    solana_sdk::{
        compute_budget::ComputeBudgetInstruction, ed25519_instruction, instruction::Instruction,
        signature::Keypair, signer::Signer, sysvar,
    },
};
use anchor_lang::{
    prelude::{borsh::BorshDeserialize, AccountMeta, Pubkey},
    system_program, Discriminator, InstructionData, ToAccountMetas,
};
use anchor_spl::token;
use tokio::{sync::oneshot, task::JoinError};

use crate::{
    accounts, events, instruction, network_state_account_address, randomness_account_address,
    state::{
        NetworkConfiguration, NetworkState, OraoTokenFeeConfig, RandomnessAccountData,
        RandomnessAccountVersion,
    },
};

impl RandomnessAccountVersion {
    pub async fn resolve<'a, C: Deref<Target = impl Signer> + Clone>(
        orao_vrf: &'a anchor_client::Program<C>,
        seed: &[u8; 32],
    ) -> Result<Self, anchor_client::ClientError> {
        match get_randomness(orao_vrf, seed).await? {
            RandomnessAccountData::V1(_) => Ok(RandomnessAccountVersion::V1),
            RandomnessAccountData::V2(_) => Ok(RandomnessAccountVersion::V2),
        }
    }
}

/// An errors associated with the [`wait_fulfilled`] function.
#[derive(Debug, thiserror::Error)]
pub enum WaitFulfilledError {
    #[error(transparent)]
    Client(#[from] anchor_client::ClientError),
    #[error("Subscription was dropped without being resolved")]
    Dropped,
    #[error(transparent)]
    Join(#[from] JoinError),
}

/// Waits for the given randomness request to be fulfilled.
///
/// Note:
///
/// * it will use client's commitment level,
/// * it will use WS subscription to wait for the [`events::Fulfill`] event,
/// * it will fetch the randomness account to check whether it is already fulfilled
/// * this async function returns another future that one needs to await
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub async fn wait_fulfilled<C: Deref<Target = impl Signer> + Sync + Send + 'static + Clone>(
    seed: [u8; 32],
    orao_vrf: Arc<anchor_client::Program<C>>,
) -> impl Future<Output = Result<[u8; 64], WaitFulfilledError>> {
    let (spawned_tx, spawned_rx) = oneshot::channel();

    let orao_vrf_clone = orao_vrf.clone();
    let handle = tokio::spawn(async move {
        let (tx, rx) = oneshot::channel();
        // TODO: why anchor_client::Program::on requires Fn rather than FnMut?
        let tx = Mutex::new(Some(tx));

        let unsubscribe = orao_vrf_clone
            .on::<events::Fulfill>(move |_ctx, event| {
                if event.seed == seed {
                    if let Some(tx2) = tx.lock().unwrap().take() {
                        let _ = tx2.send(event.randomness);
                    }
                }
            })
            .await?;

        let _ = spawned_tx.send(());

        let randomness = rx.await;
        unsubscribe.unsubscribe().await;
        randomness.map_err(|_| WaitFulfilledError::Dropped)
    });

    // Let's wait unit the subscription is actually spawned.
    let _ = spawned_rx.await;

    async move {
        // In case it is already fulfilled
        let randomness_account = get_randomness(&*orao_vrf, &seed).await?;
        if let Some(randomness) = randomness_account.fulfilled_randomness() {
            return Ok(*randomness);
        }

        let randomness = handle.await??;

        assert_ne!(randomness, [0_u8; 64]);
        Ok(randomness)
    }
}

/// Fetches VRF on-chain state.
///
/// ```no_run
/// # fn main() { async {
/// # use orao_solana_vrf;
/// # use solana_sdk::signer::keypair::Keypair;
/// use anchor_client::*;
///
/// # let payer: std::sync::Arc<Keypair> = panic!();
///
/// // Feel free to chose the necessary CommitmentLevel using `Client::new_with_options`
/// let client = Client::new(Cluster::Devnet, payer);
/// let program = client.program(orao_solana_vrf::id())?;
///
/// let network_state = orao_solana_vrf::get_network_state(&program).await?;
///
/// println!("The treasury is {}", network_state.config.treasury);
/// println!("The fee is {}", network_state.config.request_fee);
/// # Result::<(), Box<dyn std::error::Error>>::Ok(()) }; }
/// ```
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub async fn get_network_state<C: Deref<Target = impl Signer> + Clone>(
    orao_vrf: &anchor_client::Program<C>,
) -> Result<NetworkState, anchor_client::ClientError> {
    let network_state_address = network_state_account_address(&orao_vrf.id());
    orao_vrf.account(network_state_address).await
}

/// Fetches randomness request state for the given seed.
///
/// ```no_run
/// # fn main() { async {
/// # use orao_solana_vrf;
/// # use solana_sdk::signer::keypair::Keypair;
/// use anchor_client::*;
///
/// # let (payer, seed): (std::sync::Arc<Keypair>, [u8; 32]) = panic!();
///
/// // Feel free to chose the necessary CommitmentLevel using `Client::new_with_options`
/// let client = Client::new(Cluster::Devnet, payer);
/// let program = client.program(orao_solana_vrf::id())?;
///
/// let randomness_account_data = orao_solana_vrf::get_randomness(&program, &seed).await?;
///
/// match randomness_account_data.fulfilled_randomness() {
///     Some(randomness) => println!("Randomness fulfilled: {:?}", randomness),
///     None => println!("Randomness is not yet fulfilled"),
/// }
/// # Result::<(), Box<dyn std::error::Error>>::Ok(()) }; }
/// ```
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub async fn get_randomness<C: Deref<Target = impl Signer> + Clone>(
    orao_vrf: &anchor_client::Program<C>,
    seed: &[u8; 32],
) -> Result<RandomnessAccountData, anchor_client::ClientError> {
    let request_address = randomness_account_address(&orao_vrf.id(), seed);
    orao_vrf.account(request_address).await
}

/// Calculates recommended fee based on the median fee of the last 150 slots.
///
/// * if `priority_fee` given, then it's a no-op that returns this priority fee
/// * if `multiplier` given, then multiplies median fee by it (not applied if `priority_fee` given)
#[doc(hidden)]
pub async fn get_recommended_micro_lamport_fee(
    client: &RpcClient,
    priority_fee: Option<u64>,
    multiplier: Option<f64>,
) -> Result<Option<u64>, anchor_client::ClientError> {
    if priority_fee.is_some() {
        return Ok(priority_fee);
    }

    let mut fees = client.get_recent_prioritization_fees(&[]).await?;

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

/// [`crate::InitNetwork`] instruction builder.
///
/// Note:
///
/// *   prioritization fees here are handled automatically based on the recent
///     prioritization fees — use [`InitBuilder::with_compute_unit_price`] to opt-out.
/// *   this builder is added for convenience — use [`InitBuilder::into_raw_instruction`] to get
///     the raw instruction, or build it yourself (see the [`InitBuilder::into_raw_instruction`]
///     source).
#[derive(Debug, Clone)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub struct InitBuilder {
    config: NetworkConfiguration,
    compute_budget_config: ComputeBudgetConfig,
}

impl InitBuilder {
    /// Creates a new builder with empty token fee configuration.
    pub fn new(
        config_authority: Pubkey,
        fee: u64,
        treasury: Pubkey,
        fulfillment_authorities: Vec<Pubkey>,
    ) -> Self {
        Self {
            config: NetworkConfiguration {
                authority: config_authority,
                treasury,
                request_fee: fee,
                fulfillment_authorities,
                token_fee_config: None,
            },
            compute_budget_config: Default::default(),
        }
    }

    /// Updates the token fee configuration.
    pub fn with_token_fee_config(mut self, token_fee_config: OraoTokenFeeConfig) -> Self {
        self.config.token_fee_config = Some(token_fee_config);
        self
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

    /// Builds the raw [`crate::InitNetwork`] instruction based on this builder.
    ///
    /// This is a low-level function, consider using [`InitBuilder::build`].
    ///
    /// * `id` — the VRF program id (usually the [`crate::id`])
    /// * `payer` — transaction fee payer that will sign the tx
    ///
    /// Compute Budget Program configuration is ignored.
    pub fn into_raw_instruction(self, id: Pubkey, payer: Pubkey) -> Instruction {
        Instruction::new_with_bytes(
            id,
            &instruction::InitNetwork {
                fee: self.config.request_fee,
                config_authority: self.config.authority,
                fulfillment_authorities: self.config.fulfillment_authorities,
                token_fee_config: self.config.token_fee_config,
            }
            .data(),
            accounts::InitNetwork {
                payer,
                network_state: network_state_account_address(&id),
                treasury: self.config.treasury,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    /// Builds the request.
    ///
    /// Note that this function returns an [`anchor_client::RequestBuilder`] instance,
    /// so feel free to put more instructions into the request.
    pub async fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let network_state_address = network_state_account_address(&orao_vrf.id());

        let mut builder = orao_vrf.request();

        for ix in self
            .compute_budget_config
            .get_instructions(orao_vrf)
            .await?
        {
            builder = builder.instruction(ix);
        }

        builder = builder
            .accounts(crate::accounts::InitNetwork {
                payer: orao_vrf.payer(),
                network_state: network_state_address,
                treasury: self.config.treasury,
                system_program: system_program::ID,
            })
            .args(crate::instruction::InitNetwork {
                fee: self.config.request_fee,
                config_authority: self.config.authority,
                fulfillment_authorities: self.config.fulfillment_authorities,
                token_fee_config: self.config.token_fee_config.clone(),
            });

        if let Some(token_fee_config) = self.config.token_fee_config {
            Ok(builder.accounts(vec![
                AccountMeta::new_readonly(token_fee_config.mint, false),
                AccountMeta::new_readonly(token_fee_config.treasury, false),
            ]))
        } else {
            Ok(builder)
        }
    }
}

/// [`crate::UpdateNetwork`] instruction builder.
///
/// Note:
///
/// *   prioritization fees here are handled automatically based on the recent
///     prioritization fees — use [`UpdateBuilder::with_compute_unit_price`] to opt-out.
/// *   this builder is added for convenience — use [`UpdateBuilder::into_raw_instruction`] to get
///     the raw instruction, or build it yourself (see the [`UpdateBuilder::into_raw_instruction`]
///     source)
#[derive(Debug, Default)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub struct UpdateBuilder {
    authority: Option<Pubkey>,
    treasury: Option<Pubkey>,
    request_fee: Option<u64>,
    fulfillment_authorities: Option<Vec<Pubkey>>,
    token_fee_config: Option<Option<OraoTokenFeeConfig>>,
    compute_budget_config: ComputeBudgetConfig,
}

impl UpdateBuilder {
    /// Creates a new builder that does not update anything.
    pub fn new() -> Self {
        Self::default()
    }

    /// Change configuration authority.
    pub fn with_authority(mut self, authority: Pubkey) -> Self {
        self.authority = Some(authority);
        self
    }

    /// Change treasury account address.
    pub fn with_treasury(mut self, treasury: Pubkey) -> Self {
        self.treasury = Some(treasury);
        self
    }

    /// Change fee (in lamports).
    pub fn with_fee(mut self, request_fee: u64) -> Self {
        self.request_fee = Some(request_fee);
        self
    }

    /// Change fulfillment authorities.
    pub fn with_fulfillment_authorities(mut self, fulfillment_authorities: Vec<Pubkey>) -> Self {
        self.fulfillment_authorities = Some(fulfillment_authorities);
        self
    }

    /// Change token fee configuration.
    pub fn with_token_fee_config(mut self, token_fee_config: Option<OraoTokenFeeConfig>) -> Self {
        self.token_fee_config = Some(token_fee_config);
        self
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

    /// Builds the raw [`crate::UpdateNetwork`] instruction based on this builder.
    ///
    /// This is a low-level function, consider using [`UpdateBuilder::build`].
    ///
    /// *   `id` — the VRF program id (usually the [`crate::id`])
    /// *   `payer` — transaction fee payer that will sign the tx.
    ///     This must be the effective authority.
    /// *   `current_config` — is the effective VRF configuration
    ///     (see [`crate::get_network_state`])
    ///
    /// Compute Budget Program configuration is ignored.
    pub fn into_raw_instruction(
        self,
        id: Pubkey,
        payer: Pubkey,
        mut current_config: NetworkConfiguration,
    ) -> Instruction {
        let network_state_address = network_state_account_address(&id);

        if let Some(authority) = self.authority {
            current_config.authority = authority;
        }
        if let Some(treasury) = self.treasury {
            current_config.treasury = treasury;
        }
        if let Some(request_fee) = self.request_fee {
            current_config.request_fee = request_fee;
        }
        if let Some(fulfillment_authorities) = self.fulfillment_authorities {
            current_config.fulfillment_authorities = fulfillment_authorities;
        }
        if let Some(token_fee_config) = self.token_fee_config {
            current_config.token_fee_config = token_fee_config;
        }

        Instruction::new_with_bytes(
            id,
            &instruction::UpdateNetwork {
                fee: current_config.request_fee,
                config_authority: current_config.authority,
                fulfillment_authorities: current_config.fulfillment_authorities,
                token_fee_config: current_config.token_fee_config,
            }
            .data(),
            accounts::UpdateNetwork {
                authority: payer,
                network_state: network_state_address,
                treasury: current_config.treasury,
            }
            .to_account_metas(None),
        )
    }

    /// Builds the request.
    ///
    /// Note that this function returns an [`anchor_client::RequestBuilder`] instance,
    /// so feel free to put more instructions into the request.
    pub async fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let network_state_address = network_state_account_address(&orao_vrf.id());
        let network_state: NetworkState = orao_vrf.account(network_state_address).await?;
        let mut config = network_state.config;

        if let Some(authority) = self.authority {
            config.authority = authority;
        }
        if let Some(treasury) = self.treasury {
            config.treasury = treasury;
        }
        if let Some(request_fee) = self.request_fee {
            config.request_fee = request_fee;
        }
        if let Some(fulfillment_authorities) = self.fulfillment_authorities {
            config.fulfillment_authorities = fulfillment_authorities;
        }
        if let Some(token_fee_config) = self.token_fee_config {
            config.token_fee_config = token_fee_config;
        }

        let mut builder = orao_vrf.request();

        for ix in self
            .compute_budget_config
            .get_instructions(orao_vrf)
            .await?
        {
            builder = builder.instruction(ix);
        }

        builder = builder
            .accounts(crate::accounts::UpdateNetwork {
                authority: orao_vrf.payer(),
                network_state: network_state_address,
                treasury: config.treasury,
            })
            .args(crate::instruction::UpdateNetwork {
                fee: config.request_fee,
                config_authority: config.authority,
                fulfillment_authorities: config.fulfillment_authorities,
                token_fee_config: config.token_fee_config.clone(),
            });

        if let Some(token_fee_config) = config.token_fee_config {
            Ok(builder.accounts(vec![
                AccountMeta::new_readonly(token_fee_config.mint, false),
                AccountMeta::new_readonly(token_fee_config.treasury, false),
            ]))
        } else {
            Ok(builder)
        }
    }
}

/// [`crate::RequestV2`] instruction builder.
///
/// Note:
///
/// *   prioritization fees here are handled automatically based on the recent
///     prioritization fees — use [`RequestBuilder::with_compute_unit_price`] to opt-out.
/// *   this builder is added for convenience — use [`RequestBuilder::into_raw_instruction`] to get
///     the raw instruction, or build it yourself (see the [`RequestBuilder::into_raw_instruction`]
///     source)
///
/// Example:
///
/// ```no_run
/// # fn main() { async {
/// # use orao_solana_vrf;
/// # use solana_sdk::signer::keypair::Keypair;
/// use anchor_client::*;
///
/// # let payer: std::sync::Arc<Keypair> = panic!();
///
/// // Feel free to chose the necessary `CommitmentLevel` using `Client::new_with_options`
/// let client = Client::new(Cluster::Devnet, payer);
/// let program = client.program(orao_solana_vrf::id())?;
///
/// let seed = rand::random();
/// let mut tx = orao_solana_vrf::RequestBuilder::new(seed)
///     // use `with_compute_unit_price(..)` function to override
///     // the default prioritization fee
///     .build(&program)
///     .await?
///     // You can add more instructions to the transaction, if necessary, but we'll send it as is.
///     .send()
///     .await?;
///
/// println!("Your transaction is {}", tx);
/// # Result::<(), Box<dyn std::error::Error>>::Ok(()) }; }
/// ```
#[derive(Debug, Default)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub struct RequestBuilder {
    seed: [u8; 32],
    token_wallet: Option<Pubkey>,
    compute_budget_config: ComputeBudgetConfig,
}

impl RequestBuilder {
    /// Creates a new builder with the given seed. Fees are paid with lamports by default.
    pub fn new(seed: [u8; 32]) -> Self {
        Self {
            seed,
            token_wallet: None,
            compute_budget_config: Default::default(),
        }
    }

    /// Pay fees with SPL token using given token wallet address.
    ///
    /// Instruction could fail if token fee is not configured for the contract.
    pub fn pay_with_token(mut self, token_wallet: Pubkey) -> Self {
        self.token_wallet = Some(token_wallet);
        self
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

    /// Builds the raw [`crate::RequestV2`] instruction based on this builder.
    ///
    /// This is a low-level function, consider using [`RequestBuilder::build`].
    ///
    /// *   `id` — the VRF program id (usually the [`crate::id`])
    /// *   `payer` — transaction fee payer that will sign the tx.
    /// *   `current_config` — is the effective VRF configuration
    ///     (see [`crate::get_network_state`])
    ///
    /// Returns `None` if [`RequestBuilder::pay_with_token`] is given, but no token fee
    /// configured in the `current_config`.
    ///
    /// Compute Budget Program configuration is ignored.
    pub fn into_raw_instruction(
        self,
        id: Pubkey,
        payer: Pubkey,
        current_config: NetworkConfiguration,
    ) -> Option<Instruction> {
        let network_state_address = network_state_account_address(&id);
        let request_address = randomness_account_address(&id, &self.seed);

        let (treasury, remaining_accounts) = if let Some(token_wallet) = self.token_wallet {
            (
                current_config.token_fee_config?.treasury,
                vec![
                    AccountMeta::new(token_wallet, false),
                    AccountMeta::new_readonly(token::ID, false),
                ],
            )
        } else {
            (current_config.treasury, vec![])
        };

        let mut accounts = accounts::RequestV2 {
            payer,
            network_state: network_state_address,
            treasury,
            request: request_address,
            system_program: system_program::ID,
        }
        .to_account_metas(None);

        accounts.extend(remaining_accounts);

        Some(Instruction::new_with_bytes(
            id,
            &instruction::RequestV2 { seed: self.seed }.data(),
            accounts,
        ))
    }

    /// Builds the request.
    ///
    /// Note that this function returns an [`anchor_client::RequestBuilder`] instance,
    /// so feel free to put more instructions into the request.
    pub async fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let network_state_address = network_state_account_address(&orao_vrf.id());
        let request_address = randomness_account_address(&orao_vrf.id(), &self.seed);

        let network_state: NetworkState = orao_vrf.account(network_state_address).await?;
        let config = network_state.config;

        let (treasury, remaining_accounts) = if let Some(token_wallet) = self.token_wallet {
            let token_fee_config = config.token_fee_config.ok_or_else(|| {
                ClientError::from(ClientErrorKind::Custom(
                    "Token fee is not configured for the given VRF instance".to_string(),
                ))
            })?;
            (
                token_fee_config.treasury,
                vec![
                    AccountMeta::new(token_wallet, false),
                    AccountMeta::new_readonly(token::ID, false),
                ],
            )
        } else {
            (config.treasury, vec![])
        };

        let mut builder = orao_vrf.request();

        for ix in self
            .compute_budget_config
            .get_instructions(orao_vrf)
            .await?
        {
            builder = builder.instruction(ix);
        }

        Ok(builder
            .accounts(crate::accounts::RequestV2 {
                payer: orao_vrf.payer(),
                network_state: network_state_address,
                treasury,
                request: request_address,
                system_program: system_program::ID,
            })
            .args(crate::instruction::RequestV2 { seed: self.seed })
            .accounts(remaining_accounts))
    }
}

/// [`crate::Fulfill`]/[`crate::FulfillV2`] instruction builder.
///
/// Note:
///
/// *   prioritization fees here are handled automatically based on the recent
///     prioritization fees — use [`FulfillBuilder::with_compute_unit_price`] to opt-out.
/// *   this builder is added for convenience — use [`FulfillBuilder::into_raw_instruction`] to get
///     the raw instruction, or build it yourself (see the [`FulfillBuilder::into_raw_instruction`]
///     source)
///
/// ## Notes on account version:
///
/// This builder will analyze the randomness account version to properly choose the correct
/// fulfill instruction, i.e. [`instruction::Fulfill`] will be called for [`Randomness`],
/// and [`instruction::FulfillV2`] will be called for [`RandomnessV2`]
#[derive(Debug, Default)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub struct FulfillBuilder {
    seed: [u8; 32],
    compute_budget_config: ComputeBudgetConfig,
}

impl FulfillBuilder {
    /// Creates a new builder for the given seed.
    pub fn new(seed: [u8; 32]) -> Self {
        Self {
            seed,
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

    /// Builds the raw [`crate::Fulfill`] or [`crate::FulfillV2`] instruction based on this builder.
    ///
    /// This is a low-level function, consider using [`FulfillBuilder::build`].
    ///
    /// *   `id` — the VRF program id (usually the [`crate::id`])
    /// *   `payer` — transaction fee payer that will sign the tx.
    /// *   `fulfill_authority` — is the authorized fulfill authority present
    ///     in the effective configuration (see [`crate::get_network_state`]).
    ///     [`ed25519_dalek::Keypair`] is required because it is required by the
    ///     [`ed25519_instruction::new_ed25519_instruction`].
    ///
    /// Note that this function returns a pair of instructions and the order matters —
    /// in the transaction the first instruction (the `ed25519` instruction) must go
    /// right before the second instruction (the `Fulfill` instruction). It is also
    /// possible to put multiple fulfills into the same tx — instructions must go
    /// in the following order:
    ///
    /// 1. ed25519_1
    /// 2. Fulfill_1
    /// 3. ed25519_2
    /// 4. Fulfill_2
    /// 5. ...
    ///
    /// Also note that you must give the proper [`RandomnessAccountVersion`]
    /// (see [`RandomnessAccountVersion::resolve`]).
    ///
    /// Compute Budget Program configuration is ignored.
    pub fn into_raw_instruction(
        self,
        id: Pubkey,
        payer: Pubkey,
        client: Pubkey,
        version: RandomnessAccountVersion,
        fulfill_authority: &ed25519_dalek::Keypair,
    ) -> [Instruction; 2] {
        let network_state_address = network_state_account_address(&id);
        let request_address = randomness_account_address(&id, &self.seed);

        let fulfill_authority =
            ed25519_dalek::Keypair::from_bytes(fulfill_authority.to_bytes().as_ref()).unwrap();

        let ed25519 = ed25519_instruction::new_ed25519_instruction(&fulfill_authority, &self.seed);
        let fulfill = match version {
            RandomnessAccountVersion::V1 => Instruction::new_with_bytes(
                id,
                &instruction::Fulfill.data(),
                accounts::Fulfill {
                    payer,
                    instruction_acc: sysvar::instructions::ID,
                    network_state: network_state_address,
                    request: request_address,
                }
                .to_account_metas(None),
            ),
            RandomnessAccountVersion::V2 => Instruction::new_with_bytes(
                id,
                &instruction::FulfillV2.data(),
                accounts::FulfillV2 {
                    payer,
                    instruction_acc: sysvar::instructions::ID,
                    network_state: network_state_address,
                    request: request_address,
                    client,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
            ),
        };

        [ed25519, fulfill]
    }

    /// Builds the request.
    ///
    /// Note that this function returns an [`anchor_client::RequestBuilder`] instance,
    /// so feel free to put more instructions into the request.
    pub async fn build<'a, C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &'a anchor_client::Program<C>,
        fulfill_authority: &Keypair,
    ) -> Result<anchor_client::RequestBuilder<'a, C>, anchor_client::ClientError> {
        let network_state_address = network_state_account_address(&orao_vrf.id());
        let request_address = randomness_account_address(&orao_vrf.id(), &self.seed);
        let randomness_account_data = orao_vrf
            .account::<RandomnessAccountData>(request_address)
            .await?;

        let fulfill_authority =
            ed25519_dalek::Keypair::from_bytes(fulfill_authority.to_bytes().as_ref()).unwrap();

        let mut builder = orao_vrf.request();

        for ix in self
            .compute_budget_config
            .get_instructions(orao_vrf)
            .await?
        {
            builder = builder.instruction(ix);
        }

        builder = builder
            // this instruction must be right before the fulfill instruction
            .instruction(ed25519_instruction::new_ed25519_instruction(
                &fulfill_authority,
                &self.seed,
            ));

        let builder = match randomness_account_data.client() {
            None => builder
                .accounts(crate::accounts::Fulfill {
                    payer: orao_vrf.payer(),
                    network_state: network_state_address,
                    instruction_acc: sysvar::instructions::ID,
                    request: request_address,
                })
                .args(crate::instruction::Fulfill),
            Some(client) => builder
                .accounts(crate::accounts::FulfillV2 {
                    payer: orao_vrf.payer(),
                    network_state: network_state_address,
                    instruction_acc: sysvar::instructions::ID,
                    request: request_address,
                    client: *client,
                    system_program: system_program::ID,
                })
                .args(crate::instruction::FulfillV2),
        };

        Ok(builder)
    }
}

/// Compute budget configuration helper.
#[derive(Debug, Default, Clone, Copy, PartialEq)]
struct ComputeBudgetConfig {
    compute_unit_price: Option<u64>,
    compute_unit_price_multiplier: Option<f64>,
    compute_unit_limit: Option<u32>,
}

impl ComputeBudgetConfig {
    /// Returns an initial set of instructions according to the configuration.
    async fn get_instructions<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<Vec<Instruction>, anchor_client::ClientError> {
        let mut instructions = Vec::new();

        if !matches!(self.compute_unit_price, Some(0)) {
            if let Some(fee) = get_recommended_micro_lamport_fee(
                &orao_vrf.async_rpc(),
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

/// Convenience wrapper.
#[derive(Debug, Clone, Eq, PartialEq)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub enum Event {
    Request(events::Request),
    Response(events::Response),
    Fulfill(events::Fulfill),
}

impl Event {
    /// Meant to deserialize an event from a representation written
    /// in the `Program Data: <base64...>` log record.
    ///
    /// Expects bytes decoded from base64.
    pub fn from_log(mut bytes: &[u8]) -> io::Result<Self> {
        let discriminator = <[u8; 8] as BorshDeserialize>::deserialize(&mut bytes)?;
        match discriminator {
            events::Request::DISCRIMINATOR => {
                events::Request::deserialize(&mut bytes).map(Self::Request)
            }
            events::Response::DISCRIMINATOR => {
                events::Response::deserialize(&mut bytes).map(Self::Response)
            }
            events::Fulfill::DISCRIMINATOR => {
                events::Fulfill::deserialize(&mut bytes).map(Self::Fulfill)
            }
            _ => Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "unknown discriminator for an event",
            )),
        }
    }
}
