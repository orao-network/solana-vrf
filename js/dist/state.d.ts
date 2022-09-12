import { BN, web3 } from "@project-serum/anchor";
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
     * It's a caller's responsibility to assert that the randomness is actually filfilled.
     */
    static unchecked(inner: Randomness): FulfilledRandomness;
    /** Returns fulfilled randomness */
    fulfilled(): Uint8Array;
}
