# ORAO Solana VRF — Rust SDK

[`orao-solana-vrf`](https://crates.io/crates/orao-solana-vrf) is the Rust SDK for
[ORAO VRF](https://orao.network), a verifiable random function (VRF) oracle on Solana:
provably fair, unbiased on-chain randomness for games, NFT mints, raffles, lotteries and
GambleFi programs. The crate ships an async off-chain client (request randomness and await
its fulfillment) and the Anchor CPI bindings for requesting randomness from your own program.

Program ID (devnet and mainnet): `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y`

- API docs: <https://docs.rs/orao-solana-vrf>
- Getting started, CPI walkthrough and recipes: <https://github.com/orao-network/solana-vrf>
- Off-chain example: [`rust/examples/off-chain`](https://github.com/orao-network/solana-vrf/tree/master/rust/examples/off-chain)
- CPI example (Russian Roulette): [`rust/examples/cpi`](https://github.com/orao-network/solana-vrf/tree/master/rust/examples/cpi)
- Need the randomness delivered into your program by a callback? See
  [`orao-solana-vrf-cb`](https://crates.io/crates/orao-solana-vrf-cb).

## Usage

```toml
# Cargo.toml
[dependencies]
# Off-chain client: `sdk` feature on the `solana-v4` crate cohort (both default)
orao-solana-vrf = "0.8.1"
# Off-chain client on Anchor 1.2's default `solana-v3` cohort:
# orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["sdk", "solana-v3"] }
# On-chain CPI from an Anchor program (follows the cohort of your `anchor-lang`):
# orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["cpi"] }
```

```rust
use anchor_client::{Client, Cluster, CommitmentConfig};
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
- `solana-v4` (default) / `solana-v3` — the Solana crate cohort, mirroring the features of
  `anchor-lang` 1.2. Enable exactly the one your project uses: `sdk` needs it named, `cpi`
  alone follows the cohort your program enables on `anchor-lang`.
- `no-idl`, `no-log-ix-name`, `idl-build` — build-tuning flags.
