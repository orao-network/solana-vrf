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
const anchor_1 = require("@project-serum/anchor");
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
 * Returns VRF configuration address (see helper [[Orao.getNetworkState]]).
 *
 * ```typescript
 * const networkStateAddress = networkStateAccountAddress();
 * ```
 */
function networkStateAccountAddress() {
    if (networkStateAddress === null) {
        networkStateAddress = anchor_1.web3.PublicKey.findProgramAddressSync([exports.CONFIG_ACCOUNT_SEED], exports.PROGRAM_ID)[0];
    }
    return networkStateAddress;
}
exports.networkStateAccountAddress = networkStateAccountAddress;
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
function randomnessAccountAddress(seed) {
    return anchor_1.web3.PublicKey.findProgramAddressSync([exports.RANDOMNESS_ACCOUNT_SEED, seed], exports.PROGRAM_ID)[0];
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
    constructor(provider) {
        super(orao_vrf_1.IDL, exports.PROGRAM_ID, provider);
        if (!provider.publicKey) {
            throw new Error("Wallet not provided");
        }
        this.payer = provider.publicKey;
    }
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
    getNetworkState(commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            let state = yield this.account.networkState.fetch(networkStateAccountAddress(), commitment);
            let config = state.config;
            let tokenFeeConfig = config.tokenFeeConfig;
            return new state_1.NetworkState(new state_1.NetworkConfiguration(state.config.authority, state.config.treasury, state.config.requestFee, state.config.fulfillmentAuthorities, tokenFeeConfig != null
                ? new state_1.OraoTokenFeeConfig(tokenFeeConfig.mint, tokenFeeConfig.treasury, tokenFeeConfig.fee)
                : null), state.numReceived);
        });
    }
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
    getRandomness(seed, commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            let randomness = yield this.account.randomness.fetch(randomnessAccountAddress(seed), commitment);
            let responses = randomness.responses;
            return new state_1.Randomness(randomness.seed, randomness.randomness, responses.map((x) => new state_1.RandomnessResponse(x.pubkey, x.randomness)));
        });
    }
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
            let account = randomnessAccountAddress(seed);
            let actualCommitment = "finalized";
            if (commitment) {
                actualCommitment = commitment;
            }
            return new Promise((_resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let resolved = false;
                let maybeResolve = (subscriptionId, randomness) => {
                    if (!randomness.fulfilled()) {
                        return;
                    }
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    this.provider.connection.removeAccountChangeListener(subscriptionId);
                    _resolve(state_1.FulfilledRandomness.unchecked(randomness));
                };
                try {
                    let subscriptionId = this.provider.connection.onAccountChange(account, (accountInfo, _ctx) => {
                        let randomness = this.account.randomness.coder.accounts.decode("randomness", accountInfo.data);
                        maybeResolve(subscriptionId, new state_1.Randomness(randomness.seed, randomness.randomness, randomness.responses.map((x) => new state_1.RandomnessResponse(x.pubkey, x.randomness))));
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
        this.vrf = vrf;
        this.config = new state_1.NetworkConfiguration(authority, treasury, requestFee, fulfillmentAuthorities, null);
    }
    /** Change token fee configuration. */
    withTokenFeeConfig(tokenFeeConfig) {
        this.config.tokenFeeConfig = tokenFeeConfig;
        return this;
    }
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc() {
        return __awaiter(this, void 0, void 0, function* () {
            const networkState = networkStateAccountAddress();
            const tx = yield this.vrf.methods
                .initNetwork(this.config.requestFee, this.config.authority, this.config.fulfillmentAuthorities, this.config.tokenFeeConfig)
                .accounts({
                networkState,
                treasury: this.config.treasury,
            })
                .rpc();
            return tx;
        });
    }
}
exports.InitBuilder = InitBuilder;
class UpdateBuilder {
    /**
     * Creates a new update_network instruction builder that updates nothing.
     *
     * @param vrf ORAO VRF program instance.
     */
    constructor(vrf) {
        this.vrf = vrf;
    }
    /** Change configuration authority. */
    with_authority(authority) {
        this.authority = authority;
        return this;
    }
    /** Change threasury account address. */
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
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc() {
        return __awaiter(this, void 0, void 0, function* () {
            const networkState = networkStateAccountAddress();
            const config = (yield this.vrf.getNetworkState()).config;
            let requestFee = this.requestFee ? this.requestFee : config.requestFee;
            let authority = this.authority ? this.authority : config.authority;
            let treasury = this.treasury ? this.treasury : config.treasury;
            let fulfillmentAuthorities = this.fulfillmentAuthorities
                ? this.fulfillmentAuthorities
                : config.fulfillmentAuthorities;
            let tokenFeeConfig = this.tokenFeeConfig !== undefined ? this.tokenFeeConfig : config.tokenFeeConfig;
            const tx = yield this.vrf.methods
                .updateNetwork(requestFee, authority, fulfillmentAuthorities, tokenFeeConfig)
                .accounts({
                networkState,
                treasury,
            })
                .rpc();
            return tx;
        });
    }
}
exports.UpdateBuilder = UpdateBuilder;
class RequestBuilder {
    /**
     * Creates a randomness request builder (defaults to pay fees with SOL).
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf, seed) {
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
     * Performs an RPC call.
     *
     * @returns a pair of seed and signature.
     */
    rpc() {
        return __awaiter(this, void 0, void 0, function* () {
            const networkState = networkStateAccountAddress();
            const networkStateAcc = yield this.vrf.getNetworkState();
            const tx = yield this.vrf.methods
                .request([...this.seed])
                .accounts({
                networkState,
                treasury: networkStateAcc.config.treasury,
                request: randomnessAccountAddress(this.seed),
            })
                .rpc();
            return [this.seed, tx];
        });
    }
}
exports.RequestBuilder = RequestBuilder;
class FulfillBuilder {
    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf, seed) {
        this.vrf = vrf;
        this.seed = seed;
    }
    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    rpc(fulfillmentAuthority, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            let tx = yield this.vrf.methods
                .fulfill()
                .accounts({
                instructionAcc: web3_js_1.SYSVAR_INSTRUCTIONS_PUBKEY,
                networkState: networkStateAccountAddress(),
                request: randomnessAccountAddress(this.seed),
            })
                .preInstructions([
                web3_js_1.Ed25519Program.createInstructionWithPublicKey({
                    publicKey: fulfillmentAuthority.toBytes(),
                    message: this.seed,
                    signature,
                }),
            ])
                .rpc();
            return tx;
        });
    }
}
exports.FulfillBuilder = FulfillBuilder;
