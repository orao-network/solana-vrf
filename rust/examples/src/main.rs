use orao_solana_vrf::{Network, Randomness, RandomnessStatus, VrfRequestor};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
  pubkey::Pubkey,
  signer::{keypair::Keypair, Signer},
};

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
  loop {
    let randomness = requestor.get_randomness(seed).unwrap();
    if randomness.status == RandomnessStatus::Fulfilled {
      return randomness;
    }
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
  println!("Please wait while we are requesting a new randomness...");
  let requestor = VrfRequestor::new(Network::Devnet).unwrap();
  requestor.request_randomness(&payer, &random_seed).unwrap();

  let randomness = get_fulfilled_randomness(&requestor, &random_seed);
  println!("Fetched randomness! {:?}", randomness);
}
