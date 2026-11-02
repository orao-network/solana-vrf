# ORAO Solana VRF Callback — JS SDK

Library to interact with the `orao-vrf-cb` smart contract on Solana — the **callback variant**
of ORAO VRF. Unlike the classic VRF, requests are made via CPI from a registered client program
and fulfillment triggers a client-defined callback instruction.

This off-chain SDK is mainly useful for tooling and infrastructure around an on-chain client
(registration, funding, withdrawing, inspecting clients). For on-chain integration use the
[Rust SDK](https://crates.io/crates/orao-solana-vrf-cb) with the `cpi` feature.

## Installation

Invoke `yarn install` to install dependencies.

## Documentation

All the structures and function are documented with typedoc:

```sh
yarn doc
open ./docs/index.html
```

Note that some return-type declarations may bloat the docs because of https://github.com/TypeStrong/typedoc/issues/1867

## Usage examples

Please look into the [CPI example](../rust/examples/cpi/README.md) — its tests are based on this SDK.
