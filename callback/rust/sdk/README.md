# ORAO Solana VRF Callback — Rust SDK

[`orao-solana-vrf-cb`](https://crates.io/crates/orao-solana-vrf-cb) is the Rust SDK for the
callback variant of [ORAO VRF](https://orao.network), a verifiable random function (VRF)
oracle on Solana. Your Anchor program requests randomness through CPI and the oracle
delivers the fulfilled randomness straight back into your program by invoking a callback
instruction: provably fair on-chain random numbers for games, NFT mints, raffles, lotteries
and GambleFi, settled atomically without a follow-up transaction.

Program ID (devnet and mainnet): `VRFCBePmGTpZ234BhbzNNzmyg39Rgdd6VgdfhHwKypU`

- API docs: <https://docs.rs/orao-solana-vrf-cb>
- Full integration guide: <https://github.com/orao-network/solana-vrf/blob/master/callback/README.md>
- Getting started and recipes: <https://github.com/orao-network/solana-vrf>
- CPI example client: [`callback/rust/examples/cpi`](https://github.com/orao-network/solana-vrf/tree/master/callback/rust/examples/cpi)
- Prefer to read the randomness off-chain? See
  [`orao-solana-vrf`](https://crates.io/crates/orao-solana-vrf), the classic variant.

## On-chain usage (CPI)

Depend on the crate with the `cpi` feature and name the Solana crate cohort your
`anchor-lang` uses (`solana-v3` is Anchor 1.2's default, `solana-v4` the newer one), then
follow the [Request CPI example](https://github.com/orao-network/solana-vrf/blob/master/callback/README.md#an-example-of-a-simple-request-cpi)
in the integration guide:

```toml
[dependencies]
orao-solana-vrf-cb = { version = "0.5", default-features = false, features = ["cpi", "solana-v3"] }
```

## Off-chain usage

The off-chain SDK is useful for tooling and infrastructure around a deployed client (e.g. for
registering, funding, withdrawing, or inspecting clients). Most flows look like this:

```toml
# Cargo.toml
[dependencies]
# `sdk` feature on the `solana-v4` crate cohort (both default)
orao-solana-vrf-cb = "0.5"
# or, on Anchor 1.2's default `solana-v3` cohort:
# orao-solana-vrf-cb = { version = "0.5", default-features = false, features = ["sdk", "solana-v3"] }
```

```rust
use anchor_client::{Client, Cluster, CommitmentConfig};
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

## Features

- `sdk` (default) — async off-chain client (`anchor-client`, tokio).
- `cpi` — on-chain CPI bindings only, no entrypoint.
- `solana-v4` (default) / `solana-v3` — the Solana crate cohort, mirroring the features of
  `anchor-lang` 1.2. Enable exactly one, the one your project uses (for `cpi` builds too).
- `no-idl`, `no-log-ix-name`, `idl-build` — build-tuning flags.
