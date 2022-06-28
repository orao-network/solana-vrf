use super::env::Env;
use super::error::Error;
use borsh::BorshSerialize;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    system_program, sysvar,
};

pub type Seed = [u8; 32];
pub type Rand = [u8; 64];

/// VrfInstruction supported by SDK
#[derive(Debug, BorshSerialize)]
pub enum VrfInstruction {
    /// Request for a new Randomness with seed.
    /// accounts:
    /// 0. [srw-] tx and fee payer account
    /// 1. [-r--] orao vrf configuration account
    /// 1. [-r--] orao treasury account (from config)
    /// 2. [-rw-] randomness request account
    /// 3. [---x] system program account
    /// 4. [---x] rent program account
    RequestRandomness { seed: Seed },
}

impl VrfInstruction {
    pub fn request(
        env: &Env,
        payer_acc: &Pubkey,
        treasury_acc: &Pubkey,
        random_seed: Seed,
    ) -> Result<Instruction, Error> {
        Ok(Instruction {
            program_id: env.vrf_program.clone(),
            accounts: vec![
                AccountMeta::new(*payer_acc, true),
                AccountMeta::new_readonly(env.find_config_account_address(), false),
                AccountMeta::new(*treasury_acc, false),
                AccountMeta::new(env.find_randomness_request_account(&random_seed), false),
                AccountMeta::new_readonly(system_program::id(), false),
                AccountMeta::new_readonly(sysvar::rent::id(), false),
            ],
            data: VrfInstruction::RequestRandomness { seed: random_seed }
                .try_to_vec()
                .map_err(|_| Error::SerializationError)?,
        })
    }
}
