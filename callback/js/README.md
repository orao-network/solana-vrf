# ORAO Solana VRF Callback — JS / TypeScript SDK

[`@orao-network/solana-vrf-cb`](https://www.npmjs.com/package/@orao-network/solana-vrf-cb)
is the JavaScript / TypeScript SDK for the callback variant of [ORAO VRF](https://orao.network),
a verifiable random function (VRF) oracle on Solana. A registered client program requests
randomness through CPI and the oracle delivers the fulfilled randomness straight back into the
program by invoking a callback instruction: provably fair on-chain random numbers for games,
NFT mints, raffles, lotteries and GambleFi, settled atomically.

This off-chain SDK covers the tooling around an on-chain client: registering a client program,
funding and withdrawing its balance, updating callbacks and inspecting clients and requests.
The on-chain side is written in Rust with the
[`orao-solana-vrf-cb`](https://crates.io/crates/orao-solana-vrf-cb) crate and its `cpi` feature.

Program ID (devnet and mainnet): `VRFCBePmGTpZ234BhbzNNzmyg39Rgdd6VgdfhHwKypU`

- Integration guide: <https://github.com/orao-network/solana-vrf/blob/master/callback/README.md>
- Getting started and recipes: <https://github.com/orao-network/solana-vrf>
- Example client program and its tests: <https://github.com/orao-network/solana-vrf/tree/master/callback/rust/examples/cpi>
- Prefer to read the randomness off-chain? See
  [`@orao-network/solana-vrf`](https://www.npmjs.com/package/@orao-network/solana-vrf), the classic variant.

## Installation

```sh
npm install @orao-network/solana-vrf-cb
# or
yarn add @orao-network/solana-vrf-cb
```

Built on [`@anchor-lang/core`](https://www.npmjs.com/package/@anchor-lang/core) (Anchor 1.2)
and `@solana/web3.js`.

## Usage

```typescript
import { AnchorProvider } from "@anchor-lang/core";
import { OraoCb, RegisterBuilder, clientAddress, web3 } from "@orao-network/solana-vrf-cb";

const provider = AnchorProvider.env();
const vrf = new OraoCb(provider);

// Register your deployed client program (the wallet must be its upgrade authority);
// `stateAddr` is your program's State PDA, derived from `stateSeeds`.
await new RegisterBuilder(vrf, programId, stateAddr, stateSeeds).rpc();

// The Client PDA pays for requests: fund it with a plain SOL transfer.
const [client] = clientAddress(programId, stateAddr);
await provider.sendAndConfirm(
    new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: provider.publicKey,
            toPubkey: client,
            lamports: 0.1 * web3.LAMPORTS_PER_SOL,
        }),
    ),
);
console.log("Client balance:", (await vrf.clientBalance(client)).toString());

// Await a request your program made through CPI (same seed as in the CPI).
const request = await vrf.waitFulfilled(client, seed, "regular");
console.log("Randomness:", request.state.randomness); // 64 bytes
```

All structures and functions are documented with typedoc (`yarn doc` in the package source).

## License

Apache-2.0
