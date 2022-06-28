use solana_program::pubkey::Pubkey;
use std::str::FromStr;

const DEVNET_RPC: &str = "https://api.devnet.solana.com";
const MAINNET_RPC: &str = "https://api.mainnet-beta.solana.com";

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
            Network::Other { vrf_id, .. } => &*vrf_id,
        };
        Self {
            vrf_program: Pubkey::from_str(contract_id).unwrap(),
            randomness_account_seed: "orao-vrf-randomness-request".to_string(),
            config_account_seed: "orao-vrf-network-configuration".to_string(),
        }
    }

    pub fn find_config_account_address(&self) -> Pubkey {
        Pubkey::find_program_address(&[self.config_account_seed.as_bytes()], &self.vrf_program).0
    }

    pub fn find_randomness_request_account(&self, seed: &[u8; 32]) -> Pubkey {
        Pubkey::find_program_address(
            &[self.randomness_account_seed.as_bytes(), seed],
            &self.vrf_program,
        )
        .0
    }
}

/// Types of Solana clusters
#[derive(Debug, PartialEq, Eq, Clone)]
pub enum Network {
    /// Devnet. RPC url is "https://api.devnet.solana.com"
    Devnet,
    /// Mainnet. RPC url is "https://api.mainnet-beta.solana.com"
    Mainnet,
    /// Other network.
    Other { rpc_url: String, vrf_id: String },
}

impl Network {
    pub fn rpc_url(&self) -> &str {
        match self {
            Self::Devnet => DEVNET_RPC,
            Self::Mainnet => MAINNET_RPC,
            Self::Other { rpc_url, .. } => rpc_url,
        }
    }

    pub fn from_rpc(rpc_url: String, vrf_id: Option<String>) -> Self {
        if let Some(vrf_id) = vrf_id {
            Self::Other { rpc_url, vrf_id }
        } else {
            if rpc_url == DEVNET_RPC {
                Self::Devnet
            } else if rpc_url == MAINNET_ID {
                Self::Mainnet
            } else {
                panic!("unknown vrf id for the given network")
            }
        }
    }
}
