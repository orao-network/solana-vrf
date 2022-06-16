use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Debug, BorshSerialize, BorshDeserialize, PartialEq, Clone)]
pub enum Instruction {
    /// accounts:
    /// 0. [srw-] player account (tx and fee payer)
    /// 1. [-rw-] player state account
    /// 2. [-r--] previous randomness request account
    /// 3. [-r--] orao vrf account
    /// 4. [-r--] orao vrf configuration account
    /// 5. [-r--] orao treasury account (from config)
    /// 6. [-rw-] randomness request account
    /// 7. [---x] system program account
    /// 8. [---x] rent program account
    SpinAndPullTheTrigger { force: [u8; 32] },
}

impl Instruction {
    #[cfg(feature = "sdk")]
    pub fn spin_and_pull_the_trigger(
        client: &orao_solana_vrf::VrfRequestor,
        player: &solana_program::pubkey::Pubkey,
    ) -> anyhow::Result<solana_program::instruction::Instruction> {
        use anyhow::Context;
        use solana_program::{instruction::AccountMeta, system_program, sysvar};

        use crate::state::PlayerState;

        let config = client.get_configuration()?;
        let (player_state_address, _) = PlayerState::find_address(player);
        let player_state = PlayerState::load_from_account(player, &client.rpc_client)?;
        let force = rand::random();

        Ok(solana_program::instruction::Instruction {
            program_id: crate::id(),
            accounts: vec![
                AccountMeta::new(*player, true),
                AccountMeta::new(player_state_address, false),
                AccountMeta::new_readonly(
                    client.get_randomness_address(&player_state.force),
                    false,
                ),
                AccountMeta::new_readonly(client.get_vrf_address(), false),
                AccountMeta::new_readonly(client.get_vrf_config_address(), false),
                AccountMeta::new(config.treasury, false),
                AccountMeta::new(client.get_randomness_address(&force), false),
                AccountMeta::new_readonly(system_program::id(), false),
                AccountMeta::new_readonly(sysvar::rent::id(), false),
            ],
            data: Instruction::SpinAndPullTheTrigger { force }
                .try_to_vec()
                .context("TX serialization error")?,
        })
    }
}
