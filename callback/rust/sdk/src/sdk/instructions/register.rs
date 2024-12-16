use std::ops::Deref;

use anchor_client::solana_sdk::instruction::Instruction;
use anchor_client::solana_sdk::signer::Signer;
use anchor_client::solana_sdk::system_program;
use anchor_client::ClientError;
use anchor_lang::prelude::{Pubkey, UpgradeableLoaderState};
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};

use crate::state::client::{Callback, Client};
use crate::state::network_state::NetworkState;
use crate::RegisterParams;

use crate::sdk::ComputeBudgetConfig;

/// [`Register`] instruction builder.
///
/// Note:
///
/// *   prioritization fees here are handled automatically based on the recent
///     prioritization fees — use [`RegisterBuilder::with_compute_unit_price`] to opt-out.
/// *   this builder is added for convenience —
///     use [`RegisterBuilder::into_raw_instruction`] to get the raw instruction,
///     or build it yourself (see the [`RegisterBuilder::into_raw_instruction`] source).
///
/// [`Register`]: crate::Register
#[derive(Debug, Clone)]
#[cfg_attr(docsrs, doc(cfg(feature = "sdk")))]
pub struct RegisterBuilder {
    params: RegisterParams,
    compute_budget_config: ComputeBudgetConfig,
}

impl RegisterBuilder {
    /// Creates a new builder with given state seeds (see [`RegisterParams::state_seeds`])
    /// and empty client-level callback.
    pub fn new(state_seeds: Vec<Vec<u8>>) -> Self {
        Self {
            params: RegisterParams::new(state_seeds),
            compute_budget_config: Default::default(),
        }
    }

    /// Defines the client-level callback for this registration (see [`RegisterParams::callback`]).
    pub fn with_callback(mut self, callback: Option<Callback>) -> Self {
        self.params.callback = callback;
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

    /// Builds the raw [`Register`] instruction based on this builder.
    ///
    /// This is a low-level function, consider using [`RegisterBuilder::build`].
    ///
    /// * `id` — the VRF program id (usually the [`crate::id`])
    /// * `payer` — transaction fee payer that will sign the tx
    /// * `program` — a program being registered (see [`Register::program`])
    /// * `program_data` — an address of a program data account (see [`Register::program_data`])
    /// * `state` — state PDA (see [`Register::state`])
    ///
    /// Compute Budget Program configuration is ignored.
    ///
    /// [`Register`]: crate::Register
    /// [`Register::program`]: crate::Register::program
    /// [`Register::program_data`]: crate::Register::program_data
    /// [`Register::state`]: crate::Register::state
    pub fn into_raw_instruction(
        self,
        id: Pubkey,
        payer: Pubkey,
        program: Pubkey,
        program_data: Pubkey,
        state: Pubkey,
    ) -> Instruction {
        Instruction::new_with_bytes(
            id,
            &crate::instruction::Register {
                params: self.params,
            }
            .data(),
            crate::accounts::Register {
                payer,
                program,
                program_data,
                state,
                client: Client::find_address(&program, &state, &id).0,
                network_state: NetworkState::find_address(&id).0,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    /// Builds the request.
    ///
    /// Note that this function returns an [`anchor_client::RequestBuilder`] instance,
    /// so feel free to put more instructions into it.
    ///
    /// # Errors
    ///
    /// This function will emit [`ClientError::AccountNotFound`] error if `program`
    /// is not an upgradable loader state program account.
    pub async fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
        program: Pubkey,
        state: Pubkey,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let mut builder = orao_vrf.request();

        let program_account = orao_vrf.async_rpc().get_account(&program).await?;
        let program_state = UpgradeableLoaderState::try_deserialize(&mut &*program_account.data)?;
        let program_data = match program_state {
            UpgradeableLoaderState::Uninitialized => None,
            UpgradeableLoaderState::Buffer { .. } => None,
            UpgradeableLoaderState::Program {
                programdata_address,
            } => Some(programdata_address),
            UpgradeableLoaderState::ProgramData { .. } => None,
        };

        for ix in self
            .compute_budget_config
            .get_instructions(orao_vrf)
            .await?
        {
            builder = builder.instruction(ix);
        }

        builder = builder
            .accounts(crate::accounts::Register {
                payer: orao_vrf.payer(),
                program,
                program_data: program_data.ok_or(ClientError::AccountNotFound)?,
                state,
                client: Client::find_address(&program, &state, &orao_vrf.id()).0,
                network_state: NetworkState::find_address(&orao_vrf.id()).0,
                system_program: system_program::ID,
            })
            .args(crate::instruction::Register {
                params: self.params,
            });

        Ok(builder)
    }
}
