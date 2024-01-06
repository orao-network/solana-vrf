use std::{rc::Rc, time::Duration};

use anchor_client::{
    solana_client::rpc_config::RpcSendTransactionConfig,
    solana_sdk::{
        bs58, commitment_config::CommitmentConfig, native_token::LAMPORTS_PER_SOL,
        signature::read_keypair_file, signer::keypair::Keypair, signer::Signer,
    },
    Client, Cluster, Program,
};
use anchor_lang::prelude::Pubkey;
use indicatif::ProgressBar;
use orao_solana_vrf::{
    state::{NetworkState, Randomness},
    RequestBuilder,
};
use solana_cli_config::{Config, CONFIG_FILE};

use std::ops::Deref;
//use std::rc::Rc;

// Replace this one with the desired network.
const CLUSTER: Cluster = Cluster::Devnet;

pub fn main() -> std::io::Result<()> {
    let (payer, program) = get_program();

    // We'll use this seed for the randomness request.
    let seed = rand::random();

    println!("Requesting airdrop..");
    request_airdrop(&program, &payer);

    println!(
        "Requesting randomness for seed {}..",
        bs58::encode(&seed).into_string()
    );
    let tx = RequestBuilder::new(seed)
        .build(&program)
        .expect("Randomness request")
        .send_with_spinner_and_config(RpcSendTransactionConfig::default())
        .expect("Transaction hash");
    println!("Request performed in {}", tx);

    let randomness = wait_fulfilled(&program, &seed);
    println!(
        "Randomness: {}",
        bs58::encode(&randomness.randomness).into_string()
    );

    // Let's verify offchain. We'll need the effective VRF configuration for this.
    let config = program
        .account::<NetworkState>(orao_solana_vrf::network_state_account_address())
        .expect("Network configuration")
        .config;
    let result = randomness.verify_offchain(&config.fulfillment_authorities);

    println!("Verified: {}", result);

    Ok(())
}

fn request_airdrop<C: Deref<Target = impl Signer> + Clone>(program: &Program<C>, pubkey: &Pubkey) {
    let latest_blockhash = program
        .rpc()
        .get_latest_blockhash()
        .expect("Latest blockhash");
    let signature = program
        .rpc()
        .request_airdrop_with_blockhash(&pubkey, 2 * LAMPORTS_PER_SOL, &latest_blockhash)
        .expect("Airdrop tx");
    program
        .rpc()
        .confirm_transaction_with_spinner(
            &signature,
            &latest_blockhash,
            CommitmentConfig::finalized(),
        )
        .expect("Airdrop");
}

/// This helper will create the program client. It'll panic on error to simplify the code.
///
/// Returns payer public key and the [`Program`] instance.
fn get_program() -> (Pubkey, Program<Rc<Keypair>>) {
    let config_file = CONFIG_FILE
        .as_ref()
        .expect("unable to get config file path");
    let cli_config = Config::load(&config_file).expect("Unable to load solana configuration");
    let payer =
        read_keypair_file(&cli_config.keypair_path).expect("Example requires a keypair file");
    let payer_pubkey = payer.pubkey();

    let client = Client::new_with_options(CLUSTER, Rc::new(payer), CommitmentConfig::finalized());
    let program = client
        .program(orao_solana_vrf::id())
        .expect("unable to get a program");

    (payer_pubkey, program)
}

/// This helper will loop until randomness gets fulfilled.
pub fn wait_fulfilled<C: Deref<Target = impl Signer> + Clone>(
    program: &Program<C>,
    seed: &[u8; 32],
) -> Randomness {
    let progress = ProgressBar::new_spinner();
    progress.enable_steady_tick(std::time::Duration::from_millis(120));
    progress.set_message("Waiting for randomness being fulfilled..");
    let randomness_address = orao_solana_vrf::randomness_account_address(&seed);
    loop {
        match program.account::<Randomness>(randomness_address) {
            Ok(randomness) if randomness.fulfilled().is_some() => break randomness,
            _ => {
                std::thread::sleep(Duration::from_secs(1));
                continue;
            }
        }
    }
}
