extern crate orao_solana_vrf;

use orao_solana_vrf::{Network, VrfRequestor};
use solana_sdk::signature::{Keypair, Signer};

fn main() {
  let requestor = VrfRequestor::new(Network::Devnet).unwrap();

  // Generate a random seed.
  let random_seed = Keypair::new().pubkey();
  println!("Random seed is: {}", random_seed);

  // Using an account that is authorized to request randomness.
  let payer = Keypair::from_bytes(&[
    191, 69, 141, 221, 143, 172, 187, 112, 166, 187, 106, 118, 52, 226, 218,
    205, 42, 71, 223, 50, 173, 116, 119, 5, 24, 68, 233, 9, 165, 133, 132, 179,
    22, 9, 56, 134, 48, 255, 91, 50, 91, 100, 234, 229, 1, 85, 222, 13, 136,
    140, 147, 52, 139, 118, 42, 145, 105, 28, 180, 197, 75, 12, 124, 228,
  ])
  .unwrap();

  // Should get RandomnessRequest::Pending if it is random seed is unused
  // Otherwise, it will be Randomness::Fulfilled.
  requestor.request_randomness(&payer, &random_seed).unwrap();
  let randomness = requestor.get_randomness(&random_seed).unwrap();
  println!("Requested Randomness: {:?}", randomness);
}
