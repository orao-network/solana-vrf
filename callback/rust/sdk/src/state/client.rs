use anchor_lang::{
    prelude::*,
    solana_program::{
        address_lookup_table::AddressLookupTableAccount,
        hash::{Hash, Hasher},
    },
    InstructionData,
};

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
    /// **Note:** this callback does not apply to [`RequestAlt`].
    ///
    /// If it is `None`, then no callback will be called upon request fulfill, but you can
    /// override this using the request-level callback (see [`RequestParams::callback`]).
    ///
    /// You can update this value using the [`SetCallback`] instruction.
    ///
    /// [`RequestParams::callback`]: crate::RequestParams::callback
    /// [`SetCallback`]: crate::SetCallback
    /// [`RequestAlt`]: crate::RequestAlt
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

/// See [`CallbackAlt`].
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub struct ValidatedCallbackAlt {
    /// This hash is used to validate the lookup accounts.
    accounts_hash: [u8; 32],
    /// See [`CallbackAlt::remaining_accounts`].
    remaining_accounts: Vec<ValidatedRemainingAccountAlt>,
    /// See [`CallbackAlt::data`].
    data: Vec<u8>,
}

impl ValidatedCallbackAlt {
    pub const STATIC_SIZE: usize = 32 + 4 + 4;

    pub fn size(&self) -> usize {
        Self::STATIC_SIZE
            + self
                .remaining_accounts
                .iter()
                .map(ValidatedRemainingAccountAlt::size)
                .sum::<usize>()
            + self.data.len()
    }

    pub fn account_hash(&self) -> Hash {
        Hash::from(self.accounts_hash)
    }

    pub fn remaining_accounts(&self) -> &[ValidatedRemainingAccountAlt] {
        &self.remaining_accounts
    }

    pub fn data(&self) -> &[u8] {
        &self.data
    }

    /// Resolves lookup accounts.
    ///
    /// # Errors
    ///
    /// This function will error if lookup accounts points outside the given
    /// lookup tables or if there is an account hash mismatch.
    pub fn decompile(
        &self,
        lookup_tables: &[AddressLookupTableAccount],
    ) -> std::result::Result<ValidatedCallback, DecompileError> {
        let mut accounts_hash = CallbackAlt::EMPTY_ACCOUNTS_HASH;
        let mut remaining_accounts = Vec::with_capacity(self.remaining_accounts.len());
        let mut lookup_errors = Vec::new();

        if !self.remaining_accounts.is_empty() {
            let mut accounts_hasher = Hasher::default();

            for account in &self.remaining_accounts {
                let address = match account {
                    ValidatedRemainingAccountAlt::Plain(plain_account) => {
                        remaining_accounts.push(*plain_account);
                        plain_account.pubkey
                    }
                    ValidatedRemainingAccountAlt::Lookup(lookup_account) => {
                        let Some(table) = lookup_tables.get(lookup_account.table_index as usize)
                        else {
                            lookup_errors.push(*lookup_account);
                            continue;
                        };
                        let Some(address) =
                            table.addresses.get(lookup_account.address_index as usize)
                        else {
                            lookup_errors.push(*lookup_account);
                            continue;
                        };
                        remaining_accounts.push(ValidatedRemainingAccount {
                            pubkey: *address,
                            is_writable: lookup_account.is_writable,
                        });
                        *address
                    }
                };
                accounts_hasher.hash(&address.to_bytes());
            }

            accounts_hash = accounts_hasher.result().to_bytes();
        }

        if !lookup_errors.is_empty() {
            return Err(DecompileError::LookupError(lookup_errors));
        }

        if self.accounts_hash != accounts_hash {
            Err(DecompileError::AccountsHashMismatch {
                expected: Hash::from(self.accounts_hash),
                actual: Hash::from(accounts_hash),
            })
        } else {
            Ok(ValidatedCallback {
                remaining_accounts,
                data: self.data.clone(),
            })
        }
    }
}

/// Error returned by the [`ValidatedCallbackAlt::decompile`].
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum DecompileError {
    /// Contains all the accounts that wasn't resolved.
    #[error("Unable to resolve lookup accounts")]
    LookupError(Vec<ValidatedLookupAccount>),
    #[error("Accounts hash mismatch: expected {expected} found {actual}")]
    AccountsHashMismatch { expected: Hash, actual: Hash },
}

impl From<ValidatedCallback> for ValidatedCallbackAlt {
    fn from(value: ValidatedCallback) -> Self {
        Self {
            accounts_hash: value
                .remaining_accounts
                .iter()
                .fold(Hasher::default(), |mut hasher, x| {
                    hasher.hash(&x.pubkey.to_bytes());
                    hasher
                })
                .result()
                .to_bytes(),
            remaining_accounts: value
                .remaining_accounts
                .into_iter()
                .map(ValidatedRemainingAccountAlt::Plain)
                .collect(),
            data: value.data,
        }
    }
}

impl TryFrom<ValidatedCallbackAlt> for ValidatedCallback {
    type Error = ValidatedCallbackAlt;

    fn try_from(value: ValidatedCallbackAlt) -> std::result::Result<Self, Self::Error> {
        let mut remaining_accounts = Vec::with_capacity(value.remaining_accounts.len());
        for acc in value.remaining_accounts.iter() {
            match acc {
                ValidatedRemainingAccountAlt::Plain(x) => {
                    remaining_accounts.push(ValidatedRemainingAccount {
                        pubkey: x.pubkey,
                        is_writable: x.is_writable,
                    })
                }
                ValidatedRemainingAccountAlt::Lookup(_) => return Err(value),
            }
        }

        Ok(ValidatedCallback {
            remaining_accounts,
            data: value.data,
        })
    }
}

/// See [`Callback`].
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub struct ValidatedCallback {
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

/// A client callback with [Address Lookup Tables][lookup-tables] support.
///
/// This callback type could be handy if callback accounts does not fit into
/// the Solana transaction.
///
/// There are functions added for convenience:
///
/// -   [`CallbackAlt::from_instruction_data`]
/// -   [`CallbackAlt::compile_accounts`]
///
/// [lookup-tables]: https://solana.com/ru/developers/guides/advanced/lookup-tables
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct CallbackAlt {
    /// This hash is used to validate lookup accounts.
    ///
    /// Asserts the order and values of public keys in the [`CallbackAlt::remaining_accounts`].
    accounts_hash: [u8; 32],
    /// Additional accounts to add to the callback CPI call.
    ///
    /// -   the first one will always be the [`Client`] PDA (signer)
    /// -   the second one will always be the client state PDA of the client program (writable)
    /// -   the third one will always be the [`super::network_state::NetworkState`] PDA
    /// -   the fourth one will always be the corresponding [`super::request::RequestAccount`] PDA
    /// -   subsequent accounts will be remaining accounts given here —
    ///     note that writable remaining accounts must be authorized (see [`RemainingAccount::seeds`]).
    remaining_accounts: Vec<RemainingAccountAlt>,
    /// Borsh-serialized instruction data.
    pub data: Vec<u8>,
}

impl CallbackAlt {
    const EMPTY_ACCOUNTS_HASH: [u8; 32] = [
        0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14, 0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9,
        0x24, 0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c, 0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52,
        0xb8, 0x55,
    ];

    /// Creates new callback with no remaining accounts.
    pub fn new(data: Vec<u8>) -> Self {
        Self {
            accounts_hash: Self::EMPTY_ACCOUNTS_HASH,
            remaining_accounts: vec![],
            data,
        }
    }

    /// Creates new callback from the given instruction.
    pub fn from_instruction_data<T: InstructionData>(ix: &T) -> Self {
        Self::new(ix.data())
    }

    /// Compiles remaining accounts for this callback.
    ///
    /// Every account found in a lookup table will be converted to a [`LookupAccount`].
    ///
    /// Note that this function will only search for up to first [`u8::MAX`]
    /// accounts in the first [`u8::MAX`] lookup tables but this does not imply
    /// that the resulting call will be accepted by the network — please consult
    /// Solana documentation on Address Lookup Tables design and limitations.
    ///
    /// Also note that the order of addresses and contents of lookup tables
    /// matters here — VRF will reject the call if there is a mismatch in the
    /// order/values of remaining accounts between the moment of the request
    /// being created and the moment of the callback being called.
    pub fn compile_accounts(
        mut self,
        accounts: Vec<RemainingAccount>,
        lookup_tables: &[AddressLookupTableAccount],
    ) -> Self {
        let mut accounts_hash = Self::EMPTY_ACCOUNTS_HASH;
        let mut remaining_accounts = Vec::with_capacity(accounts.len());

        if !accounts.is_empty() {
            let mut accounts_hasher = Hasher::default();

            compile_accounts(
                accounts,
                lookup_tables,
                &mut accounts_hasher,
                &mut remaining_accounts,
            );

            accounts_hash = accounts_hasher.result().to_bytes();
        };

        self.accounts_hash = accounts_hash;
        self.remaining_accounts = remaining_accounts;
        self
    }

    /// Account hash is used to validate the order and values of remaining accounts
    /// used by the callback.
    ///
    /// This field is calculated an populated by the [`CallbackAlt::compile_accounts`].
    pub fn accounts_hash(&self) -> &[u8; 32] {
        &self.accounts_hash
    }

    /// Getter for the remaining_accounts field.
    ///
    /// This field is calculated an populated by the [`CallbackAlt::compile_accounts`].
    pub fn remaining_accounts(&self) -> &[RemainingAccountAlt] {
        &self.remaining_accounts
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

    /// Specifies the list of remaining accounts (existing list will be replaced).
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

/// Validated [`RemainingAccountAlt`]
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub enum ValidatedRemainingAccountAlt {
    Plain(ValidatedRemainingAccount),
    Lookup(ValidatedLookupAccount),
}

impl ValidatedRemainingAccountAlt {
    pub fn size(&self) -> usize {
        match self {
            ValidatedRemainingAccountAlt::Plain(_) => ValidatedRemainingAccount::SIZE,
            ValidatedRemainingAccountAlt::Lookup(_) => ValidatedLookupAccount::SIZE,
        }
    }
}

/// A callback account definition with Address Lookup Tables support.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub enum RemainingAccountAlt {
    Plain(RemainingAccount),
    Lookup(LookupAccount),
}

impl RemainingAccountAlt {
    pub fn plain(plain: RemainingAccount) -> Self {
        Self::Plain(plain)
    }

    pub fn lookup(lookup: LookupAccount) -> Self {
        Self::Lookup(lookup)
    }
}

/// Validated [`LookupAccount`]
#[derive(Debug, Clone, Copy, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
pub struct ValidatedLookupAccount {
    table_index: u8,
    address_index: u8,
    is_writable: bool,
}

impl ValidatedLookupAccount {
    pub const SIZE: usize = 1 + 1 + 1;

    pub fn table_index(&self) -> u8 {
        self.table_index
    }

    pub fn address_index(&self) -> u8 {
        self.address_index
    }

    pub fn is_writable(&self) -> bool {
        self.is_writable
    }
}

/// Points to an account in a lookup table.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct LookupAccount {
    /// An index of a particular lookup table in the list of lookup tables given
    /// to the [`crate::RequestAlt`] instruction.
    pub table_index: u8,
    /// An index of a particular address in the specified lookup table.
    pub address_index: u8,
    /// This seeds are used to set account as writable.
    ///
    /// -   `None` here means a read-only account
    /// -   empty vector here means arbitrary writable account — this requires
    ///     the account to be given as writable to the corresponding "request"
    ///     or "register" instruction.
    /// -   empty/non-empty vector here means client program PDA — account
    ///     becomes writable if derived address matches
    pub seeds: Option<Vec<Vec<u8>>>,
}

impl LookupAccount {
    pub fn new(table_index: u8, address_index: u8, seeds: Option<Vec<Vec<u8>>>) -> Self {
        Self {
            table_index,
            address_index,
            seeds,
        }
    }
}

/// A callback account definition.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
#[cfg_attr(any(feature = "sdk", test), derive(Debug))]
#[non_exhaustive]
pub struct RemainingAccount {
    /// Account address.
    pub pubkey: Pubkey,
    /// This seeds are used to set account as writable.
    ///
    /// -   `None` here means a read-only account
    /// -   empty vector here means arbitrary writable account — this requires
    ///     the account to be given as writable to the corresponding "request"
    ///     or "register" instruction.
    /// -   empty/non-empty vector here means client program PDA — account
    ///     becomes writable if derived address matches
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

    /// Creates an arbitrary writable account.
    ///
    /// It must be given as writable to the corresponding [`RequestAlt`]/[`Register`]
    /// or [`Register`] instruction.
    ///
    /// [`RequestAlt`]: crate::RequestAlt
    /// [`Register`]: crate::Register
    /// [`Register`]: crate::Register
    pub fn arbitrary_writable(pubkey: Pubkey) -> Self {
        Self {
            pubkey,
            seeds: Some(Vec::new()),
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
}

/// Validated [`RemainingAccount`].
#[derive(Debug, Clone, Copy, AnchorSerialize, AnchorDeserialize, Eq, PartialEq)]
#[cfg_attr(feature = "sdk", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
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

/// A helper to compile lookup remaining accounts.
fn compile_accounts(
    accounts: Vec<RemainingAccount>,
    lookup_tables: &[AddressLookupTableAccount],
    accounts_hash: &mut Hasher,
    remaining_accounts: &mut Vec<RemainingAccountAlt>,
) {
    'top: for account in accounts {
        accounts_hash.hash(&account.pubkey.to_bytes());
        for (table_index, table) in lookup_tables.iter().take(u8::MAX as usize).enumerate() {
            for (address_index, address) in
                table.addresses.iter().take(u8::MAX as usize).enumerate()
            {
                if address == &account.pubkey {
                    remaining_accounts.push(RemainingAccountAlt::lookup(LookupAccount::new(
                        table_index as u8,
                        address_index as u8,
                        account.seeds,
                    )));
                    continue 'top;
                }
            }
        }

        remaining_accounts.push(RemainingAccountAlt::Plain(account));
    }
}
