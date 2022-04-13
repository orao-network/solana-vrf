//! This crate provides interface to request for a verifiable randomness (ED25519 64 bytes Signature) from orao vrf contract on the Solana blockchain.
//! Given 32 bytes random seed and a payer `Keypair`, randomness can be generated and confirmed in minutes!
//!
//! ## Usage
//!
//! Do note that `Keypair` provided must have sufficient SOL to pay for transaction fees. That's really all you need!
//! ```
//! use orao_solana_vrf::{VrfRequestor, Network};
//! use solana_sdk::{signature::Keypair};
//!
//! // Declare payer here.
//! let payer = Keypair::from_bytes(vec![]);
//! let random_seed = Keypair::new().pubkey();
//!
//! // Generate Randomness.
//! let requestor = VrfRequestor::new(Network::Devnet).unwrap();
//! requestor.request_randomness(&payer, &random_seed).unwrap();
//! let randomness = requestor.get_randomness(&randomness);
//!
//! ```
mod env;
mod error;
mod instructions;
mod state;

use env::Env;

pub use env::Network;
pub use error::Error;
use log::info;
use instructions::VrfInstruction;
//use orao_vrf::instructions::VrfInstruction;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
  pubkey::Pubkey, signature::Keypair, signer::Signer, transaction::Transaction,
};
use state::decode_treasury_acc_from_config;
pub use state::{Randomness, RandomnessStatus};

/// VrfRequestor encapsulates logic to request randomness from orao vrf contract on the Solana blockchain.
///
/// Provides functions to query and create `Randomness`
///
/// # Example
///
/// ```
/// use orao_solana_vrf::{VrfRequestor, Network};
/// use solana_sdk::{signature::Keypair};
///
/// // Declare payer here.
/// let payer = Keypair::from_bytes(vec![]);
/// let random_seed = Keypair::new().pubkey();
///
/// // Generate Randomness.
/// let requestor = VrfRequestor::new(Network::Devnet).unwrap();
/// requestor.request_randomness(&payer, &random_seed).unwrap();
/// let randomness = requestor.get_randomness(&randomness);
///
/// ```
///
pub struct VrfRequestor {
  rpc_client: RpcClient,
  env: Env,
}

impl VrfRequestor {
  /// Create an instance of VrfRequestor
  ///
  /// ```
  /// use orao_solana_vrf::{VrfRequestor, Network};
  /// use solana_sdk::{signature::Keypair};
  ///
  /// // Declare payer here.
  /// let payer = Keypair::from_bytes(vec![]);
  /// let random_seed = Keypair::new().pubkey();
  ///
  /// // Generate Randomness.
  /// let requestor = VrfRequestor::new(Network::Devnet).unwrap();
  /// ```
  pub fn new(network: Network) -> Result<Self, Error> {
    // Default environment
    let env = Env::new(&network);
    let rpc_client = RpcClient::new(network.rpc_url());
    Ok(Self { env, rpc_client })
  }

  /// Retrieve randomness associated with seed from the chain.
  ///
  /// Returns `Randomness` that were generated with the seed passed from chain. Otherwise,
  /// returns `Error::SolanaClientError` if seed is unused.
  ///
  pub fn get_randomness(&self, seed: &Pubkey) -> Result<Randomness, Error> {
    self.get_randomness_account(seed)
  }

  /// Request for a Randomness with associated seed on chain.
  ///
  /// Given an unseen seed and payer's public key, it submits a `Transaction` with instruction to
  /// request for randomess on chain. Payer's acount must have sufficient SOL to pay for transaction fees.
  /// In this case, this will be a long running operation as it waits for transaction submitted to be
  /// confirmed on chain.
  ///
  /// If seed has been used, it will do nothing.
  ///
  pub fn request_randomness(
    &self,
    payer: &Keypair,
    seed: &Pubkey,
  ) -> Result<(), Error> {
    if let Err(_) = self.get_randomness_account(seed) {
      let tx = self.build_randomness_request_tx(seed, payer)?;
      let _ = self.rpc_client.send_and_confirm_transaction(&tx)?;
    } else {
      info!("Randomness exists!");
    }
    Ok(())
  }

  fn build_randomness_request_tx(
    &self,
    seed: &Pubkey,
    payer: &Keypair,
  ) -> Result<Transaction, Error> {
    // Get the config account
    let (config_address, _) = Pubkey::find_program_address(
      &[self.env.config_account_seed.as_bytes()],
      &self.env.vrf_program,
    );
    let config_account_data =
      self.rpc_client.get_account_data(&config_address)?;

    // Extract treasury address from config data.
    let treasury_address =
      decode_treasury_acc_from_config(&config_account_data)?;

    // Build instruction for vrf request
    let instruction = VrfInstruction::request(
      &self.env,
      &payer.pubkey(),
      &treasury_address,
      seed.to_bytes(),
    )?;

    let recent_blockhash = self.rpc_client.get_latest_blockhash()?;
    let tx = Transaction::new_signed_with_payer(
      &[instruction],
      Some(&payer.pubkey()),
      &[payer],
      recent_blockhash,
    );
    Ok(tx)
  }

  fn get_randomness_account(
    &self,
    seed_pubkey: &Pubkey,
  ) -> Result<Randomness, Error> {
    let randomness_address = derive_randomness_address(
      &seed_pubkey.to_bytes(),
      self.env.randomness_account_seed.as_str(),
      &self.env.vrf_program,
    );
    let randomness_account =
      self.rpc_client.get_account(&randomness_address)?;
    Randomness::decode_from_bytes(&randomness_account.data)
  }
}

fn derive_randomness_address(
  seed: &[u8],
  prefix_seed: &str,
  program: &Pubkey,
) -> Pubkey {
  let (public_key, _) =
    Pubkey::find_program_address(&[prefix_seed.as_bytes(), seed], program);
  return public_key;
}

