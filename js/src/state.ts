import { BN, web3 } from "@project-serum/anchor";
import nacl from "tweetnacl";
import { quorum } from ".";

/**
 * On-chain VRF state.
 */
export class NetworkState {
    /** On-chain VRF configuration */
    config: NetworkConfiguration;

    /** Total number of received requests */
    numReceived: BN;

    constructor(config: NetworkConfiguration, numReceived: BN) {
        this.config = config;
        this.numReceived = numReceived;
    }
}

/**
 * On-chain VRF configuration.
 */
export class NetworkConfiguration {
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

    constructor(
        authority: web3.PublicKey,
        treasury: web3.PublicKey,
        requestFee: BN,
        fulfillmentAuthorities: web3.PublicKey[],
        tokenFeeConfig: OraoTokenFeeConfig | null
    ) {
        this.authority = authority;
        this.treasury = treasury;
        this.requestFee = requestFee;
        this.fulfillmentAuthorities = fulfillmentAuthorities;
        this.tokenFeeConfig = tokenFeeConfig;
    }
}

export class OraoTokenFeeConfig {
    /** SPL mint address */
    mint: web3.PublicKey;
    /** SPL fee treasury */
    treasury: web3.PublicKey;
    /** Fee (in SPL smallest units) */
    fee: BN;

    constructor(mint: web3.PublicKey, treasury: web3.PublicKey, fee: BN) {
        this.mint = mint;
        this.treasury = treasury;
        this.fee = fee;
    }
}

/**
 * Response of a single fulfillment authority.
 */
export class RandomnessResponse {
    pubkey: web3.PublicKey;
    randomness: Uint8Array;

    constructor(pubkey: web3.PublicKey, randomness: number[]) {
        this.pubkey = pubkey;
        this.randomness = Uint8Array.from(randomness);
    }
}

/**
 * Randomness account data.
 */
export class Randomness {
    seed: Uint8Array;
    randomness: Uint8Array;
    responses: RandomnessResponse[];

    constructor(seed: number[], randomness: number[], responses: RandomnessResponse[]) {
        this.seed = Uint8Array.from(seed);
        this.randomness = Uint8Array.from(randomness);
        this.responses = responses;
    }

    /** Returns fulfilled randomness or `null` if not yet fulfilled */
    fulfilled(): Uint8Array | null {
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
    verifyOffchain(fulfillmentAuthorities: web3.PublicKey[]): boolean {
        if (!quorum(this.responses.length, fulfillmentAuthorities.length)) {
            return false;
        }

        let expected_randomness = Buffer.alloc(64);
        for (const response of this.responses) {
            if (fulfillmentAuthorities.find((x) => x.equals(response.pubkey)) === undefined) {
                return false;
            }

            if (
                !nacl.sign.detached.verify(
                    response.randomness,
                    this.seed,
                    response.pubkey.toBytes()
                )
            ) {
                return false;
            }

            for (let i = 0; i < 64; i++) {
                expected_randomness[i] ^= response.randomness[i];
            }
        }

        return expected_randomness.equals(Buffer.from(this.randomness));
    }
}

export class FulfilledRandomness extends Randomness {
    private constructor(inner: Randomness) {
        super([...inner.seed], [...inner.randomness], inner.responses);
    }

    /**
     * Creates an instance of FulfilledRandomness from the given randomness
     *
     * It's a caller's responsibility to assert that the randomness is actually filfilled.
     */
    static unchecked(inner: Randomness): FulfilledRandomness {
        return new FulfilledRandomness(inner);
    }

    /** Returns fulfilled randomness */
    fulfilled(): Uint8Array {
        return this.randomness;
    }
}
