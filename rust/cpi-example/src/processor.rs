use borsh::{BorshDeserialize, BorshSerialize};
use orao_solana_vrf::VrfInstruction;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    instruction::AccountMeta,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::{rent, Sysvar},
};

use crate::{instructions::Instruction, state::PlayerState};

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    // make sure that we're running within the right programid
    if program_id != &crate::id() {
        msg!("error: invalid program id");
        return Err(ProgramError::InvalidArgument);
    }

    let instruction = Instruction::try_from_slice(data)
        .map_err(|_| -> ProgramError { ProgramError::InvalidInstructionData })?;
    match instruction {
        Instruction::SpinAndPullTheTrigger { force } => process_request(accounts, force),
    }
}

pub fn process_request(accounts: &[AccountInfo], force: [u8; 32]) -> ProgramResult {
    // Zero seed is illegal in VRF
    if force == [0_u8; 32] {
        return Err(crate::Error::YouMustSpinTheCylinder.into());
    }

    let account_info_iter = &mut accounts.iter();

    let player_acc = next_account_info(account_info_iter)?;
    let player_state_acc = next_account_info(account_info_iter)?;
    let prev_round_acc = next_account_info(account_info_iter)?;
    let vrf_acc = next_account_info(account_info_iter)?;
    let config_acc = next_account_info(account_info_iter)?;
    let treasury_acc = next_account_info(account_info_iter)?;
    let random_acc = next_account_info(account_info_iter)?;
    let system_acc = next_account_info(account_info_iter)?;
    let rent_acc = next_account_info(account_info_iter)?;

    // Verify system accounts.
    super::misc::verify_account_address(system_acc, &system_program::id())?;
    super::misc::verify_account_address(rent_acc, &rent::id())?;

    // Verify player's state account.
    let (expected_state_acc, bumps) = PlayerState::find_address(player_acc.key);
    if *player_state_acc.key != expected_state_acc {
        return Err(ProgramError::InvalidAccountData);
    }

    // Get or initialize player state.
    let mut player_state = match PlayerState::from_account_info(player_state_acc) {
        Ok(x) => x,
        Err(ProgramError::UninitializedAccount) => {
            init_player_state(player_acc, player_state_acc, bumps, rent_acc, system_acc)?
        }
        Err(e) => {
            msg!(&e.to_string());
            return Err(e);
        }
    };

    // Verify previous round account.
    let expected_prev_round_acc =
        super::misc::find_randomness_request_account(vrf_acc.key, &player_state.force);
    super::misc::verify_account_address(prev_round_acc, &expected_prev_round_acc)?;

    // Assert that the player is able to play.
    player_state.assert_can_play(prev_round_acc)?;

    // Create an instruction according to VRF contract spec.
    let instruction = solana_program::instruction::Instruction {
        program_id: vrf_acc.key.clone(),
        accounts: vec![
            AccountMeta::new(*player_acc.key, true),
            AccountMeta::new_readonly(*config_acc.key, false),
            AccountMeta::new(*treasury_acc.key, false),
            AccountMeta::new(*random_acc.key, false),
            AccountMeta::new_readonly(system_program::id(), false),
            AccountMeta::new_readonly(rent::id(), false),
        ],
        data: VrfInstruction::RequestRandomness { seed: force }
            .try_to_vec()
            .map_err(|_| crate::Error::RandomnessRequestSerializationError)?,
    };

    // Invoke VRF via CPI.
    invoke(
        &instruction,
        &[
            player_acc.clone(),
            config_acc.clone(),
            treasury_acc.clone(),
            random_acc.clone(),
            system_acc.clone(),
            rent_acc.clone(),
        ],
    )?;

    // Update player state (bump round) and write it into the account.
    player_state.force = force;
    player_state.rounds += 1;
    player_state.serialize(&mut player_state_acc.data.borrow_mut().as_mut())?;

    Ok(())
}

/// Performs the on-chain player state initialization.
fn init_player_state<'a>(
    player_acc: &AccountInfo<'a>,
    player_state_acc: &AccountInfo<'a>,
    bumps: u8,
    rent_acc: &AccountInfo,
    system_acc: &AccountInfo<'a>,
) -> Result<PlayerState, ProgramError> {
    let initial_state = PlayerState::new(*player_acc.key);

    let rent = Rent::from_account_info(rent_acc)?.minimum_balance(PlayerState::SIZE);
    invoke_signed(
        &system_instruction::create_account(
            player_acc.key,
            player_state_acc.key,
            rent,
            PlayerState::SIZE as u64,
            &crate::id(),
        ),
        &[
            player_acc.clone(),
            player_state_acc.clone(),
            system_acc.clone(),
        ],
        &[&[PlayerState::ACCOUNT_SEED, player_acc.key.as_ref(), &[bumps]]],
    )?;

    initial_state.serialize(&mut player_state_acc.data.borrow_mut().as_mut())?;

    Ok(initial_state)
}
