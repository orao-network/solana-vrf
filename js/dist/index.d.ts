/// <reference types="node" />
import { Program, Provider, web3 } from "@project-serum/anchor";
import { IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { OraoVrf } from "./types/orao_vrf";
export declare const PROGRAM_ADDRESS: string;
export declare const PROGRAM_ID: web3.PublicKey;
export declare const RANDOMNESS_ACCOUNT_SEED: Buffer;
export declare const CONFIG_ACCOUNT_SEED: Buffer;
/** Returns VRF configuration address */
export declare function networkStateAccountAddress(): web3.PublicKey;
/**
 * Returns randomness account address for the given `seed`.
 *
 * @param seed  Seed buffer.
*/
export declare function randomnessAccountAddress(seed: Buffer): web3.PublicKey;
/**
 * Response of a single fulfillment authority.
*/
export declare class RandomnessResponse {
    pubkey: web3.PublicKey;
    randomness: Uint8Array;
    constructor(pubkey: web3.PublicKey, randomness: number[]);
}
/**
 * Randomness account data.
*/
export declare class Randomness {
    seed: Uint8Array;
    randomness: Uint8Array;
    responses: RandomnessResponse[];
    constructor(seed: number[], randomness: number[], responses: RandomnessResponse[]);
    /** Returns fulfilled randomness or `null` if not yet fulfilled */
    fulfilled(): Uint8Array | null;
    /**
     * Performs off-chain verification of fulfilled randomness against
     * the given list of fulfillment authorities.
     *
     * @param fulfillmentAuthorities List of fulfillment authorities (at the time of fulfillment).
    */
    verifyOffchain(fulfillmentAuthorities: web3.PublicKey[]): boolean;
}
/** Orao VRF program */
export declare class Orao extends Program<OraoVrf> {
    constructor(provider: Provider);
    /**
     * Returns VRF configuration (throws if not initialized).
     *
     * @param commitment (optional) commitment level.
     */
    getNetworkState(commitment?: web3.Commitment): Promise<TypeDef<OraoVrf["accounts"][0], IdlTypes<OraoVrf>>>;
    /**
     * Returns randomness account data for the given seed (throws if account absent).
     *
     * @param seed      Seed buffer.
     * @param commitment (optional) commitment level.
     */
    getRandomness(seed: Buffer, commitment?: web3.Commitment): Promise<Randomness>;
}
