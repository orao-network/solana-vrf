#![cfg(feature = "sdk")]

use anchor_client::{
    solana_client::client_error::{ClientError, ClientErrorKind},
    solana_sdk::{
        ed25519_instruction,
        signature::{Keypair, Signature},
        signer::Signer,
        sysvar,
    },
};
use anchor_lang::{
    prelude::{AccountMeta, Pubkey},
    system_program,
};
use anchor_spl::token;

use crate::{
    network_state_account_address, quorum, randomness_account_address,
    state::{NetworkConfiguration, NetworkState, OraoTokenFeeConfig, Randomness},
    xor_array,
};

use std::ops::Deref;

/// Fetches VRF on-chain state.
///
/// ```no_run
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// use anchor_client::*;
///
/// # let payer: std::rc::Rc<solana_sdk::signer::keypair::Keypair> = panic!();
/// let client = Client::new(Cluster::Devnet, payer);
/// let program = client.program(orao_solana_vrf::id()).expect("unable to get a program");
///
/// let network_state = orao_solana_vrf::get_network_state(&program)?;
///
/// println!("The tresury is {}", network_state.config.treasury);
/// # Ok(()) }
/// ```
pub fn get_network_state<C: Deref<Target = impl Signer> + Clone>(
    orao_vrf: &anchor_client::Program<C>,
) -> Result<NetworkState, anchor_client::ClientError> {
    let network_state_address = network_state_account_address();
    orao_vrf.account(network_state_address)
}

/// Fetches randomness request state for the given seed.
///
/// ```no_run
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// use anchor_client::*;
///
/// # let payer: std::rc::Rc<solana_sdk::signer::keypair::Keypair> = panic!();
/// # let seed: [u8; 32] = panic!();
/// let client = Client::new(Cluster::Devnet, payer);
/// let program = client.program(orao_solana_vrf::id()).expect("unable to get a program");
///
/// let randomness_account = orao_solana_vrf::get_randomness(&program, &seed)?;
///
/// if let Some(randomness) = randomness_account.fulfilled() {
///     println!("Randomness fulfilled: {:?}", randomness);
/// } else {
///     println!("Randomness is not yet fulfilled");
/// }
/// # Ok(()) }
/// ```
pub fn get_randomness<C: Deref<Target = impl Signer> + Clone>(
    orao_vrf: &anchor_client::Program<C>,
    seed: &[u8; 32],
) -> Result<Randomness, anchor_client::ClientError> {
    let request_address = randomness_account_address(seed);
    orao_vrf.account(request_address)
}

/// `init_network` instruction builder.
#[derive(Debug)]
pub struct InitBuilder {
    config: NetworkConfiguration,
}

impl InitBuilder {
    /// Creates a new builder.
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
        }
    }

    /// Change token fee configuration.
    pub fn with_token_fee_config(mut self, token_fee_config: OraoTokenFeeConfig) -> Self {
        self.config.token_fee_config = Some(token_fee_config);
        self
    }

    /// Builds the request.
    pub fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let network_state_address = network_state_account_address();

        let builder = orao_vrf
            .request()
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

/// `update_network` instruction builder.
#[derive(Debug, Default)]
pub struct UpdateBuilder {
    authority: Option<Pubkey>,
    treasury: Option<Pubkey>,
    request_fee: Option<u64>,
    fulfillment_authorities: Option<Vec<Pubkey>>,
    token_fee_config: Option<Option<OraoTokenFeeConfig>>,
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

    /// Change threasury account address.
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

    /// Builds the request.
    pub fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let network_state_address = network_state_account_address();
        let network_state: NetworkState = orao_vrf.account(network_state_address)?;
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

        let builder = orao_vrf
            .request()
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

/// `request` instruction builder.
///
/// ```no_run
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// use anchor_client::*;
///
/// # let payer: std::rc::Rc<solana_sdk::signer::keypair::Keypair> = panic!();
/// let client = Client::new(Cluster::Devnet, payer);
/// let program = client.program(orao_solana_vrf::id()).expect("unable to get a program");
///
/// let seed = rand::random();
/// let tx = orao_solana_vrf::RequestBuilder::new(seed)
///     .build(&program)?
///     .send()?;
///
/// println!("Your transaction is {}", tx);
/// # Ok(()) }
/// ```
#[derive(Debug, Default)]
pub struct RequestBuilder {
    seed: [u8; 32],
    token_wallet: Option<Pubkey>,
}

impl RequestBuilder {
    /// Creates a new builder with the given seed. Fees are paid with lamports by default.
    pub fn new(seed: [u8; 32]) -> Self {
        Self {
            seed,
            token_wallet: None,
        }
    }

    /// Pay fees with SPL token using given token wallet address.
    ///
    /// Instruction could fail if token fee is not configured for the contract.
    pub fn pay_with_token(mut self, token_wallet: Pubkey) -> Self {
        self.token_wallet = Some(token_wallet);
        self
    }

    /// Builds the request.
    pub fn build<C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &anchor_client::Program<C>,
    ) -> Result<anchor_client::RequestBuilder<C>, anchor_client::ClientError> {
        let network_state_address = network_state_account_address();
        let request_address = randomness_account_address(&self.seed);

        let network_state: NetworkState = orao_vrf.account(network_state_address)?;
        let config = network_state.config;

        let (treasury, remaining_accounts) = if let Some(token_wallet) = self.token_wallet {
            let token_fee_config = config.token_fee_config.ok_or_else(|| {
                ClientError::from(ClientErrorKind::Custom(format!(
                    "Token fee is not configured for the given VRF instance"
                )))
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

        Ok(orao_vrf
            .request()
            .accounts(crate::accounts::Request {
                payer: orao_vrf.payer(),
                network_state: network_state_address,
                treasury,
                request: request_address,
                system_program: system_program::ID,
            })
            .args(crate::instruction::Request { seed: self.seed })
            .accounts(remaining_accounts))
    }
}

/// `fulfill` instruction builder.
#[derive(Debug, Default)]
pub struct FulfillBuilder {
    seed: [u8; 32],
}

impl FulfillBuilder {
    /// Creates a new builder for the given seed.
    pub fn new(seed: [u8; 32]) -> Self {
        Self { seed }
    }

    /// Builds the request.
    pub fn build<'a, C: Deref<Target = impl Signer> + Clone>(
        self,
        orao_vrf: &'a anchor_client::Program<C>,
        fullfill_authority: &Keypair,
    ) -> anchor_client::RequestBuilder<'a, C> {
        let network_state_address = network_state_account_address();
        let request_address = randomness_account_address(&self.seed);

        let fullfill_authority =
            ed25519_dalek::Keypair::from_bytes(fullfill_authority.to_bytes().as_ref()).unwrap();

        orao_vrf
            .request()
            .instruction(ed25519_instruction::new_ed25519_instruction(
                &fullfill_authority,
                &self.seed,
            ))
            .accounts(crate::accounts::Fulfill {
                payer: orao_vrf.payer(),
                network_state: network_state_address,
                instruction_acc: sysvar::instructions::ID,
                request: request_address,
            })
            .args(crate::instruction::Fulfill)
    }
}

impl Randomness {
    /// Performs offchain verification against the effective list of fulfillment authorities.
    pub fn verify_offchain(&self, fulfullment_authorities: &[Pubkey]) -> bool {
        if !quorum(self.responses.len(), fulfullment_authorities.len()) {
            return false;
        }

        let mut expected_randomness = [0_u8; 64];
        for response in self.responses.iter() {
            if !fulfullment_authorities.contains(&response.pubkey) {
                return false;
            }

            let sig = Signature::from(response.randomness);

            if !sig.verify(response.pubkey.as_ref(), &self.seed) {
                return false;
            }

            xor_array(&mut expected_randomness, &response.randomness);
        }

        expected_randomness == self.randomness
    }
}
