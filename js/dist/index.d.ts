/// <reference types="node" />
import { BN, Program, Provider, web3 } from "@coral-xyz/anchor";
import { TransactionInstruction } from "@solana/web3.js";
import { NetworkConfiguration, NetworkState, OraoTokenFeeConfig, RandomnessAccountData, FulfilledRandomnessAccountData } from "./state";
import { OraoVrf } from "./types/orao_vrf";
import { MethodsBuilder } from "@coral-xyz/anchor/dist/cjs/program/namespace/methods";
import { AllInstructionsMap } from "@coral-xyz/anchor/dist/cjs/program/namespace/types";
export { Randomness, FulfilledRandomness, RandomnessResponse, NetworkConfiguration, NetworkState, OraoTokenFeeConfig, } from "./state";
export declare const PROGRAM_ADDRESS: string;
export declare const PROGRAM_ID: web3.PublicKey;
export declare const RANDOMNESS_ACCOUNT_SEED: Buffer;
export declare const CONFIG_ACCOUNT_SEED: Buffer;
/**
 * Returns VRF configuration address (see helper {@link Orao.getNetworkState}).
 *
 * ```typescript
 * const networkStateAddress = networkStateAccountAddress();
 * ```
 *
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export declare function networkStateAccountAddress(vrf_id?: web3.PublicKey): web3.PublicKey;
/**
 * Returns randomness account address for the given `seed` (see helper {@link Orao.getRandomness}).
 *
 * ```typescript
 * const seed = ...;
 * const randomnessAddress = randomnessAccountAddress(seed);
 * ```
 *
 * @param seed  Seed buffer.
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export declare function randomnessAccountAddress(seed: Buffer | Uint8Array, vrf_id?: web3.PublicKey): web3.PublicKey;
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
    readonly _payer: web3.PublicKey;
    get payer(): web3.PublicKey;
    /**
     * Constructs a new program given the provider.
     *
     * Make sure to choose the desired `CommitmentLevel` when building your provider.
     *
     * @param provider - an object that implements the {@link Provider} interface.
     *     Make sure it uses the desired `CommitmentLevel`.
     * @param [id=PROGRAM_ID] - you can override the program ID.
     */
    constructor(provider: Provider, id?: web3.PublicKey);
    /**
     * Returns VRF configuration (throws if not initialized).
     *
     * ```typescript
     * const state = await vrf.getNetworkState();
     * console.log("VRF treasury is " + state.config.treasury.toBase58());
     * ```
     *
     * @param commitment - you can override the provider's commitment level.
     */
    getNetworkState(commitment?: web3.Commitment): Promise<NetworkState>;
    /**
     * Returns randomness account data for the given seed (throws if account is absent).
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
     * @param seed - seed buffer.
     * @param commitment - you can override the provider's commitment level.
     */
    getRandomness(seed: Buffer | Uint8Array, commitment?: web3.Commitment): Promise<RandomnessAccountData>;
    /**
     * Prepares a randomness request (see {@link RequestBuilder}).
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
     * @returns a {@link RequestBuilder} instance.
     */
    request(seed?: Buffer | Uint8Array): Promise<RequestBuilder>;
    waitFulfilled(seed: Buffer | Uint8Array, commitment?: web3.Commitment): Promise<FulfilledRandomnessAccountData>;
}
declare class ComputeBudgetConfig {
    computeUnitPrice: bigint | null;
    computeUnitPriceMultiplier: number | null;
    computeUnitLimit: number | null;
    constructor();
    isEmpty(): boolean;
    getInstructions(connection: web3.Connection): Promise<TransactionInstruction[]>;
}
/**
 * A convenient builder for the `InitNetwork` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link InitBuilder.withComputeUnitPrice} and {@link InitBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export declare class InitBuilder {
    vrf: Orao;
    config: NetworkConfiguration;
    computeBudgetConfig: ComputeBudgetConfig;
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
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): InitBuilder;
    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): InitBuilder;
    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): InitBuilder;
    /**
     * Returns a {@link MethodsBuilder} instance for the `InitNetwork` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link InitBuilder.withComputeUnitPrice} and
     * {@link InitBuilder.withComputeUnitLimit} to opt-out).
     */
    build(): Promise<MethodsBuilder<OraoVrf, AllInstructionsMap<OraoVrf>["initNetwork"]>>;
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc(): Promise<string>;
}
/**
 * A convenient builder for the `UpdateNetwork` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link UpdateBuilder.withComputeUnitPrice} and {@link UpdateBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export declare class UpdateBuilder {
    vrf: Orao;
    authority?: web3.PublicKey;
    treasury?: web3.PublicKey;
    requestFee?: BN;
    fulfillmentAuthorities?: web3.PublicKey[];
    tokenFeeConfig?: OraoTokenFeeConfig | null;
    computeBudgetConfig: ComputeBudgetConfig;
    /**
     * Creates a new update_network instruction builder that updates nothing.
     *
     * @param vrf ORAO VRF program instance.
     */
    constructor(vrf: Orao);
    /** Change configuration authority. */
    with_authority(authority: web3.PublicKey): UpdateBuilder;
    /** Change treasury account address. */
    with_treasury(treasury: web3.PublicKey): UpdateBuilder;
    /** Change fee (in lamports). */
    with_fee(requestFee: BN): UpdateBuilder;
    /** Change fulfillment authorities. */
    with_fulfillment_authorities(fulfillmentAuthorities: web3.PublicKey[]): UpdateBuilder;
    /** Change token fee configuration. */
    with_token_fee_config(tokenFeeConfig: OraoTokenFeeConfig): UpdateBuilder;
    /**
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): UpdateBuilder;
    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): UpdateBuilder;
    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): UpdateBuilder;
    /**
     * Returns a {@link MethodsBuilder} instance for the `UpdateNetwork` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link UpdateBuilder.withComputeUnitPrice} and
     * {@link UpdateBuilder.withComputeUnitLimit} to opt-out).
     */
    build(): Promise<MethodsBuilder<OraoVrf, AllInstructionsMap<OraoVrf>["updateNetwork"]>>;
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc(): Promise<string>;
}
/**
 * A convenient builder for the `Request` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RequestBuilder.withComputeUnitPrice} and {@link RequestBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export declare class RequestBuilder {
    vrf: Orao;
    seed: Uint8Array;
    tokenWallet: web3.PublicKey | null;
    computeBudgetConfig: ComputeBudgetConfig;
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
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): RequestBuilder;
    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): RequestBuilder;
    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): RequestBuilder;
    /**
     * Returns a {@link MethodsBuilder} instance for the `Request` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link RequestBuilder.withComputeUnitPrice} and
     * {@link RequestBuilder.withComputeUnitLimit} to opt-out).
     */
    build(): Promise<MethodsBuilder<OraoVrf, AllInstructionsMap<OraoVrf>["requestV2"]>>;
    /**
     * Performs an RPC call.
     *
     * @returns a pair of seed and transaction signature.
     */
    rpc(): Promise<[Uint8Array, string]>;
}
/**
 * A convenient builder for the `Fulfill` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link FulfillBuilder.withComputeUnitPrice} and {@link FulfillBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export declare class FulfillBuilder {
    vrf: Orao;
    seed: Uint8Array;
    computeBudgetConfig: ComputeBudgetConfig;
    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: Orao, seed: Uint8Array);
    /**
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): FulfillBuilder;
    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): FulfillBuilder;
    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): FulfillBuilder;
    /**
     * Returns a {@link MethodsBuilder} instance for the `Request` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link RequestBuilder.withComputeUnitPrice} and
     * {@link RequestBuilder.withComputeUnitLimit} to opt-out).
     *
     * @param fulfillmentAuthority - public key of a fulfillment authority
     * @param signature - signature of a seed, performed by the fulfillment authority
     */
    build(fulfillmentAuthority: web3.PublicKey, signature: Uint8Array): Promise<MethodsBuilder<OraoVrf, AllInstructionsMap<OraoVrf>["fulfill"]> | MethodsBuilder<OraoVrf, AllInstructionsMap<OraoVrf>["fulfillV2"]>>;
    /**
     * Performs an RPC call.
     *
     * @param fulfillmentAuthority - public key of a fulfillment authority
     * @param signature - signature of a seed, performed by the fulfillment authority
     *
     * @returns a transaction signature.
     */
    rpc(fulfillmentAuthority: web3.PublicKey, signature: Uint8Array): Promise<string>;
}
