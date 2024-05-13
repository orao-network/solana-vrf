import { BN, Program, Provider, web3 } from "@coral-xyz/anchor";
import {
    Ed25519Program,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    ComputeBudgetProgram,
    TransactionInstruction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import {
    NetworkConfiguration,
    NetworkState,
    OraoTokenFeeConfig,
    Randomness,
    RandomnessResponse,
    FulfilledRandomness,
} from "./state";
import { IDL, OraoVrf } from "./types/orao_vrf";
import { MethodsBuilder } from "@coral-xyz/anchor/dist/cjs/program/namespace/methods";

export {
    Randomness,
    FulfilledRandomness,
    RandomnessResponse,
    NetworkConfiguration,
    NetworkState,
    OraoTokenFeeConfig,
} from "./state";

export const PROGRAM_ADDRESS: string = "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y";
export const PROGRAM_ID: web3.PublicKey = new web3.PublicKey(PROGRAM_ADDRESS);

export const RANDOMNESS_ACCOUNT_SEED: Buffer = Buffer.from("orao-vrf-randomness-request");
export const CONFIG_ACCOUNT_SEED: Buffer = Buffer.from("orao-vrf-network-configuration");

let networkStateAddress: web3.PublicKey | null = null;

/**
 * Returns VRF configuration address (see helper {@link Orao.getNetworkState}).
 *
 * ```typescript
 * const networkStateAddress = networkStateAccountAddress();
 * ```
 *
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function networkStateAccountAddress(vrf_id = PROGRAM_ID): web3.PublicKey {
    if (networkStateAddress === null) {
        networkStateAddress = web3.PublicKey.findProgramAddressSync(
            [CONFIG_ACCOUNT_SEED],
            vrf_id
        )[0];
    }
    return networkStateAddress;
}

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
export function randomnessAccountAddress(
    seed: Buffer | Uint8Array,
    vrf_id = PROGRAM_ID
): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync([RANDOMNESS_ACCOUNT_SEED, seed], vrf_id)[0];
}

/**
 * Returns `true` if Byzantine quorum is achieved.
 *
 * @param count number of participants
 * @param total total number of nodes
 * @returns `true` if quorum is achieved
 */
export function quorum(count: number, total: number): boolean {
    return count >= Math.floor((total * 2) / 3 + 1);
}

interface IRandomnessResponse {
    pubkey: web3.PublicKey;
    randomness: number[];
}

interface IRandomness {
    seed: number[];
    randomness: number[];
    responses: IRandomnessResponse[];
}

/** Orao VRF program */
export class Orao extends Program<OraoVrf> {
    readonly _payer: web3.PublicKey;
    get payer(): web3.PublicKey {
        return this._payer;
    }

    /**
     * Constructs a new program given the provider.
     *
     * Make sure to choose the desired `CommitmentLevel` when building your provider.
     *
     * @param provider - an object that implements the {@link Provider} interface.
     *     Make sure it uses the desired `CommitmentLevel`.
     * @param [id=PROGRAM_ID] - you can override the program ID.
     */
    constructor(provider: Provider, id = PROGRAM_ID) {
        super(IDL, id, provider);
        if (!provider.publicKey) {
            throw new Error("Wallet not provided");
        }
        this._payer = provider.publicKey;
    }

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
    async getNetworkState(commitment?: web3.Commitment): Promise<NetworkState> {
        let state = await this.account.networkState.fetch(
            networkStateAccountAddress(this.programId),
            commitment
        );
        let config = state.config;
        let tokenFeeConfig = config.tokenFeeConfig as OraoTokenFeeConfig | null;
        return new NetworkState(
            new NetworkConfiguration(
                state.config.authority,
                state.config.treasury,
                state.config.requestFee,
                state.config.fulfillmentAuthorities,
                tokenFeeConfig != null
                    ? new OraoTokenFeeConfig(
                          tokenFeeConfig.mint,
                          tokenFeeConfig.treasury,
                          tokenFeeConfig.fee
                      )
                    : null
            ),
            state.numReceived
        );
    }

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
    async getRandomness(
        seed: Buffer | Uint8Array,
        commitment?: web3.Commitment
    ): Promise<Randomness> {
        let randomness = await this.account.randomness.fetch(
            randomnessAccountAddress(seed, this.programId),
            commitment
        );
        let responses = randomness.responses as IRandomnessResponse[];
        return new Randomness(
            randomness.seed,
            randomness.randomness,
            responses.map((x) => new RandomnessResponse(x.pubkey, x.randomness))
        );
    }

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
    async request(seed?: Buffer | Uint8Array): Promise<RequestBuilder> {
        let actualSeed: Buffer | Uint8Array;
        if (seed) {
            actualSeed = seed;
        } else {
            actualSeed = nacl.randomBytes(32);
        }

        return new RequestBuilder(this, actualSeed);
    }

    async waitFulfilled(
        seed: Buffer | Uint8Array,
        commitment?: web3.Commitment
    ): Promise<FulfilledRandomness> {
        let account = randomnessAccountAddress(seed, this.programId);
        let actualCommitment = this.provider.connection.commitment;
        if (commitment) {
            actualCommitment = commitment;
        }

        return new Promise(async (_resolve, reject) => {
            let resolved = false;

            let maybeResolve = (subscriptionId: number, randomness: Randomness) => {
                if (!randomness.fulfilled()) {
                    return;
                }
                if (resolved) {
                    return;
                }
                resolved = true;
                this.provider.connection.removeAccountChangeListener(subscriptionId);
                _resolve(FulfilledRandomness.unchecked(randomness));
            };

            try {
                let subscriptionId = this.provider.connection.onAccountChange(
                    account,
                    (accountInfo, _ctx) => {
                        let randomness = this.account.randomness.coder.accounts.decode(
                            "randomness",
                            accountInfo.data
                        ) as IRandomness;
                        maybeResolve(
                            subscriptionId,
                            new Randomness(
                                randomness.seed,
                                randomness.randomness,
                                randomness.responses.map(
                                    (x) => new RandomnessResponse(x.pubkey, x.randomness)
                                )
                            )
                        );
                    },
                    commitment
                );

                // In case it's already fulfilled
                let randomness = await this.getRandomness(seed, commitment);
                maybeResolve(subscriptionId, randomness);
            } catch (e) {
                reject(e);
            }
        });
    }
}

class ComputeBudgetConfig {
    public computeUnitPrice: bigint | null = null;
    public computeUnitPriceMultiplier: number | null = null;
    public computeUnitLimit: number | null = null;

    constructor() {}

    isEmpty(): boolean {
        return this.computeUnitPrice === BigInt(0) && this.computeUnitLimit === null;
    }

    async getInstructions(connection: web3.Connection): Promise<TransactionInstruction[]> {
        const instructions: TransactionInstruction[] = [];

        if (this.computeUnitPrice !== BigInt(0)) {
            let fee = await get_recommended_micro_lamport_fee(
                connection,
                this.computeUnitPrice,
                this.computeUnitPriceMultiplier
            );
            if (fee !== null) {
                instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee }));
            }
        }

        if (this.computeUnitLimit !== null) {
            instructions.push(
                ComputeBudgetProgram.setComputeUnitLimit({ units: this.computeUnitLimit })
            );
        }

        return instructions;
    }
}

/**
 * A convenient builder for the `InitNetwork` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link InitBuilder.withComputeUnitPrice} and {@link InitBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class InitBuilder {
    vrf: Orao;
    config: NetworkConfiguration;
    computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a new init_network instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param authority config update authority
     * @param treasury fee treasury
     * @param fulfillmentAuthorities list of authorized fulfillment authorities
     * @param requestFee request fee (in lamports)
     */
    constructor(
        vrf: Orao,
        authority: web3.PublicKey,
        treasury: web3.PublicKey,
        fulfillmentAuthorities: web3.PublicKey[],
        requestFee: BN
    ) {
        this.vrf = vrf;
        this.config = new NetworkConfiguration(
            authority,
            treasury,
            requestFee,
            fulfillmentAuthorities,
            null
        );
    }

    /** Change token fee configuration. */
    withTokenFeeConfig(tokenFeeConfig: OraoTokenFeeConfig): InitBuilder {
        this.config.tokenFeeConfig = tokenFeeConfig;
        return this;
    }

    /**
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): InitBuilder {
        this.computeBudgetConfig.computeUnitPrice = computeUnitPrice;
        return this;
    }

    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): InitBuilder {
        this.computeBudgetConfig.computeUnitPriceMultiplier = multiplier;
        return this;
    }

    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): InitBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `InitNetwork` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link InitBuilder.withComputeUnitPrice} and
     * {@link InitBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrf, OraoVrf["instructions"][0]>> {
        const networkState = networkStateAccountAddress(this.vrf.programId);

        let tx = this.vrf.methods
            .initNetwork(
                this.config.requestFee,
                this.config.authority,
                this.config.fulfillmentAuthorities,
                this.config.tokenFeeConfig
            )
            .accounts({
                networkState,
                treasury: this.config.treasury,
            });

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection)
            );
        }

        return tx;
    }

    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    async rpc(): Promise<string> {
        const tx = await this.build();
        return await tx.rpc();
    }
}

/**
 * A convenient builder for the `UpdateNetwork` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link UpdateBuilder.withComputeUnitPrice} and {@link UpdateBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class UpdateBuilder {
    vrf: Orao;
    authority?: web3.PublicKey;
    treasury?: web3.PublicKey;
    requestFee?: BN;
    fulfillmentAuthorities?: web3.PublicKey[];
    tokenFeeConfig?: OraoTokenFeeConfig | null;
    computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a new update_network instruction builder that updates nothing.
     *
     * @param vrf ORAO VRF program instance.
     */
    constructor(vrf: Orao) {
        this.vrf = vrf;
    }

    /** Change configuration authority. */
    with_authority(authority: web3.PublicKey): UpdateBuilder {
        this.authority = authority;
        return this;
    }

    /** Change treasury account address. */
    with_treasury(treasury: web3.PublicKey): UpdateBuilder {
        this.treasury = treasury;
        return this;
    }

    /** Change fee (in lamports). */
    with_fee(requestFee: BN): UpdateBuilder {
        this.requestFee = requestFee;
        return this;
    }

    /** Change fulfillment authorities. */
    with_fulfillment_authorities(fulfillmentAuthorities: web3.PublicKey[]): UpdateBuilder {
        this.fulfillmentAuthorities = fulfillmentAuthorities;
        return this;
    }

    /** Change token fee configuration. */
    with_token_fee_config(tokenFeeConfig: OraoTokenFeeConfig): UpdateBuilder {
        this.tokenFeeConfig = tokenFeeConfig;
        return this;
    }

    /**
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): UpdateBuilder {
        this.computeBudgetConfig.computeUnitPrice = computeUnitPrice;
        return this;
    }

    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): UpdateBuilder {
        this.computeBudgetConfig.computeUnitPriceMultiplier = multiplier;
        return this;
    }

    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): UpdateBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `UpdateNetwork` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link UpdateBuilder.withComputeUnitPrice} and
     * {@link UpdateBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrf, OraoVrf["instructions"][1]>> {
        const networkState = networkStateAccountAddress(this.vrf.programId);
        const config = (await this.vrf.getNetworkState()).config;

        let requestFee = this.requestFee ? this.requestFee : config.requestFee;
        let authority = this.authority ? this.authority : config.authority;
        let treasury = this.treasury ? this.treasury : config.treasury;
        let fulfillmentAuthorities = this.fulfillmentAuthorities
            ? this.fulfillmentAuthorities
            : config.fulfillmentAuthorities;
        let tokenFeeConfig =
            this.tokenFeeConfig !== undefined ? this.tokenFeeConfig : config.tokenFeeConfig;

        let tx = this.vrf.methods
            .updateNetwork(requestFee, authority, fulfillmentAuthorities, tokenFeeConfig)
            .accounts({
                networkState,
                treasury,
            });

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection)
            );
        }

        return tx;
    }

    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    async rpc(): Promise<string> {
        let tx = await this.build();
        return await tx.rpc();
    }
}

/**
 * A convenient builder for the `Request` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RequestBuilder.withComputeUnitPrice} and {@link RequestBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class RequestBuilder {
    vrf: Orao;
    public seed: Uint8Array;
    tokenWallet: web3.PublicKey | null;
    computeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a randomness request builder (defaults to pay fees with SOL).
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: Orao, seed: Uint8Array) {
        this.vrf = vrf;
        this.seed = seed;
        this.tokenWallet = null;
    }

    /**
     * Pay fees with SPL token using given token wallet address.
     *
     * Instruction could fail if token fee is not configured for the contract
     * or given wallet is not a proper SPL wallet.
     *
     * @param tokenWallet SPL token wallet (belongs to a payer)
     */
    payWithToken(tokenWallet: web3.PublicKey): RequestBuilder {
        this.tokenWallet = tokenWallet;
        return this;
    }

    /**
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): RequestBuilder {
        this.computeBudgetConfig.computeUnitPrice = computeUnitPrice;
        return this;
    }

    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): RequestBuilder {
        this.computeBudgetConfig.computeUnitPriceMultiplier = multiplier;
        return this;
    }

    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): RequestBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `Request` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link RequestBuilder.withComputeUnitPrice} and
     * {@link RequestBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrf, OraoVrf["instructions"][2]>> {
        const networkState = networkStateAccountAddress(this.vrf.programId);
        const networkStateAcc = await this.vrf.getNetworkState();

        let tx = this.vrf.methods.request([...this.seed]).accounts({
            networkState,
            treasury: networkStateAcc.config.treasury,
            request: randomnessAccountAddress(this.seed, this.vrf.programId),
        });

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection)
            );
        }

        return tx;
    }

    /**
     * Performs an RPC call.
     *
     * @returns a pair of seed and transaction signature.
     */
    async rpc(): Promise<[Uint8Array, string]> {
        const tx = await this.build();
        const signature = await tx.rpc();

        return [this.seed, signature];
    }
}

/**
 * A convenient builder for the `Fulfill` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link FulfillBuilder.withComputeUnitPrice} and {@link FulfillBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class FulfillBuilder {
    vrf: Orao;
    seed: Uint8Array;
    computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: Orao, seed: Uint8Array) {
        this.vrf = vrf;
        this.seed = seed;
    }

    /**
     * Adds a prioritization fee in micro-lamports (applied per compute unit).
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitPrice` to the request builder.
     *
     * *   if not specified, then median fee of the last 150 confirmed
     *     slots is used (this is by default)
     * *   if zero, then compute unit price is not applied at all.
     */
    withComputeUnitPrice(computeUnitPrice: bigint): FulfillBuilder {
        this.computeBudgetConfig.computeUnitPrice = computeUnitPrice;
        return this;
    }

    /**
     * Defines a multiplier that is applied to a median compute unit price.
     *
     * This is only applied if no compute_unit_price specified, i.e. if compute unit price
     * is measured as a median fee of the last 150 confirmed slots.
     *
     * *   if not specified, then no multiplier is applied (this is by default)
     * *   if specified, then applied as follows: `compute_unit_price = median * multiplier`
     */
    withComputeUnitPriceMultiplier(multiplier: number): FulfillBuilder {
        this.computeBudgetConfig.computeUnitPriceMultiplier = multiplier;
        return this;
    }

    /** Defines a specific compute unit limit that the transaction is allowed to consume.
     *
     * Adds `ComputeBudgetInstruction::SetComputeUnitLimit` to the request builder.
     *
     * *   if not specified, then compute unit limit is not applied at all
     *     (this is by default)
     * *   if specified, then applied as is
     */
    withComputeUnitLimit(computeUnitLimit: number): FulfillBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

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
    async build(
        fulfillmentAuthority: web3.PublicKey,
        signature: Uint8Array
    ): Promise<MethodsBuilder<OraoVrf, OraoVrf["instructions"][3]>> {
        let tx = this.vrf.methods.fulfill().accounts({
            instructionAcc: SYSVAR_INSTRUCTIONS_PUBKEY,
            networkState: networkStateAccountAddress(this.vrf.programId),
            request: randomnessAccountAddress(this.seed, this.vrf.programId),
        });

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection)
            );
        }

        tx = tx.preInstructions([
            Ed25519Program.createInstructionWithPublicKey({
                publicKey: fulfillmentAuthority.toBytes(),
                message: this.seed,
                signature,
            }),
        ]);

        return tx;
    }

    /**
     * Performs an RPC call.
     *
     * @param fulfillmentAuthority - public key of a fulfillment authority
     * @param signature - signature of a seed, performed by the fulfillment authority
     *
     * @returns a transaction signature.
     */
    async rpc(fulfillmentAuthority: web3.PublicKey, signature: Uint8Array): Promise<string> {
        let tx = await this.build(fulfillmentAuthority, signature);
        const tx_signature = await tx.rpc();

        return tx_signature;
    }
}

async function get_recommended_micro_lamport_fee(
    connection: web3.Connection,
    computeUnitPrice: bigint | null,
    computeUnitPriceMultiplier: number | null
): Promise<bigint | null> {
    if (computeUnitPrice !== null) {
        return computeUnitPrice;
    }

    let fees = await connection.getRecentPrioritizationFees();

    // Get the median fee from the most recent recent 150 slots' prioritization fee
    fees.sort((a, b) => a.prioritizationFee - b.prioritizationFee);
    let median_index = Math.floor(fees.length / 2);

    if (fees.length == 0) {
        return null;
    }

    let medianPriorityFee = 0;
    if (fees.length % 2 == 0) {
        medianPriorityFee =
            (fees[median_index - 1].prioritizationFee + fees[median_index].prioritizationFee) / 2;
    } else {
        medianPriorityFee = fees[median_index].prioritizationFee;
    }

    if (medianPriorityFee == 0) {
        return null;
    }

    if (computeUnitPriceMultiplier !== null) {
        medianPriorityFee = medianPriorityFee * computeUnitPriceMultiplier;
    }

    return BigInt(medianPriorityFee);
}
