use solana_program::{msg, program_error::ProgramError};

#[derive(thiserror::Error, Debug)]
#[repr(u32)]
pub enum Error {
    #[error("The player is already dead")]
    PlayerDead,
    #[error("Unable to serialize a randomness request")]
    RandomnessRequestSerializationError,
    #[error("Player must spin the cylinder")]
    YouMustSpinTheCylinder,
    #[error("The cylinder is still spinning")]
    TheCylinderIsStillSpinning,
}

impl From<Error> for ProgramError {
    fn from(e: Error) -> Self {
        msg!("{}", e.to_string());
        ProgramError::Custom(e as u32)
    }
}
