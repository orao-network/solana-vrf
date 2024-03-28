<h1 align="center">
  Orao Solana VRF
</h1>

<p>
  Generate on-chain randomness on Solana. ORAO's Verifiable Random Function for Solana offers unbiased, fast and affordable randomness for your Solana programs. Create unique NFT characteristics, generate random levels for games and weapons, randomize airdrops and provide secure, verifiable lottery. Built using Anchor framework.
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@orao-network/solana-vrf"><img src="https://img.shields.io/npm/v/%40metaplex-foundation%2Fmpl-bubblegum?logo=npm&color=377CC0" /></a>
  <a href="https://crates.io/crates/orao-solana-vrf"><img src="https://img.shields.io/crates/v/orao-solana-vrf?logo=rust&color=darkgreen" /></a>
</p>


This repository provides off-chain Rust and JS web3 SDKs for requesting on-chain
randomness using ORAO VRF contract.

### Developer Integration Guide - Cookbook
We've made an [in-depth VRF integration guide](https://solanacookbook.com/integrations/orao-vrf.html#basic-usage-scenario) on Solana's Cookbook.

### Rust SDK
Check out [rust SDK](https://github.com/orao-network/solana-vrf/tree/master/rust) source code.

It's simple to integrate ORAO VRF into an on-chain game. We've built a [Russian Roulette contract and CLI](https://github.com/orao-network/solana-vrf/tree/master/rust/examples/cpi). New developers can reference it to get insight into doing Solana CPI - Cross Program Invocation.


### JS / TS SDK
Browse through [js SDK](https://github.com/orao-network/solana-vrf/tree/master/js) and it's subdirectories for more info.
Check out [sample Typescript integration](https://github.com/orao-network/solana-vrf/blob/master/rust/examples/cpi/tests/russian-roulette.ts)

### How to run a test validator.

Note that `anchor test` will run it for the [cpi](rust/examples/cpi) tests.

Here is an example:

```sh
solana-test-validator -r \
    --bpf-program VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y js/dist/orao_vrf.so \
    --ledger /tmp/test-ledger
```
