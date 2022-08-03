# VRF v2 JS SDK

Library to interact with `orao-vrf` smart contract on Solana network.

Provides interface to request for a verifiable randomness (Ed25519 Signature) on the Solana network.

## Usage examples

[CPI example tests](https://github.com/orao-network/solana-vrf/blob/master/rust/examples/cpi/tests/russian-roulette.ts) are based on this SDK.

### Randomness request

```typescript
const provider = AnchorProvider.env();
const vrf = new Orao(provider);

// Request using a random seed.
const [seed, tx] = await vrf.request().rpc();
console.log("Your transaction is " + tx);
```
