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
exports.Orao = exports.Randomness = exports.RandomnessResponse = exports.randomnessAccountAddress = exports.networkStateAccountAddress = exports.CONFIG_ACCOUNT_SEED = exports.RANDOMNESS_ACCOUNT_SEED = exports.PROGRAM_ID = exports.PROGRAM_ADDRESS = void 0;
const anchor_1 = require("@project-serum/anchor");
const orao_vrf_1 = require("./types/orao_vrf");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
exports.PROGRAM_ADDRESS = "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y";
exports.PROGRAM_ID = new anchor_1.web3.PublicKey(exports.PROGRAM_ADDRESS);
exports.RANDOMNESS_ACCOUNT_SEED = Buffer.from("orao-vrf-randomness-request");
exports.CONFIG_ACCOUNT_SEED = Buffer.from("orao-vrf-network-configuration");
let networkStateAddress = null;
/** Returns VRF configuration address */
function networkStateAccountAddress() {
    if (networkStateAddress === null) {
        networkStateAddress = anchor_1.web3.PublicKey.findProgramAddressSync([exports.CONFIG_ACCOUNT_SEED], exports.PROGRAM_ID)[0];
    }
    return networkStateAddress;
}
exports.networkStateAccountAddress = networkStateAccountAddress;
/**
 * Returns randomness account address for the given `seed`.
 *
 * @param seed  Seed buffer.
*/
function randomnessAccountAddress(seed) {
    return anchor_1.web3.PublicKey.findProgramAddressSync([exports.RANDOMNESS_ACCOUNT_SEED, seed], exports.PROGRAM_ID)[0];
}
exports.randomnessAccountAddress = randomnessAccountAddress;
function quorum(count, total) {
    return count >= Math.floor(total * 2 / 3 + 1);
}
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
        if (!quorum(this.responses.length, fulfillmentAuthorities.length)) {
            return false;
        }
        let expected_randomness = Buffer.alloc(64);
        for (const response of this.responses) {
            if (fulfillmentAuthorities.find(x => x.equals(response.pubkey)) === undefined) {
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
/** Orao VRF program */
class Orao extends anchor_1.Program {
    constructor(provider) {
        super(orao_vrf_1.IDL, exports.PROGRAM_ID, provider);
    }
    /**
     * Returns VRF configuration (throws if not initialized).
     *
     * @param commitment (optional) commitment level.
     */
    getNetworkState(commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.account.networkState.fetch(networkStateAccountAddress(), commitment);
        });
    }
    /**
     * Returns randomness account data for the given seed (throws if account absent).
     *
     * @param seed      Seed buffer.
     * @param commitment (optional) commitment level.
     */
    getRandomness(seed, commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            let randomness = yield this.account.randomness.fetch(randomnessAccountAddress(seed), commitment);
            let responses = randomness.responses;
            return new Randomness(randomness.seed, randomness.randomness, responses.map(x => new RandomnessResponse(x.pubkey, x.randomness)));
        });
    }
}
exports.Orao = Orao;
