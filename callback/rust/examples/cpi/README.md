# Example client for the Callback VRF

This anchor project illustrates one of the ways Callback VRF could be used.
The source code is located in the solana-vrf repo under the https://github.com/orao-network organization.

It implements a basic Callback VRF client program that is capable of doing
randomness requests and handling callbacks.

## Installation

Invoke `yarn install` to install dependencies.

## Guide

The guide is in the main main [README.md](../../../README.md).

You may also look into comments and code in the [tests](./tests/example_client.ts) — they
illustrates all the basic steps: client initialization, registration, funding and usage.

## Cli

It comes with a CLI helper:

```sh
yarn run cli --help
```

Please note that this contract is already deployed and registered for the "devnet" cluster,
so `init` and `register` cli subcommands will error. Also note that you can change contract id,
redeploy it on devnet and do all the steps manually.
