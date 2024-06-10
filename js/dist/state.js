"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomnessAccountDataV2 = exports.RandomnessAccountDataV1 = exports.FulfilledRequest = exports.PendingRequest = exports.RandomnessV2 = exports.FulfilledRandomnessAccountData = exports.FulfilledRandomness = exports.Randomness = exports.RandomnessResponse = exports.OraoTokenFeeConfig = exports.NetworkConfiguration = exports.NetworkState = void 0;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const _1 = require(".");
/**
 * On-chain VRF state.
 */
class NetworkState {
    constructor(config, numReceived) {
        this.config = config;
        this.numReceived = numReceived;
    }
}
exports.NetworkState = NetworkState;
/**
 * On-chain VRF configuration.
 */
class NetworkConfiguration {
    constructor(authority, treasury, requestFee, fulfillmentAuthorities, tokenFeeConfig) {
        this.authority = authority;
        this.treasury = treasury;
        this.requestFee = requestFee;
        this.fulfillmentAuthorities = fulfillmentAuthorities;
        this.tokenFeeConfig = tokenFeeConfig;
    }
}
exports.NetworkConfiguration = NetworkConfiguration;
class OraoTokenFeeConfig {
    constructor(mint, treasury, fee) {
        this.mint = mint;
        this.treasury = treasury;
        this.fee = fee;
    }
}
exports.OraoTokenFeeConfig = OraoTokenFeeConfig;
/**
 * Response of a single fulfillment authority.
 */
class RandomnessResponse {
    constructor(pubkey, randomness) {
        this.pubkey = pubkey;
        this.randomness = Uint8Array.from(randomness);
    }
}
exports.RandomnessResponse = RandomnessResponse;
/**
 * Randomness account data.
 */
class Randomness {
    constructor(seed, randomness, responses) {
        this.seed = Uint8Array.from(seed);
        this.randomness = Uint8Array.from(randomness);
        this.responses = responses;
    }
    /** Returns the request seed */
    getSeed() {
        return this.seed;
    }
    /** Returns the array of responses collected so far */
    getResponses() {
        return this.responses;
    }
    /** Returns fulfilled randomness or `null` if not yet fulfilled */
    fulfilled() {
        if (Buffer.alloc(64).equals(Buffer.from(this.randomness))) {
            return null;
        }
        return this.randomness;
    }
    /**
     * Performs off-chain verification of fulfilled randomness against
     * the given list of fulfillment authorities.
     *
     * @param fulfillmentAuthorities List of fulfillment authorities (at the time of fulfillment).
     */
    verifyOffchain(fulfillmentAuthorities) {
        if (!(0, _1.quorum)(this.responses.length, fulfillmentAuthorities.length)) {
            return false;
        }
        let expected_randomness = Buffer.alloc(64);
        for (const response of this.responses) {
            if (fulfillmentAuthorities.find((x) => x.equals(response.pubkey)) === undefined) {
                return false;
            }
            if (!tweetnacl_1.default.sign.detached.verify(response.randomness, this.seed, response.pubkey.toBytes())) {
                return false;
            }
            for (let i = 0; i < 64; i++) {
                expected_randomness[i] ^= response.randomness[i];
            }
        }
        return expected_randomness.equals(Buffer.from(this.randomness));
    }
}
exports.Randomness = Randomness;
class FulfilledRandomness extends Randomness {
    constructor(inner) {
        super([...inner.seed], [...inner.randomness], inner.responses);
    }
    /**
     * Creates an instance of FulfilledRandomness from the given randomness
     *
     * It's a caller's responsibility to assert that the randomness is actually fulfilled.
     */
    static unchecked(inner) {
        return new FulfilledRandomness(inner);
    }
    /** Returns fulfilled randomness */
    fulfilled() {
        return this.randomness;
    }
}
exports.FulfilledRandomness = FulfilledRandomness;
class FulfilledRandomnessAccountData {
    /** Will throw on unfulfilled randomness */
    constructor(data) {
        this.seed = data.getSeed();
        this.client = data.getClient();
        let randomness = data.getFulfilledRandomness();
        if (randomness === null) {
            throw new Error("Building FulfilledRandomnessAccountData from pending request");
        }
        this.randomness = randomness;
        this.responses = data.getResponses();
    }
}
exports.FulfilledRandomnessAccountData = FulfilledRandomnessAccountData;
class RandomnessV2 {
    constructor(request) {
        this.request = request;
    }
    /** Returns the pending request, or `null` if already fulfilled. */
    getPending() {
        return this.request.getPending();
    }
    /** Returns the fulfilled request, or `null` if still pending. */
    getFulfilled() {
        return this.request.getFulfilled();
    }
    /** Returns the request seed. */
    getSeed() {
        return this.request.getSeed();
    }
    /** Returns the request client. */
    getClient() {
        return this.request.getClient();
    }
    /** Returns the array of responses collected so far. */
    getResponses() {
        return this.request.getResponses();
    }
    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness() {
        return this.request.getFulfilledRandomness();
    }
}
exports.RandomnessV2 = RandomnessV2;
class PendingRequest {
    constructor(seed, client, responses) {
        this.seed = Uint8Array.from(seed);
        this.client = client;
        this.responses = responses;
    }
    /** Returns this pending request. */
    getPending() {
        return this;
    }
    /** Returns `null` because it is a pending request. */
    getFulfilled() {
        return null;
    }
    /** Returns the request seed. */
    getSeed() {
        return this.seed;
    }
    /** Returns the request client. */
    getClient() {
        return this.client;
    }
    /** Returns the array of responses collected so far. */
    getResponses() {
        return this.responses;
    }
    /** Returns `null` because it is a pending request. */
    getFulfilledRandomness() {
        return null;
    }
}
exports.PendingRequest = PendingRequest;
class FulfilledRequest {
    constructor(seed, client, randomness) {
        this.seed = Uint8Array.from(seed);
        this.client = client;
        this.randomness = Uint8Array.from(randomness);
    }
    /** Returns `null` because it is a fulfilled request. */
    getPending() {
        return null;
    }
    /** Returns this fulfilled request. */
    getFulfilled() {
        return this;
    }
    /** Returns the request seed. */
    getSeed() {
        return this.seed;
    }
    /** Returns the request client. */
    getClient() {
        return this.client;
    }
    /**
     * Returns `null` because responses are not preserved on the fulfilled request.
     *
     * Consider looking into the account history to observe the individual components
     * of the generated randomness.
     */
    getResponses() {
        return null;
    }
    /** Returns the fulfilled randomness. */
    getFulfilledRandomness() {
        return this.randomness;
    }
}
exports.FulfilledRequest = FulfilledRequest;
class RandomnessAccountDataV1 {
    constructor(data) {
        this.tag = "V1";
        this.data = data;
    }
    /** Returns the request seed. */
    getSeed() {
        return this.data.getSeed();
    }
    /** Returns `null` because legacy randomness account does not store the client address. */
    getClient() {
        return null;
    }
    /** Returns the array of responses collected so far. */
    getResponses() {
        return this.data.getResponses();
    }
    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness() {
        return this.data.fulfilled();
    }
    /** Returns the randomness account data version. */
    getVersion() {
        return this.tag;
    }
}
exports.RandomnessAccountDataV1 = RandomnessAccountDataV1;
class RandomnessAccountDataV2 {
    constructor(data) {
        this.tag = "V2";
        this.data = data;
    }
    /** Returns the request seed. */
    getSeed() {
        return this.data.getSeed();
    }
    /** Returns the request client. */
    getClient() {
        return this.data.getClient();
    }
    /** Returns the array of responses, or `null` if already fulfilled */
    getResponses() {
        return this.data.getResponses();
    }
    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness() {
        return this.data.getFulfilledRandomness();
    }
    /** Returns the randomness account data version. */
    getVersion() {
        return this.tag;
    }
}
exports.RandomnessAccountDataV2 = RandomnessAccountDataV2;
