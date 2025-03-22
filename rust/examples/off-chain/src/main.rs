mod command;

use std::{str::FromStr, sync::Arc};

use anchor_client::{
    solana_client::rpc_config::RpcSendTransactionConfig,
    solana_sdk::{
        bs58,
        commitment_config::{CommitmentConfig, CommitmentLevel},
        native_token::LAMPORTS_PER_SOL,
        signature::read_keypair_file,
        signer::{keypair::Keypair, Signer},
    },
    Client, Cluster, Program,
};
use anchor_lang::prelude::Pubkey;
use orao_solana_vrf::{wait_fulfilled, RequestBuilder};
use solana_cli_config::{Config, CONFIG_FILE};

use crate::command::CliOpts;
use clap::Parser;
use std::ops::Deref;

// Replace this one with the desired network.
const CLUSTER: Cluster = Cluster::Devnet;

#[tokio::main]
pub async fn main() -> std::io::Result<()> {
    let opts = CliOpts::parse();
    let rpc_url = opts.rpc_url();
    let (payer, program) = get_program(rpc_url);
    println!("using rpc endpoint: {}", opts.rpc_url()); //using opts.rpc_url again to workaround a bug with error "Value borrowed here after move"

    let balance = program
        .rpc()
        .get_balance(&payer)
        .await
        .expect("Unable to get balance");

    //this should never be used on mainnet and will panic if mainnet?
    if balance == 0 {
        println!("Requesting airdrop..");
        request_airdrop(&program, &payer).await;
    }

    // we are ready to perform the request, so let's first generate a random seed
    let seed = rand::random();

    // now let's spawn a listener that gets resolved as soon as our request is fulfilled
    let fulfilled = wait_fulfilled(seed, program.clone()).await;

    println!(
        "Requesting randomness for seed {}..",
        bs58::encode(&seed).into_string()
    );

    let tx = RequestBuilder::new(seed)
        .build(&program)
        .await
        .expect("Randomness request")
        .send_with_spinner_and_config(RpcSendTransactionConfig {
            preflight_commitment: Some(CommitmentLevel::Confirmed),
            ..Default::default()
        })
        .await
        .expect("Transaction hash");

    println!("Request performed in {}", tx);

    // now let's wait for the randomness
    let Ok(randomness) = fulfilled.await else {
        panic!("Fulfill listener has unexpectedly died");
    };

    println!(
        "Fulfilled randomness: {}",
        bs58::encode(&randomness).into_string()
    );

    println!("---");

    Ok(())
}

async fn request_airdrop<C: Deref<Target = impl Signer> + Clone>(
    program: &Program<C>,
    pubkey: &Pubkey,
) {
    let latest_blockhash = program
        .rpc()
        .get_latest_blockhash()
        .await
        .expect("Latest blockhash");
    let signature = program
        .rpc()
        .request_airdrop_with_blockhash(pubkey, LAMPORTS_PER_SOL, &latest_blockhash)
        .await
        .expect("Airdrop tx");
    program
        .rpc()
        .confirm_transaction_with_spinner(
            &signature,
            &latest_blockhash,
            CommitmentConfig::confirmed(),
        )
        .await
        .expect("Airdrop");
}

/// This helper will create the program client. It'll panic on error to simplify the code.
///
/// Returns payer public key and the [`Program`] instance.
fn get_program(rpc_url: String) -> (Pubkey, Arc<Program<Arc<Keypair>>>) {
    let config_file = CONFIG_FILE
        .as_ref()
        .expect("unable to get config file path");
    let cli_config = Config::load(config_file).expect("Unable to load solana configuration");
    let payer =
        read_keypair_file(&cli_config.keypair_path).expect("Example requires a keypair file");
    let payer_pubkey = payer.pubkey();
    let cluster_rpc_url = Cluster::from_str(rpc_url.as_str()).expect("bad cluster url");
    let client = Client::new_with_options(
        cluster_rpc_url,
        Arc::new(payer),
        CommitmentConfig::confirmed(),
    );
    let program = client
        .program(orao_solana_vrf::id())
        .expect("unable to get a program");

    (payer_pubkey, Arc::new(program))
}
