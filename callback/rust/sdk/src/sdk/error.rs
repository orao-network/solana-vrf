use crate::error::ErrorCode;

impl std::error::Error for ErrorCode {}

impl ErrorCode {
    /// Extracts [`ErrorCode`] from [`InstructionError::Custom`].
    ///
    /// Returns `None` if code doesn't match known variant.
    ///
    /// [`InstructionError::Custom`]: anchor_client::solana_sdk::instruction::InstructionError::Custom
    pub fn from_custom_error(code: u32) -> Option<Self> {
        match code.checked_sub(anchor_lang::error::ERROR_CODE_OFFSET)? {
            0 => Some(Self::NotAuthorized),
            1 => Some(Self::UnexpectedClientProgram),
            2 => Some(Self::UnexpectedClientProgramData),
            3 => Some(Self::UnexpectedClientState),
            4 => Some(Self::TooManyAccounts),
            5 => Some(Self::WrongOwner),
            6 => Some(Self::WrongTreasury),
            7 => Some(Self::MalformedFulfillMessage),
            8 => Some(Self::InvalidFulfillMessage),
            9 => Some(Self::Fulfilled),
            10 => Some(Self::MalformedFulfill),
            _ => None,
        }
    }
}
