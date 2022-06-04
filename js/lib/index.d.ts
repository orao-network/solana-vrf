/// <reference types="node" />
declare module "@orao/vrf" {
  import { PublicKey, Cluster, Transaction } from "@solana/web3.js";

  export class RandomnessRequested {
    seed: Uint8Array;
    constructor(seed: Uint8Array);
  }
  export class RandomnessFullfilled {
    seed: Uint8Array;
    randomness: Uint8Array;
    pubkey: PublicKey;
    constructor(seed: Uint8Array, randomness: Uint8Array, pubkey: PublicKey);
  }
  export type RandomnessAccount = RandomnessRequested | RandomnessFullfilled;
  export const createOrGetRandomnessRequest: (
    payer: PublicKey,
    cluster: Cluster,
    seed?: Buffer | undefined
  ) => Promise<Transaction | RandomnessAccount>;

  /**
   * Verify `Randomness` with `PublicKey` and `Seed` provided.
   *
   * Fetch `PublicKey` from `FulfillRandomness` transaction which contains EdSigVerify
   * and FulfillRandomness instruction. Then, verify `Randomness` (signauture) generated
   * from `seed` (message) and `PublicKey`. An invalid `Randomness` will throw `RandomnessVerifyError`.
   *
   * _Note: This step is optional as `Randomness` would have been verified onchain via
   * native EdSigverify program._
   *
   * @param connection Connection to to full node JSON RPC endpoint
   * @param seed 32 bytes seed (message)
   * @param randomness 64 bytes signature
   * @returns
   */
  export const verifyRandomnessOffchain: (
    cluster: Cluster,
    seed: Buffer,
    randomness: Uint8Array
  ) => Promise<void>;
}
