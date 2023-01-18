/// <reference types="node" />
import { BN, Program, Provider, web3 } from "@coral-xyz/anchor";
import { NetworkConfiguration, NetworkState, OraoTokenFeeConfig, Randomness, FulfilledRandomness } from "./state";
import { OraoVrf } from "./types/orao_vrf";
export { Randomness, FulfilledRandomness, RandomnessResponse, NetworkConfiguration, NetworkState, OraoTokenFeeConfig, } from "./state";
export declare const PROGRAM_ADDRESS: string;
export declare const PROGRAM_ID: web3.PublicKey;
export declare const RANDOMNESS_ACCOUNT_SEED: Buffer;
export declare const CONFIG_ACCOUNT_SEED: Buffer;
/**
 * Returns VRF configuration address (see helper [[Orao.getNetworkState]]).
 *
 * ```typescript
 * const networkStateAddress = networkStateAccountAddress();
 * ```
 */
export declare function networkStateAccountAddress(): web3.PublicKey;
/**
 * Returns randomness account address for the given `seed` (see helper [[Orao.getRandomness]]).
 *
 * ```typescript
 * const seed = ...;
 * const randomnessAddress = randomnessAccountAddress(seed);
 * ```
 *
 * @param seed  Seed buffer.
 */
export declare function randomnessAccountAddress(seed: Buffer | Uint8Array): web3.PublicKey;
/**
 * Returns `true` if Byzantine quorum is achieved.
 *
 * @param count number of participants
 * @param total total number of nodes
 * @returns `true` if quorum is achieved
 */
export declare function quorum(count: number, total: number): boolean;
/** Orao VRF program */
export declare class Orao extends Program<OraoVrf> {
    payer: web3.PublicKey;
    constructor(provider: Provider);
    /**
     * Returns VRF configuration (throws if not initialized).
     *
     * ```typescript
     * const state = await vrf.getNetworkState();
     * console.log("VRF treasury is " + state.config.treasury.toBase58());
     * ```
     *
     * @param commitment (optional) commitment level.
     */
    getNetworkState(commitment?: web3.Commitment): Promise<NetworkState>;
    /**
     * Returns randomness account data for the given seed (throws if account absent).
     *
     * ```typescript
     * const randomnessAccount = await vrf.getRandomness(seed);
     * const randomness = randomnessAccount.fulfilled();
     * if (randomness == null) {
     *     console.error("Randomness is not yet fulfilled");
     * } else {
     *     console.log("Randomness is fulfilled " + bs58.encode(randomness));
     * }
     * ```
     *
     * @param seed      Seed buffer.
     * @param commitment (optional) commitment level.
     */
    getRandomness(seed: Buffer | Uint8Array, commitment?: web3.Commitment): Promise<Randomness>;
    /**
     * Prepares a randomness request (see [[RequestBuilder]]).
     *
     * ```typescript
     * const [seed, tx] = await vrf.request().rpc();
     * console.log("Your transaction signature", tx);
     *
     * // ...
     *
     * const randomnessAcc = await vrf.getRandomness(seed);
     * const randomness = randomnessAccount.fulfilled();
     * if (randomness == null) {
     *     console.error("Randomness is not yet fulfilled");
     * } else {
     *     console.log("Randomness is fulfilled " + bs58.encode(randomness));
     * }
     * ```
     *
     * @param seed seed value (32 bytes). Generated randomly, if not given.
     * @returns a [[RequestBuilder]] instance.
     */
    request(seed?: Buffer | Uint8Array): Promise<RequestBuilder>;
    waitFulfilled(seed: Buffer | Uint8Array, commitment?: web3.Commitment): Promise<FulfilledRandomness>;
}
export declare class InitBuilder {
    vrf: Orao;
    config: NetworkConfiguration;
    /**
     * Creates a new init_network instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param authority config update authority
     * @param treasury fee treasury
     * @param fulfillmentAuthorities list of authorized fulfillment authorities
     * @param requestFee request fee (in lamports)
     */
    constructor(vrf: Orao, authority: web3.PublicKey, treasury: web3.PublicKey, fulfillmentAuthorities: web3.PublicKey[], requestFee: BN);
    /** Change token fee configuration. */
    withTokenFeeConfig(tokenFeeConfig: OraoTokenFeeConfig): InitBuilder;
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc(): Promise<string>;
}
export declare class UpdateBuilder {
    vrf: Orao;
    authority?: web3.PublicKey;
    treasury?: web3.PublicKey;
    requestFee?: BN;
    fulfillmentAuthorities?: web3.PublicKey[];
    tokenFeeConfig?: OraoTokenFeeConfig | null;
    /**
     * Creates a new update_network instruction builder that updates nothing.
     *
     * @param vrf ORAO VRF program instance.
     */
    constructor(vrf: Orao);
    /** Change configuration authority. */
    with_authority(authority: web3.PublicKey): UpdateBuilder;
    /** Change threasury account address. */
    with_treasury(treasury: web3.PublicKey): UpdateBuilder;
    /** Change fee (in lamports). */
    with_fee(requestFee: BN): UpdateBuilder;
    /** Change fulfillment authorities. */
    with_fulfillment_authorities(fulfillmentAuthorities: web3.PublicKey[]): UpdateBuilder;
    /** Change token fee configuration. */
    with_token_fee_config(tokenFeeConfig: OraoTokenFeeConfig): UpdateBuilder;
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc(): Promise<string>;
}
export declare class RequestBuilder {
    vrf: Orao;
    seed: Uint8Array;
    tokenWallet: web3.PublicKey | null;
    /**
     * Creates a randomness request builder (defaults to pay fees with SOL).
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: Orao, seed: Uint8Array);
    /**
     * Pay fees with SPL token using given token wallet address.
     *
     * Instruction could fail if token fee is not configured for the contract
     * or given wallet is not a proper SPL wallet.
     *
     * @param tokenWallet SPL token wallet (belongs to a payer)
     */
    payWithToken(tokenWallet: web3.PublicKey): RequestBuilder;
    /**
     * Performs an RPC call.
     *
     * @returns a pair of seed and signature.
     */
    rpc(): Promise<[Uint8Array, string]>;
}
export declare class FulfillBuilder {
    vrf: Orao;
    seed: Uint8Array;
    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: Orao, seed: Uint8Array);
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc(fulfillmentAuthority: web3.PublicKey, signature: Uint8Array): Promise<string>;
}
