use orao_solana_vrf::{Network, Randomness, RandomnessStatus, VrfRequestor};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
  pubkey::Pubkey,
  signer::{keypair::Keypair, Signer},
};
use std::{thread, time};

fn airdrop_sol_to_payer(payer: &Keypair, sols: u64) {
  println!("Airdropping {} SOL to {}", sols, payer.pubkey());
  // Creates a new Faucet Keypair
  let rpc_client = RpcClient::new("https://api.devnet.solana.com");
  let blockhash = rpc_client.get_latest_blockhash().unwrap();
  // Request airdrop SOL
  let signature = rpc_client
    .request_airdrop_with_blockhash(
      &payer.pubkey(),
      sols * 1_000_000_000,
      &blockhash,
    )
    .unwrap();
  // Wait for airdrop to be confirmed
  rpc_client
    .confirm_transaction_with_spinner(
      &signature,
      &blockhash,
      rpc_client.commitment(),
    )
    .unwrap();
  println!("Airdropped {} SOL to {}", sols, payer.pubkey());
}

fn get_fulfilled_randomness(
  requestor: &VrfRequestor,
  seed: &Pubkey,
) -> Randomness {
  let mut err_count = 0;
  loop {
    if err_count > 5 {
      panic!("Unable to retrieve randomness for seed {:?}", seed);
    }
    match requestor.get_randomness(seed) {
      Ok(randomness) => {
        if randomness.status == RandomnessStatus::Fulfilled {
          return randomness;
        }
      }
      Err(_) => {
        err_count += 1;
      }
    }
  }
}

fn verify_randomness_loop(
  requestor: &VrfRequestor,
  seed: &Pubkey,
  randomness: &Randomness,
) {
  let mut attempts = 0;
  while attempts < 5 {
    // Sleep for 10 secs, in case there are issues with devnet
    let ten_secs = time::Duration::from_secs(10);
    thread::sleep(ten_secs);

    if let Err(err) = requestor.verify_randomness_offchain(&seed, randomness) {
      println!("Unable to verify signature due to {:?}", err);
      attempts += 1;
      continue;
    }
    println!("Randomness verified!");
    break;
  }
}

fn main() {
  // Generate new keypair and airdrop SOL to this account
  let payer = Keypair::new();
  println!("Created new payer address: {:?}", payer.pubkey());
  airdrop_sol_to_payer(&payer, 2);

  // OR use another account with SOL balance (MUST have some SOL!)
  // let payer2 = Keypair::from_bytes(&[
  //
  // ]).unwrap();

  // Generate a random seed.
  let random_seed = Keypair::new().pubkey();
  println!("Random Seed: {}", random_seed);

  // Request a VRF Randomness!
  println!("Please wait while we request new randomness...");
  let requestor = VrfRequestor::new(Network::Devnet).unwrap();
  requestor.request_randomness(&payer, &random_seed).unwrap();

  let randomness = get_fulfilled_randomness(&requestor, &random_seed);
  println!("");
  println!("Fetched randomness! {:?}", randomness);

  // (Optional) Verify randomness offchain
  verify_randomness_loop(&requestor, &random_seed, &randomness);
}
