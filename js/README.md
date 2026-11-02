# ORAO Solana VRF — JS / TypeScript SDK

[`@orao-network/solana-vrf`](https://www.npmjs.com/package/@orao-network/solana-vrf) is the
JavaScript / TypeScript SDK for [ORAO VRF](https://orao.network), a verifiable random
function (VRF) oracle on Solana. Request provably fair, unbiased on-chain randomness from a
web app, backend or bot and await its fulfillment: random numbers for games, NFT mints,
raffles, lotteries and GambleFi dApps, verifiable by anyone.

Program ID (devnet and mainnet): `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y`

- Getting started, CPI walkthrough and recipes: <https://github.com/orao-network/solana-vrf>
- Rust SDK and Anchor CPI bindings: [`orao-solana-vrf`](https://crates.io/crates/orao-solana-vrf)
- Need the randomness delivered into your program by a callback? See
  [`@orao-network/solana-vrf-cb`](https://www.npmjs.com/package/@orao-network/solana-vrf-cb).

## Installation

```sh
npm install @orao-network/solana-vrf
# or
yarn add @orao-network/solana-vrf
```

Built on [`@anchor-lang/core`](https://www.npmjs.com/package/@anchor-lang/core) (Anchor 1.2)
and `@solana/web3.js`.

## Usage

```typescript
import { AnchorProvider } from "@anchor-lang/core";
import { Orao } from "@orao-network/solana-vrf";

const provider = AnchorProvider.env();
const vrf = new Orao(provider);

// Request randomness using a random seed (`request()` builds the transaction asynchronously).
const [seed, tx] = await (await vrf.request()).rpc();
console.log("Request tx:", tx);

// Await the fulfilled randomness (default commitment is "finalized").
const account = await vrf.waitFulfilled(seed);
console.log("Randomness:", account.randomness); // 64 bytes
```

The [CPI example tests](https://github.com/orao-network/solana-vrf/blob/master/rust/examples/cpi/tests/russian-roulette.ts)
show the SDK driving an Anchor program that consumes the randomness on-chain.

## License

Apache-2.0
