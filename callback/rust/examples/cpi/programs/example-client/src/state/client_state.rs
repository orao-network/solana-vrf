use anchor_lang::prelude::*;

/// Client state PDA.
///
/// All the fields here are used to test the VRF behavior.
#[account]
pub struct ClientState {
    pub bump: u8,
    /// This will hold the last randomness handled by the client-level callback.
    pub client_level_callback_randomness: [u8; 64],
    /// This will hold the last parameter passed to the client-level callback.
    pub client_level_callback_param: u8,
    /// This will hold the last randomness handled by the request-level callback.
    pub request_level_callback_randomness: [u8; 64],
    /// This will hold the last parameter passed to the request-level callback.
    pub request_level_callback_param: u8,
}

impl ClientState {
    pub const SIZE: usize = 1 + 64 + 1 + 64 + 1;
}
