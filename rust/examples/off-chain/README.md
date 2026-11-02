# Rust off-chain example

This example shows how to request randomness from ORAO VRF using the off-chain Rust SDK. It
generates a random seed, performs a randomness request and subscribes for the corresponding
`Fulfill` event; the fulfilled randomness is then printed to stdout.

By default the example targets **Solana Devnet** (see `CLUSTER` in
[`src/main.rs`](src/main.rs)) and reads the payer keypair from the Solana CLI configuration
(`~/.config/solana/cli/config.yml`). If the payer balance is zero, it will request a Devnet
airdrop before issuing the VRF request.

## Run

```sh
# From the repo root:
cargo run --release -p off-chain

# Use a specific RPC endpoint (Devnet, Mainnet, or a custom URL):
cargo run --release -p off-chain -- --rpc https://api.devnet.solana.com

# Show available options:
cargo run --release -p off-chain -- --help
```

Expected output:

```
using rpc endpoint: https://api.devnet.solana.com
Requesting randomness for seed <base58-seed>..
Request performed in <tx-signature>
Fulfilled randomness: <base58-randomness>
---
```

If you want to point the example at your own deployment or a custom cluster, edit `CLUSTER` in
[`src/main.rs`](src/main.rs) or pass `--rpc <url>` on the command line.
