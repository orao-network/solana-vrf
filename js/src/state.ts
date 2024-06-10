import { BN, web3 } from "@coral-xyz/anchor";
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

    /** Returns the request seed */
    getSeed(): Uint8Array {
        return this.seed;
    }

    /** Returns the array of responses collected so far */
    getResponses(): RandomnessResponse[] {
        return this.responses;
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
     * It's a caller's responsibility to assert that the randomness is actually fulfilled.
     */
    static unchecked(inner: Randomness): FulfilledRandomness {
        return new FulfilledRandomness(inner);
    }

    /** Returns fulfilled randomness */
    fulfilled(): Uint8Array {
        return this.randomness;
    }
}

export class FulfilledRandomnessAccountData {
    seed: Uint8Array;
    randomness: Uint8Array;

    /** Only available for V2 randomness accounts */
    client: web3.PublicKey | null;

    /** Only available for V1 randomness accounts */
    responses: RandomnessResponse[] | null;

    /** Will throw on unfulfilled randomness */
    constructor(data: RandomnessAccountData) {
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

export class RandomnessV2 {
    request: Request;

    constructor(request: Request) {
        this.request = request;
    }

    /** Returns the pending request, or `null` if already fulfilled. */
    getPending(): PendingRequest | null {
        return this.request.getPending();
    }

    /** Returns the fulfilled request, or `null` if still pending. */
    getFulfilled(): FulfilledRequest | null {
        return this.request.getFulfilled();
    }

    /** Returns the request seed. */
    getSeed(): Uint8Array {
        return this.request.getSeed();
    }

    /** Returns the request client. */
    getClient(): web3.PublicKey {
        return this.request.getClient();
    }

    /** Returns the array of responses collected so far. */
    getResponses(): RandomnessResponse[] | null {
        return this.request.getResponses();
    }

    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness(): Uint8Array | null {
        return this.request.getFulfilledRandomness();
    }
}

export class PendingRequest {
    seed: Uint8Array;
    client: web3.PublicKey;
    responses: RandomnessResponse[];

    constructor(seed: number[], client: web3.PublicKey, responses: RandomnessResponse[]) {
        this.seed = Uint8Array.from(seed);
        this.client = client;
        this.responses = responses;
    }

    /** Returns this pending request. */
    getPending(): PendingRequest {
        return this;
    }

    /** Returns `null` because it is a pending request. */
    getFulfilled(): null {
        return null;
    }

    /** Returns the request seed. */
    getSeed(): Uint8Array {
        return this.seed;
    }

    /** Returns the request client. */
    getClient(): web3.PublicKey {
        return this.client;
    }

    /** Returns the array of responses collected so far. */
    getResponses(): RandomnessResponse[] {
        return this.responses;
    }

    /** Returns `null` because it is a pending request. */
    getFulfilledRandomness(): null {
        return null;
    }
}

export class FulfilledRequest {
    seed: Uint8Array;
    client: web3.PublicKey;
    randomness: Uint8Array;

    constructor(seed: number[], client: web3.PublicKey, randomness: number[]) {
        this.seed = Uint8Array.from(seed);
        this.client = client;
        this.randomness = Uint8Array.from(randomness);
    }

    /** Returns `null` because it is a fulfilled request. */
    getPending(): null {
        return null;
    }

    /** Returns this fulfilled request. */
    getFulfilled(): FulfilledRequest {
        return this;
    }

    /** Returns the request seed. */
    getSeed(): Uint8Array {
        return this.seed;
    }

    /** Returns the request client. */
    getClient(): web3.PublicKey {
        return this.client;
    }

    /**
     * Returns `null` because responses are not preserved on the fulfilled request.
     *
     * Consider looking into the account history to observe the individual components
     * of the generated randomness.
     */
    getResponses(): null {
        return null;
    }

    /** Returns the fulfilled randomness. */
    getFulfilledRandomness(): Uint8Array {
        return this.randomness;
    }
}

export type Request = PendingRequest | FulfilledRequest;

export type RandomnessAccountVersion = "V1" | "V2";

export type RandomnessAccountData = RandomnessAccountDataV1 | RandomnessAccountDataV2;

export class RandomnessAccountDataV1 {
    readonly tag: RandomnessAccountVersion = "V1";
    data: Randomness;

    constructor(data: Randomness) {
        this.data = data;
    }

    /** Returns the request seed. */
    getSeed(): Uint8Array {
        return this.data.getSeed();
    }

    /** Returns `null` because legacy randomness account does not store the client address. */
    getClient(): null {
        return null;
    }

    /** Returns the array of responses collected so far. */
    getResponses(): RandomnessResponse[] {
        return this.data.getResponses();
    }

    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness(): Uint8Array | null {
        return this.data.fulfilled();
    }

    /** Returns the randomness account data version. */
    getVersion(): RandomnessAccountVersion {
        return this.tag;
    }
}

export class RandomnessAccountDataV2 {
    readonly tag: RandomnessAccountVersion = "V2";
    data: RandomnessV2;

    constructor(data: RandomnessV2) {
        this.data = data;
    }

    /** Returns the request seed. */
    getSeed(): Uint8Array {
        return this.data.getSeed();
    }

    /** Returns the request client. */
    getClient(): web3.PublicKey {
        return this.data.getClient();
    }

    /** Returns the array of responses, or `null` if already fulfilled */
    getResponses(): RandomnessResponse[] | null {
        return this.data.getResponses();
    }

    /** Returns the fulfilled randomness or `null` if still pending. */
    getFulfilledRandomness(): Uint8Array | null {
        return this.data.getFulfilledRandomness();
    }

    /** Returns the randomness account data version. */
    getVersion(): RandomnessAccountVersion {
        return this.tag;
    }
}
