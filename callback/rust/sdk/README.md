# ORAO Solana VRF Callback — Rust SDK

Rust crate to interact with the [`orao-vrf-cb`](https://crates.io/crates/orao-solana-vrf-cb)
program on Solana. The Callback VRF is intended for on-chain usage — randomness requests are
made via CPI by a registered client program and a client-defined callback instruction is
invoked once randomness is fulfilled.

- API docs: <https://docs.rs/orao-solana-vrf-cb>
- Full integration guide: [`../../README.md`](../../README.md)
- CPI example client: [`../examples/cpi`](../examples/cpi)

## Off-chain usage

The off-chain SDK is useful for tooling and infrastructure around a deployed client (e.g. for
registering, funding, withdrawing, or inspecting clients). Most flows look like this:

```toml
# Cargo.toml
[dependencies]
orao-solana-vrf-cb = "0.3"
```

```rust
use anchor_client::{Client, Cluster, solana_sdk::commitment_config::CommitmentConfig};
use orao_solana_vrf_cb::sdk::{RegisterBuilder, WithdrawBuilder, client_balance};

let provider = Client::new_with_options(Cluster::Devnet, payer, CommitmentConfig::confirmed());
let vrf = provider.program(orao_solana_vrf_cb::id())?;

// Register a client program (signer must be the client program's upgrade authority).
RegisterBuilder::new(state_seeds)
    .build(&vrf, program_address, state_address).await?
    .send().await?;

// Inspect available client balance and withdraw funds.
let available = client_balance(&vrf, client_addr).await?;
WithdrawBuilder::new(amount).build(&vrf, client_addr).await?.send().await?;
```

For on-chain CPI usage from your own Anchor program, depend on this crate with the `cpi`
feature instead and follow the
[Request CPI example](../../README.md#an-example-of-a-simple-request-cpi) in the integration
guide:

```toml
[dependencies]
orao-solana-vrf-cb = { version = "0.3", default-features = false, features = ["cpi"] }
```

## Features

- `sdk` (default) — async off-chain client (`anchor-client`, tokio).
- `cpi` — on-chain CPI bindings only, no entrypoint.
- `no-idl`, `no-log-ix-name`, `idl-build` — build-tuning flags.
