use anchor_lang::{prelude::*, solana_program::pubkey::PubkeyError, InstructionData};

use super::super::borsh;

/// This PDA represents a state of a registered client.
#[account]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct Client {
    pub bump: u8,
    /// The owner is able to manage the client:
    ///
    /// -   withdraw client funds
    /// -   transfer ownership
    pub owner: Pubkey,
    /// An address of a registered program.
    pub program: Pubkey,
    /// An arbitrary PDA that belongs to the client program.
    ///
    /// This is the request authority.
    pub state: Pubkey,
    /// Number of requests made by the client.
    pub num_requests: u64,
    /// An optional client-level callback.
    ///
    /// If it is `None`, then no callback will be called upon request fulfill, but you can
    /// override this using the request-level callback (see [`RequestParams::callback`]).
    ///
    /// You can update this value using the [`SetCallback`] instruction.
    ///
    /// [`RequestParams::callback`]: crate::RequestParams::callback
    /// [`SetCallback`]: crate::SetCallback
    pub callback: Option<ValidatedCallback>,
}

impl Client {
    pub const STATIC_SIZE: usize = 1 + 32 + 32 + 32 + 1 + 8 + 1 + ValidatedCallback::STATIC_SIZE;

    pub fn new(
        bump: u8,
        owner: Pubkey,
        program: Pubkey,
        state: Pubkey,
        num_requests: u64,
        callback: Option<ValidatedCallback>,
    ) -> Self {
        Self {
            bump,
            owner,
            program,
            state,
            num_requests,
            callback,
        }
    }

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE
            + self
                .callback
                .as_ref()
                .map(|x| x.dynamic_size())
                .unwrap_or_default()
    }

    /// Finds the client PDA address and bump for the given program, state and VRF address.
    ///
    /// - `vrf_id` — use the [`crate::id()`] to get the proper address.
    pub fn find_address(program: &Pubkey, state: &Pubkey, vrf_id: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                crate::CB_CLIENT_ACCOUNT_SEED,
                program.as_ref(),
                state.as_ref(),
            ],
            vrf_id,
        )
    }
}

/// A client callback where writable account ownership is validated.
///
/// In other words all the writable accounts belongs to the client program.
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub struct ValidatedCallback {
    /// Remaining account whose ownership is validated.
    ///
    /// See [`Callback::remaining_accounts`].
    remaining_accounts: Vec<ValidatedRemainingAccount>,
    /// See [`Callback::data`].
    data: Vec<u8>,
}

impl ValidatedCallback {
    pub const STATIC_SIZE: usize = 4 + 4;

    pub fn dynamic_size(&self) -> usize {
        self.remaining_accounts.len() * ValidatedRemainingAccount::SIZE + self.data.len()
    }

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE + self.dynamic_size()
    }

    pub fn remaining_accounts(&self) -> &[ValidatedRemainingAccount] {
        &self.remaining_accounts
    }

    pub fn data(&self) -> &[u8] {
        &self.data
    }
}

/// A client callback.
///
/// There are function added for convenience:
///
/// -   [`Callback::from_instruction_data`]
/// -   [`Callback::with_remaining_account`]
/// -   [`Callback::with_remaining_accounts`]
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct Callback {
    /// Additional accounts to add to the callback CPI call.
    ///
    /// -   the first one will always be the [`Client`] PDA (signer)
    /// -   the second one will always be the client state PDA of the client program (writable)
    /// -   the third one will always be the [`super::network_state::NetworkState`] PDA
    /// -   the fourth one will always be the corresponding [`super::request::RequestAccount`] PDA
    /// -   subsequent accounts will be remaining accounts given here.
    pub remaining_accounts: Vec<RemainingAccount>,
    /// Borsh-serialized instruction data.
    pub data: Vec<u8>,
}

impl Callback {
    pub const MAX_REMAINING_ACCOUNTS: usize = 32;

    /// Creates new callback.
    pub fn new(data: Vec<u8>) -> Self {
        Self {
            remaining_accounts: vec![],
            data,
        }
    }

    /// Creates new callback from the given instruction.
    pub fn from_instruction_data<T: InstructionData>(ix: &T) -> Self {
        Self {
            remaining_accounts: vec![],
            data: ix.data(),
        }
    }

    /// Adds given account to the list of remaining accounts.
    pub fn with_remaining_account(mut self, remaining_account: RemainingAccount) -> Self {
        self.remaining_accounts.push(remaining_account);
        self
    }

    /// Specifies the list of remaining accounts.
    pub fn with_remaining_accounts(mut self, remaining_accounts: Vec<RemainingAccount>) -> Self {
        self.remaining_accounts = remaining_accounts;
        self
    }

    /// A size of a corresponding [`ValidatedCallback`].
    pub fn valid_size(&self) -> usize {
        ValidatedCallback::STATIC_SIZE
            + self.remaining_accounts.len() * ValidatedRemainingAccount::SIZE
            + self.data.len()
    }
}

/// A callback account definition.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct RemainingAccount {
    /// Account address.
    pub pubkey: Pubkey,
    /// Seeds to assert that this account belongs to the client program.
    ///
    /// This is used to set `is_writable` flag on the instruction account.
    /// Only client program accounts could be writable.
    pub seeds: Option<Vec<Vec<u8>>>,
}

impl RemainingAccount {
    /// Creates new read-only account.
    pub fn readonly(pubkey: Pubkey) -> Self {
        Self {
            pubkey,
            seeds: None,
        }
    }

    /// Creates new writable account.
    ///
    /// Seeds are used to prove that this account belongs to the client program.
    pub fn writable(pubkey: Pubkey, seeds: Vec<Vec<u8>>) -> Self {
        Self {
            pubkey,
            seeds: Some(seeds),
        }
    }

    pub fn validate(
        self,
        client_program: &Pubkey,
    ) -> std::result::Result<ValidatedRemainingAccount, PubkeyError> {
        match &self.seeds {
            Some(seeds) => {
                let seeds: Vec<&[u8]> = seeds.iter().map(AsRef::as_ref).collect();
                let pubkey = Pubkey::create_program_address(&seeds, client_program)?;
                if pubkey != self.pubkey {
                    msg!("Unable to validate ownership of {}", self.pubkey);
                    return Err(PubkeyError::IllegalOwner);
                }
                Ok(ValidatedRemainingAccount {
                    pubkey: self.pubkey,
                    is_writable: true,
                })
            }
            None => Ok(ValidatedRemainingAccount {
                pubkey: self.pubkey,
                is_writable: false,
            }),
        }
    }
}

/// Remaining account whose ownership is validated.
///
/// I.e. if it is writable, then it belongs to the client program.
#[derive(Debug, Clone, Copy, AnchorSerialize, AnchorDeserialize, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
pub struct ValidatedRemainingAccount {
    pubkey: Pubkey,
    is_writable: bool,
}

impl ValidatedRemainingAccount {
    pub const SIZE: usize = 32 + 1;

    pub fn pubkey(&self) -> &Pubkey {
        &self.pubkey
    }

    pub fn is_writable(&self) -> bool {
        self.is_writable
    }
}

impl From<ValidatedRemainingAccount> for AccountMeta {
    fn from(value: ValidatedRemainingAccount) -> Self {
        AccountMeta {
            pubkey: value.pubkey,
            is_signer: false,
            is_writable: value.is_writable,
        }
    }
}
