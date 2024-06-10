"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillBuilder = exports.RequestBuilder = exports.UpdateBuilder = exports.InitBuilder = exports.Orao = exports.quorum = exports.randomnessAccountAddress = exports.networkStateAccountAddress = exports.CONFIG_ACCOUNT_SEED = exports.RANDOMNESS_ACCOUNT_SEED = exports.PROGRAM_ID = exports.PROGRAM_ADDRESS = exports.OraoTokenFeeConfig = exports.NetworkState = exports.NetworkConfiguration = exports.RandomnessResponse = exports.FulfilledRandomness = exports.Randomness = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const state_1 = require("./state");
const orao_vrf_1 = require("./types/orao_vrf");
var state_2 = require("./state");
Object.defineProperty(exports, "Randomness", { enumerable: true, get: function () { return state_2.Randomness; } });
Object.defineProperty(exports, "FulfilledRandomness", { enumerable: true, get: function () { return state_2.FulfilledRandomness; } });
Object.defineProperty(exports, "RandomnessResponse", { enumerable: true, get: function () { return state_2.RandomnessResponse; } });
Object.defineProperty(exports, "NetworkConfiguration", { enumerable: true, get: function () { return state_2.NetworkConfiguration; } });
Object.defineProperty(exports, "NetworkState", { enumerable: true, get: function () { return state_2.NetworkState; } });
Object.defineProperty(exports, "OraoTokenFeeConfig", { enumerable: true, get: function () { return state_2.OraoTokenFeeConfig; } });
exports.PROGRAM_ADDRESS = "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y";
exports.PROGRAM_ID = new anchor_1.web3.PublicKey(exports.PROGRAM_ADDRESS);
exports.RANDOMNESS_ACCOUNT_SEED = Buffer.from("orao-vrf-randomness-request");
exports.CONFIG_ACCOUNT_SEED = Buffer.from("orao-vrf-network-configuration");
let networkStateAddress = null;
/**
 * Returns VRF configuration address (see helper {@link Orao.getNetworkState}).
 *
 * ```typescript
 * const networkStateAddress = networkStateAccountAddress();
 * ```
 *
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
function networkStateAccountAddress(vrf_id = exports.PROGRAM_ID) {
    if (networkStateAddress === null) {
        networkStateAddress = anchor_1.web3.PublicKey.findProgramAddressSync([exports.CONFIG_ACCOUNT_SEED], vrf_id)[0];
    }
    return networkStateAddress;
}
exports.networkStateAccountAddress = networkStateAccountAddress;
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
function randomnessAccountAddress(seed, vrf_id = exports.PROGRAM_ID) {
    return anchor_1.web3.PublicKey.findProgramAddressSync([exports.RANDOMNESS_ACCOUNT_SEED, seed], vrf_id)[0];
}
exports.randomnessAccountAddress = randomnessAccountAddress;
/**
 * Returns `true` if Byzantine quorum is achieved.
 *
 * @param count number of participants
 * @param total total number of nodes
 * @returns `true` if quorum is achieved
 */
function quorum(count, total) {
    return count >= Math.floor((total * 2) / 3 + 1);
}
exports.quorum = quorum;
/** Orao VRF program */
class Orao extends anchor_1.Program {
    get payer() {
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
    constructor(provider, id = exports.PROGRAM_ID) {
        super(orao_vrf_1.IDL, id, provider);
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
    getNetworkState(commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            let state = yield this.account.networkState.fetch(networkStateAccountAddress(this.programId), commitment);
            let config = state.config;
            let tokenFeeConfig = config.tokenFeeConfig;
            return new state_1.NetworkState(new state_1.NetworkConfiguration(state.config.authority, state.config.treasury, state.config.requestFee, state.config.fulfillmentAuthorities, tokenFeeConfig != null
                ? new state_1.OraoTokenFeeConfig(tokenFeeConfig.mint, tokenFeeConfig.treasury, tokenFeeConfig.fee)
                : null), state.numReceived);
        });
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
    getRandomness(seed, commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            let address = randomnessAccountAddress(seed, this.programId);
            try {
                let randomness = yield this.account.randomnessV2.fetch(address, commitment);
                if ("pending" in randomness.request && randomness.request.pending !== undefined) {
                    let pending = randomness.request.pending[0];
                    return new state_1.RandomnessAccountDataV2(new state_1.RandomnessV2(new state_1.PendingRequest(pending.seed, pending.client, pending.responses.map((x) => new state_1.RandomnessResponse(x.pubkey, x.randomness)))));
                }
                else {
                    let fulfilled = randomness.request.fulfilled[0];
                    return new state_1.RandomnessAccountDataV2(new state_1.RandomnessV2(new state_1.FulfilledRequest(fulfilled.seed, fulfilled.client, fulfilled.randomness)));
                }
            }
            catch (_e) {
                let randomness = yield this.account.randomness.fetch(address, commitment);
                let responses = randomness.responses;
                return new state_1.RandomnessAccountDataV1(new state_1.Randomness(randomness.seed, randomness.randomness, responses.map((x) => new state_1.RandomnessResponse(x.pubkey, x.randomness))));
            }
        });
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
    request(seed) {
        return __awaiter(this, void 0, void 0, function* () {
            let actualSeed;
            if (seed) {
                actualSeed = seed;
            }
            else {
                actualSeed = tweetnacl_1.default.randomBytes(32);
            }
            return new RequestBuilder(this, actualSeed);
        });
    }
    waitFulfilled(seed, commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            let account = randomnessAccountAddress(seed, this.programId);
            let actualCommitment = this.provider.connection.commitment;
            if (commitment) {
                actualCommitment = commitment;
            }
            return new Promise((_resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let resolved = false;
                let maybeResolve = (subscriptionId, randomness) => {
                    if (!randomness.getFulfilledRandomness()) {
                        return;
                    }
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    this.provider.connection.removeAccountChangeListener(subscriptionId);
                    _resolve(new state_1.FulfilledRandomnessAccountData(randomness));
                };
                try {
                    let subscriptionId = this.provider.connection.onAccountChange(account, (accountInfo, _ctx) => {
                        try {
                            let randomness = this.account.randomness.coder.accounts.decode("randomnessV2", accountInfo.data);
                            maybeResolve(subscriptionId, new state_1.RandomnessAccountDataV2(new state_1.RandomnessV2("fulfilled" in randomness.request
                                ? new state_1.FulfilledRequest(randomness.request.fulfilled[0].seed, randomness.request.fulfilled[0].client, randomness.request.fulfilled[0].randomness)
                                : new state_1.PendingRequest(randomness.request.pending[0].seed, randomness.request.pending[0].client, randomness.request.pending[0].responses.map((r) => new state_1.RandomnessResponse(r.pubkey, r.randomness))))));
                        }
                        catch (_e) {
                            let randomness = this.account.randomness.coder.accounts.decode("randomness", accountInfo.data);
                            maybeResolve(subscriptionId, new state_1.RandomnessAccountDataV1(new state_1.Randomness(randomness.seed, randomness.randomness, randomness.responses.map((x) => new state_1.RandomnessResponse(x.pubkey, x.randomness)))));
                        }
                    }, commitment);
                    // In case it's already fulfilled
                    let randomness = yield this.getRandomness(seed, commitment);
                    maybeResolve(subscriptionId, randomness);
                }
                catch (e) {
                    reject(e);
                }
            }));
        });
    }
}
exports.Orao = Orao;
class ComputeBudgetConfig {
    constructor() {
        this.computeUnitPrice = null;
        this.computeUnitPriceMultiplier = null;
        this.computeUnitLimit = null;
    }
    isEmpty() {
        return this.computeUnitPrice === BigInt(0) && this.computeUnitLimit === null;
    }
    getInstructions(connection) {
        return __awaiter(this, void 0, void 0, function* () {
            const instructions = [];
            if (this.computeUnitPrice !== BigInt(0)) {
                let fee = yield get_recommended_micro_lamport_fee(connection, this.computeUnitPrice, this.computeUnitPriceMultiplier);
                if (fee !== null) {
                    instructions.push(web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee }));
                }
            }
            if (this.computeUnitLimit !== null) {
                instructions.push(web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: this.computeUnitLimit }));
            }
            return instructions;
        });
    }
}
/**
 * A convenient builder for the `InitNetwork` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link InitBuilder.withComputeUnitPrice} and {@link InitBuilder.withComputeUnitLimit}
 * to opt-out)
 */
class InitBuilder {
    /**
     * Creates a new init_network instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param authority config update authority
     * @param treasury fee treasury
     * @param fulfillmentAuthorities list of authorized fulfillment authorities
     * @param requestFee request fee (in lamports)
     */
    constructor(vrf, authority, treasury, fulfillmentAuthorities, requestFee) {
        this.computeBudgetConfig = new ComputeBudgetConfig();
        this.vrf = vrf;
        this.config = new state_1.NetworkConfiguration(authority, treasury, requestFee, fulfillmentAuthorities, null);
    }
    /** Change token fee configuration. */
    withTokenFeeConfig(tokenFeeConfig) {
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
    withComputeUnitPrice(computeUnitPrice) {
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
    withComputeUnitPriceMultiplier(multiplier) {
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
    withComputeUnitLimit(computeUnitLimit) {
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
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            const networkState = networkStateAccountAddress(this.vrf.programId);
            let tx = this.vrf.methods
                .initNetwork(this.config.requestFee, this.config.authority, this.config.fulfillmentAuthorities, this.config.tokenFeeConfig)
                .accounts({
                networkState,
                treasury: this.config.treasury,
            });
            if (!this.computeBudgetConfig.isEmpty()) {
                tx = tx.preInstructions(yield this.computeBudgetConfig.getInstructions(this.vrf.provider.connection));
            }
            return tx;
        });
    }
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc() {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.build();
            return yield tx.rpc();
        });
    }
}
exports.InitBuilder = InitBuilder;
/**
 * A convenient builder for the `UpdateNetwork` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link UpdateBuilder.withComputeUnitPrice} and {@link UpdateBuilder.withComputeUnitLimit}
 * to opt-out)
 */
class UpdateBuilder {
    /**
     * Creates a new update_network instruction builder that updates nothing.
     *
     * @param vrf ORAO VRF program instance.
     */
    constructor(vrf) {
        this.computeBudgetConfig = new ComputeBudgetConfig();
        this.vrf = vrf;
    }
    /** Change configuration authority. */
    with_authority(authority) {
        this.authority = authority;
        return this;
    }
    /** Change treasury account address. */
    with_treasury(treasury) {
        this.treasury = treasury;
        return this;
    }
    /** Change fee (in lamports). */
    with_fee(requestFee) {
        this.requestFee = requestFee;
        return this;
    }
    /** Change fulfillment authorities. */
    with_fulfillment_authorities(fulfillmentAuthorities) {
        this.fulfillmentAuthorities = fulfillmentAuthorities;
        return this;
    }
    /** Change token fee configuration. */
    with_token_fee_config(tokenFeeConfig) {
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
    withComputeUnitPrice(computeUnitPrice) {
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
    withComputeUnitPriceMultiplier(multiplier) {
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
    withComputeUnitLimit(computeUnitLimit) {
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
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            const networkState = networkStateAccountAddress(this.vrf.programId);
            const config = (yield this.vrf.getNetworkState()).config;
            let requestFee = this.requestFee ? this.requestFee : config.requestFee;
            let authority = this.authority ? this.authority : config.authority;
            let treasury = this.treasury ? this.treasury : config.treasury;
            let fulfillmentAuthorities = this.fulfillmentAuthorities
                ? this.fulfillmentAuthorities
                : config.fulfillmentAuthorities;
            let tokenFeeConfig = this.tokenFeeConfig !== undefined ? this.tokenFeeConfig : config.tokenFeeConfig;
            let tx = this.vrf.methods
                .updateNetwork(requestFee, authority, fulfillmentAuthorities, tokenFeeConfig)
                .accounts({
                networkState,
                treasury,
            });
            if (!this.computeBudgetConfig.isEmpty()) {
                tx = tx.preInstructions(yield this.computeBudgetConfig.getInstructions(this.vrf.provider.connection));
            }
            return tx;
        });
    }
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc() {
        return __awaiter(this, void 0, void 0, function* () {
            let tx = yield this.build();
            return yield tx.rpc();
        });
    }
}
exports.UpdateBuilder = UpdateBuilder;
/**
 * A convenient builder for the `Request` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RequestBuilder.withComputeUnitPrice} and {@link RequestBuilder.withComputeUnitLimit}
 * to opt-out)
 */
class RequestBuilder {
    /**
     * Creates a randomness request builder (defaults to pay fees with SOL).
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf, seed) {
        this.computeBudgetConfig = new ComputeBudgetConfig();
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
    payWithToken(tokenWallet) {
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
    withComputeUnitPrice(computeUnitPrice) {
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
    withComputeUnitPriceMultiplier(multiplier) {
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
    withComputeUnitLimit(computeUnitLimit) {
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
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            const networkState = networkStateAccountAddress(this.vrf.programId);
            const networkStateAcc = yield this.vrf.getNetworkState();
            let tx = this.vrf.methods.requestV2([...this.seed]).accounts({
                networkState,
                treasury: networkStateAcc.config.treasury,
                request: randomnessAccountAddress(this.seed, this.vrf.programId),
            });
            if (!this.computeBudgetConfig.isEmpty()) {
                tx = tx.preInstructions(yield this.computeBudgetConfig.getInstructions(this.vrf.provider.connection));
            }
            return tx;
        });
    }
    /**
     * Performs an RPC call.
     *
     * @returns a pair of seed and transaction signature.
     */
    rpc() {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield this.build();
            const signature = yield tx.rpc();
            return [this.seed, signature];
        });
    }
}
exports.RequestBuilder = RequestBuilder;
/**
 * A convenient builder for the `Fulfill` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link FulfillBuilder.withComputeUnitPrice} and {@link FulfillBuilder.withComputeUnitLimit}
 * to opt-out)
 */
class FulfillBuilder {
    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf, seed) {
        this.computeBudgetConfig = new ComputeBudgetConfig();
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
    withComputeUnitPrice(computeUnitPrice) {
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
    withComputeUnitPriceMultiplier(multiplier) {
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
    withComputeUnitLimit(computeUnitLimit) {
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
    build(fulfillmentAuthority, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            let randomness = yield this.vrf.getRandomness(this.seed);
            let tx;
            if (randomness.getVersion() === "V1") {
                tx = this.vrf.methods.fulfill().accounts({
                    instructionAcc: web3_js_1.SYSVAR_INSTRUCTIONS_PUBKEY,
                    networkState: networkStateAccountAddress(this.vrf.programId),
                    request: randomnessAccountAddress(this.seed, this.vrf.programId),
                });
            }
            else {
                tx = this.vrf.methods.fulfillV2().accounts({
                    instructionAcc: web3_js_1.SYSVAR_INSTRUCTIONS_PUBKEY,
                    networkState: networkStateAccountAddress(this.vrf.programId),
                    request: randomnessAccountAddress(this.seed, this.vrf.programId),
                    client: randomness.getClient() || undefined,
                    systemProgram: web3_js_1.SystemProgram.programId,
                });
            }
            if (!this.computeBudgetConfig.isEmpty()) {
                tx = tx.preInstructions(yield this.computeBudgetConfig.getInstructions(this.vrf.provider.connection));
            }
            tx = tx.preInstructions([
                web3_js_1.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: fulfillmentAuthority.toBytes(),
                    message: this.seed,
                    signature,
                }),
            ]);
            return tx;
        });
    }
    /**
     * Performs an RPC call.
     *
     * @param fulfillmentAuthority - public key of a fulfillment authority
     * @param signature - signature of a seed, performed by the fulfillment authority
     *
     * @returns a transaction signature.
     */
    rpc(fulfillmentAuthority, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            let tx = yield this.build(fulfillmentAuthority, signature);
            const tx_signature = yield tx.rpc();
            return tx_signature;
        });
    }
}
exports.FulfillBuilder = FulfillBuilder;
function get_recommended_micro_lamport_fee(connection, computeUnitPrice, computeUnitPriceMultiplier) {
    return __awaiter(this, void 0, void 0, function* () {
        if (computeUnitPrice !== null) {
            return computeUnitPrice;
        }
        let fees = yield connection.getRecentPrioritizationFees();
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
        }
        else {
            medianPriorityFee = fees[median_index].prioritizationFee;
        }
        if (medianPriorityFee == 0) {
            return null;
        }
        if (computeUnitPriceMultiplier !== null) {
            medianPriorityFee = medianPriorityFee * computeUnitPriceMultiplier;
        }
        return BigInt(medianPriorityFee);
    });
}
