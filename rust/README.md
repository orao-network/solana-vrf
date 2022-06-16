# VRF Rust SDK

Crate to interact with `orao-vrf-solana` smart contract on Solana network.

Provides interface to request for a verifiable randomness (ED25519 Signature) on the Solana network.

## Usage example - Rust Native

```rust
use orao_solana_vrf::{VrfRequestor, Network};
use solana_sdk::{signature::Keypair};

// Declare payer here.
let payer = Keypair::from_bytes(vec![]);
let random_seed = Keypair::new().pubkey();

// Request Randomness.
let requestor = VrfRequestor::new(Network::Devnet).unwrap();
requestor.request_randomness(&payer, &random_seed).unwrap();
let randomness = requestor.get_randomness(&randomness);
```

## Cross-Program-Invocation (CPI) example
Browse through the [cpi-example](https://github.com/orao-network/solana-vrf/tree/master/rust/cpi-example) for more info