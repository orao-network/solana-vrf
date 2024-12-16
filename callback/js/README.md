# Callback VRF JS SDK

Library to interact with `orao-vrf-cb` smart contract on Solana network.

Provides interface to request for a verifiable randomness (Ed25519 Signature) on the Solana network.

The Callback VRF is designed for on-chain usage — this SDK might get handy if you want to build
tools or infrastructure around yor Callback VRF client.

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
