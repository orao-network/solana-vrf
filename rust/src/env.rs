use crate::error::Error;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

/// Public key of contracts
const DEVNET_ID: &str = "VRFS1BUivo8SDWKjsx3TVW976LXvpB1fFwTf6hGutbJ";
const MAINNET_ID: &str = "VRFbts7MNgJGfc4ZznJAshGGwdJz2xcUgMhv6FJmYJR";

/// Environment variables used commonly throughout
pub struct Env {
  /// Public key of program
  pub vrf_program: Pubkey,
  // Seed used to generate randomness
  pub randomness_account_seed: String,
  // Seed used for configuration,
  pub config_account_seed: String,
}

impl Env {
  pub fn new(network: &Network) -> Self {
    let contract_id = match network {
      Network::Devnet => DEVNET_ID,
      Network::Mainnet => MAINNET_ID,
    };
    Self {
      vrf_program: Pubkey::from_str(contract_id).unwrap(),
      randomness_account_seed: "orao-vrf-randomness-request".to_string(),
      config_account_seed: "orao-vrf-network-configuration".to_string(),
    }
  }

  pub fn find_config_account_address(&self) -> Pubkey {
    Pubkey::find_program_address(&[self.config_account_seed.as_bytes()], &self.vrf_program)
      .0
  }

  pub fn find_randomness_request_account(&self, seed: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[self.randomness_account_seed.as_bytes(), seed], &self.vrf_program).0
  }
}

/// Types of Solana clusters
#[derive(Debug, PartialEq, Eq, Clone)]
pub enum Network {
  /// Devnet. RPC url is "https://api.devnet.solana.com"
  Devnet,
  /// Mainnet. RPC url is "https://api.mainnet-beta.solana.com"
  Mainnet,
}

impl Network {
  pub fn rpc_url(&self) -> String {
    let url = match self {
      Self::Devnet => "https://api.devnet.solana.com",
      Self::Mainnet => "https://api.mainnet-beta.solana.com",
    };
    url.to_string()
  }
}
