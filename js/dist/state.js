"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Randomness = exports.RandomnessResponse = exports.OraoTokenFeeConfig = exports.NetworkConfiguration = exports.NetworkState = void 0;
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
    /** Returns fulfilled randomness or `null` if not yet fulfilled */
    fulfilled() {
        if (Buffer.from(this.randomness).equals(Buffer.alloc(64))) {
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
        return expected_randomness.equals(this.randomness);
    }
}
exports.Randomness = Randomness;
