# ORAO Solana VRF — Rust SDK

Rust crate to interact with the [`orao-vrf`](https://crates.io/crates/orao-solana-vrf) program
on Solana. Provides off-chain helpers to request verifiable randomness (Ed25519 signature) and
on-chain CPI bindings.

- API docs: <https://docs.rs/orao-solana-vrf>
- Off-chain example: [`../examples/off-chain`](../examples/off-chain)
- CPI example: [`../examples/cpi`](../examples/cpi)

## Usage

```toml
# Cargo.toml
[dependencies]
# Off-chain client (default `sdk` feature)
orao-solana-vrf = "0.7"
# Or, for on-chain CPI in an Anchor program:
# orao-solana-vrf = { version = "0.7", default-features = false, features = ["cpi"] }
```

```rust
use anchor_client::{Client, Cluster, solana_sdk::commitment_config::CommitmentConfig};
use orao_solana_vrf::{wait_fulfilled, RequestBuilder};
use std::sync::Arc;

let payer = Arc::new(payer_keypair);
let client = Client::new_with_options(Cluster::Devnet, payer, CommitmentConfig::confirmed());
let program = Arc::new(client.program(orao_solana_vrf::id())?);

let seed: [u8; 32] = rand::random();
let fulfilled = wait_fulfilled(seed, program.clone()).await;

RequestBuilder::new(seed).build(&program).await?.send().await?;

let randomness = fulfilled.await?;
```

## Features

- `sdk` (default) — async off-chain client (`anchor-client`, tokio).
- `cpi` — on-chain CPI bindings only, no entrypoint.
- `no-idl`, `no-log-ix-name`, `idl-build` — build-tuning flags.
