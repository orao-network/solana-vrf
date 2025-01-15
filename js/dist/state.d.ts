import { BN, web3 } from "@coral-xyz/anchor";
/**
 * On-chain VRF state.
 */
export declare class NetworkState {
    /** On-chain VRF configuration */
    config: NetworkConfiguration;
    /** Total number of received requests */
    numReceived: BN;
    constructor(config: NetworkConfiguration, numReceived: BN);
}
/**
 * On-chain VRF configuration.
 */
export declare class NetworkConfiguration {
    /** Configuration authority */
    authority: web3.PublicKey;
    /** SOL fee treasury */
    treasury: web3.PublicKey;
    /** Request fee (in lamports) */
    requestFee: BN;
    /**
     * Randomness fulfillment authorities.
     *
     * Useful for off-chain verification.
     */
    fulfillmentAuthorities: web3.PublicKey[];
    /**
     * SPL token fee configuration.
     *
     * If given, than it is possible to pay with the configured SPL token.
     */
    tokenFeeConfig: OraoTokenFeeConfig | null;
    constructor(authority: web3.PublicKey, treasury: web3.PublicKey, requestFee: BN, fulfillmentAuthorities: web3.PublicKey[], tokenFeeConfig: OraoTokenFeeConfig | null);
}
export declare class OraoTokenFeeConfig {
    /** SPL mint address */
    mint: web3.PublicKey;
    /** SPL fee treasury */
    treasury: web3.PublicKey;
    /** Fee (in SPL smallest units) */
    fee: BN;
    constructor(mint: web3.PublicKey, treasury: web3.PublicKey, fee: BN);
}
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
    /** Returns the request seed */
    getSeed(): Uint8Array;
    /** Returns the array of responses collected so far */
    getResponses(): RandomnessResponse[];
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
export declare class FulfilledRandomness extends Randomness {
    private constructor();
    /**
     * Creates an instance of FulfilledRandomness from the given randomness
     *
     * It's a caller's responsibility to assert that the randomness is actually fulfilled.
     */
    static unchecked(inner: Randomness): FulfilledRandomness;
    /** Returns fulfilled randomness */
    fulfilled(): Uint8Array;
}
export declare class FulfilledRandomnessAccountData {
    seed: Uint8Array;
    randomness: Uint8Array;
    /** Only available for V2 randomness accounts */
    client: web3.PublicKey | null;
    /** Only available for V1 randomness accounts */
    responses: RandomnessResponse[] | null;
    /** Will throw on unfulfilled randomness */
    constructor(data: RandomnessAccountData);
}
export declare class RandomnessV2 {
    request: Request;
    constructor(request: Request);
    /** Returns the pending request, or `null` if already fulfilled. */
    getPending(): PendingRequest | null;
    /** Returns the fulfilled request, or `null` if still pending. */
    getFulfilled(): FulfilledRequest | null;
    /** Returns the request seed. */
    getSeed(): Uint8Array;
    /** Returns the request client. */
    getClient(): web3.PublicKey;
    /** Returns the array of responses collected so far. */
    getResponses(): RandomnessResponse[] | null;
    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness(): Uint8Array | null;
}
export declare class PendingRequest {
    seed: Uint8Array;
    client: web3.PublicKey;
    responses: RandomnessResponse[];
    constructor(seed: number[], client: web3.PublicKey, responses: RandomnessResponse[]);
    /** Returns this pending request. */
    getPending(): PendingRequest;
    /** Returns `null` because it is a pending request. */
    getFulfilled(): null;
    /** Returns the request seed. */
    getSeed(): Uint8Array;
    /** Returns the request client. */
    getClient(): web3.PublicKey;
    /** Returns the array of responses collected so far. */
    getResponses(): RandomnessResponse[];
    /** Returns `null` because it is a pending request. */
    getFulfilledRandomness(): null;
}
export declare class FulfilledRequest {
    seed: Uint8Array;
    client: web3.PublicKey;
    randomness: Uint8Array;
    constructor(seed: number[], client: web3.PublicKey, randomness: number[]);
    /** Returns `null` because it is a fulfilled request. */
    getPending(): null;
    /** Returns this fulfilled request. */
    getFulfilled(): FulfilledRequest;
    /** Returns the request seed. */
    getSeed(): Uint8Array;
    /** Returns the request client. */
    getClient(): web3.PublicKey;
    /**
     * Returns `null` because responses are not preserved on the fulfilled request.
     *
     * Consider looking into the account history to observe the individual components
     * of the generated randomness.
     */
    getResponses(): null;
    /** Returns the fulfilled randomness. */
    getFulfilledRandomness(): Uint8Array;
}
export type Request = PendingRequest | FulfilledRequest;
export type RandomnessAccountVersion = "V1" | "V2";
export type RandomnessAccountData = RandomnessAccountDataV1 | RandomnessAccountDataV2;
export declare class RandomnessAccountDataV1 {
    readonly tag: RandomnessAccountVersion;
    data: Randomness;
    constructor(data: Randomness);
    /** Returns the request seed. */
    getSeed(): Uint8Array;
    /** Returns `null` because legacy randomness account does not store the client address. */
    getClient(): null;
    /** Returns the array of responses collected so far. */
    getResponses(): RandomnessResponse[];
    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness(): Uint8Array | null;
    /** Returns the randomness account data version. */
    getVersion(): RandomnessAccountVersion;
}
export declare class RandomnessAccountDataV2 {
    readonly tag: RandomnessAccountVersion;
    data: RandomnessV2;
    constructor(data: RandomnessV2);
    /** Returns the request seed. */
    getSeed(): Uint8Array;
    /** Returns the request client. */
    getClient(): web3.PublicKey;
    /** Returns the array of responses, or `null` if already fulfilled */
    getResponses(): RandomnessResponse[] | null;
    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness(): Uint8Array | null;
    /** Returns the randomness account data version. */
    getVersion(): RandomnessAccountVersion;
}
