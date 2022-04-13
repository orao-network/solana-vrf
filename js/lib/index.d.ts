/// <reference types="node" />
declare module "@orao/vrf" {
  import { PublicKey, Connection, Transaction } from "@solana/web3.js";

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
    connection: Connection,
    seed?: Buffer | undefined
  ) => Promise<Transaction | RandomnessAccount>;
}
