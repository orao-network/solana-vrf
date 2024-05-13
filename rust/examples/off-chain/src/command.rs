use clap::Parser;
use once_cell::sync::Lazy;

static DEFAULT_RPC_ENDPOINT: Lazy<String> = Lazy::new(|| {
    if let Some(config_file) = solana_cli_config::CONFIG_FILE.as_ref() {
        if let Ok(config) = solana_cli_config::Config::load(config_file) {
            return config.json_rpc_url;
        }
    }
    Default::default()
});

/// ORAO Solana VRF offchain demo app
#[derive(Debug, Parser)]
pub struct CliOpts {
    #[arg(
        short, long,
        global = true,
        default_value = &*DEFAULT_RPC_ENDPOINT)
    ]
    rpc: Option<String>,
}

impl CliOpts {
    pub fn rpc_url(&self) -> String {
        let mut rpc = self.rpc.clone().unwrap_or_default();

        if rpc.is_empty() {
            println!(
                "The --rpc option was not specified using public Solana Devnet RPC node. Transactions may be slow."
            );
            rpc = crate::CLUSTER.to_string();
        }

        rpc
    }
}
