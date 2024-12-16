import { BN, IdlAccounts, web3 } from "@coral-xyz/anchor";
import { networkStateAddress, PROGRAM_ID, requestAccountAddress } from ".";
import { OraoVrfCb } from "./types/orao_vrf_cb";

/**
 * On-chain VRF state.
 */
export class NetworkState {
    /** Account bump */
    bump: number;
    /** Active configuration */
    config: NetworkConfiguration;
    /** Total number of received requests */
    numRequests: BN;
    /** Total number of registered clients */
    numRegistered: BN;
    /** Total number of terminated clients */
    numTerminated: BN;

    constructor(
        bump: number,
        config: NetworkConfiguration,
        numRequests: BN,
        numRegistered: BN,
        numTerminated: BN,
    ) {
        this.bump = bump;
        this.config = config;
        this.numRequests = numRequests;
        this.numRegistered = numRegistered;
        this.numTerminated = numTerminated;
    }

    /** See {@link networkStateAddress} */
    static findAddress(vrf_id: web3.PublicKey = PROGRAM_ID): [web3.PublicKey, number] {
        return networkStateAddress(vrf_id);
    }

    /** See {@link networkStateAddress} */
    static createAddress(
        bump: number,
        vrf_id: web3.PublicKey = PROGRAM_ID,
    ): [web3.PublicKey, number] {
        return networkStateAddress(bump, vrf_id);
    }
}

/**
 * On-chain VRF configuration.
 */
export class NetworkConfiguration {
    /** An authority */
    authority: web3.PublicKey;
    /** Treasury account address */
    treasury: web3.PublicKey;
    /** Per-request fee paid by a client */
    requestFee: BN;
    /**
     * Callback invocation deadline (in slots)
     *
     * This is to handle faulty callbacks — after this deadline the request will be fulfilled
     * without callback invocation.
     */
    callbackDeadline: BN;
    /**
     * A list of addresses authorized to fulfill requests.
     */
    fulfillAuthorities: web3.PublicKey[];

    constructor(
        authority: web3.PublicKey,
        treasury: web3.PublicKey,
        requestFee: BN,
        callbackDeadline: BN,
        fulfillAuthorities: web3.PublicKey[],
    ) {
        this.authority = authority;
        this.treasury = treasury;
        this.requestFee = requestFee;
        this.callbackDeadline = callbackDeadline;
        this.fulfillAuthorities = fulfillAuthorities;
    }
}

/**
 * Registered client PDA.
 *
 * This PDA is created by the Callback VRF upon new client registration.
 *
 * Note that the balance of this PDA is used to pay request fees and rent.
 */
export class Client {
    /** PDA bump */
    bump: number;
    /**
     * The owner is able to manage the client:
     *
     * -   withdraw client funds
     * -   transfer ownership
     * -   update client-level callback
     */
    owner: web3.PublicKey;
    /** An address of a registered program. */
    program: web3.PublicKey;
    /**
     * An arbitrary PDA that belongs to the client program.
     *
     * This is the request authority i.e. it signs the `Request` CPI call.
     */
    state: web3.PublicKey;
    /** Number of requests made by this client. */
    numRequests: BN;
    /**
     * An optional client-level callback.
     *
     * If it is `null`, then no callback will be called upon request fulfill, but you can
     * override this using the request-level callback (see {@link Callback}).
     *
     * You can update this value using the `SetCallback` instruction.
     */
    callback: ValidatedCallback | null;

    constructor(
        bump: number,
        owner: web3.PublicKey,
        program: web3.PublicKey,
        state: web3.PublicKey,
        numRequests: BN,
        callback: ValidatedCallback | null,
    ) {
        this.bump = bump;
        this.owner = owner;
        this.program = program;
        this.state = state;
        this.numRequests = numRequests;
        this.callback = callback;
    }
}

/**
 * Response of a single fulfill authority.
 */
export class Response {
    pubkey: web3.PublicKey;
    randomness: Uint8Array;

    constructor(pubkey: web3.PublicKey, randomness: number[] | Uint8Array) {
        this.pubkey = pubkey;
        this.randomness = Array.isArray(randomness) ? new Uint8Array(randomness) : randomness;
    }
}

/** Helper struct representing the fulfilled subset of the {@link RequestAccount} */
export interface FulfilledRequestAccount {
    /** Request account bump */
    bump: number;
    slot: BN;
    /** The client created the request. */
    client: web3.PublicKey;
    /** Request seed */
    seed: Uint8Array;
    /** The state of this randomness request */
    state: Fulfilled;
}

/**
 * A PDA allocated for every randomness request.
 *
 * Holds request metadata and state.
 */
export class RequestAccount {
    /** Request account bump */
    bump: number;
    /** The slot at which the request was made */
    slot: BN;
    /** The client created the request. */
    client: web3.PublicKey;
    /** Request seed */
    seed: Uint8Array;
    /** The state of this randomness request */
    state: RequestState;

    constructor(
        bump: number,
        slot: BN,
        client: web3.PublicKey,
        seed: number[] | Uint8Array,
        state: RequestState,
    ) {
        this.bump = bump;
        this.slot = slot;
        this.client = client;
        this.seed = Array.isArray(seed) ? new Uint8Array(seed) : seed;
        this.state = state;
    }

    /** See {@link requestAccountAddress} */
    static findAddress(
        client: web3.PublicKey,
        seed: Uint8Array,
        vrf_id: web3.PublicKey = PROGRAM_ID,
    ): [web3.PublicKey, number] {
        return requestAccountAddress(client, seed, vrf_id);
    }

    /** See {@link requestAccountAddress} */
    static createAddress(
        client: web3.PublicKey,
        seed: Uint8Array,
        bump: number,
        vrf_id: web3.PublicKey = PROGRAM_ID,
    ): [web3.PublicKey, number] {
        return requestAccountAddress(client, seed, bump, vrf_id);
    }

    static fromRawAccount(accountData: IdlAccounts<OraoVrfCb>["requestAccount"]): RequestAccount {
        let state =
            "pending" in accountData.state
                ? new Pending(
                      accountData.state.pending["0"].responses,
                      accountData.state.pending["0"].callback,
                      accountData.state.pending["0"].callbackOverride,
                  )
                : new Fulfilled(
                      accountData.state.fulfilled["0"].randomness,
                      accountData.state.fulfilled["0"].responses,
                  );

        return new RequestAccount(
            accountData.bump,
            accountData.slot,
            accountData.client,
            accountData.seed,
            state,
        );
    }

    /** Returns the request seed */
    getSeed(): Uint8Array {
        return this.seed;
    }

    /** Returns the {@link Client} PDA address */
    getClient(): web3.PublicKey {
        return this.client;
    }

    /** Returns pending state (or `null` if this request was fulfilled) */
    getPending(): Pending | null {
        return "randomness" in this.state ? null : this.state;
    }

    /** Returns fulfilled state (or `null` if this request is still pending) */
    getFulfilled(): Fulfilled | null {
        return "randomness" in this.state ? this.state : null;
    }
}

export type RequestState = Pending | Fulfilled;

/** Represents a state of a pending randomness request {@link RequestAccount.state } */
export class Pending {
    /** Responses collected so far */
    responses: Response[];
    /** Callback (if any) */
    callback: ValidatedCallback | null;
    /** If `true` then [`Pending::callback`] is a request-level callback */
    callbackOverride: boolean;

    constructor(
        responses: Response[],
        callback: ValidatedCallback | null,
        callbackOverride: boolean,
    ) {
        this.responses = responses;
        this.callback = callback;
        this.callbackOverride = callbackOverride;
    }

    isFulfilledBy(key: web3.PublicKey): boolean {
        return this.responses.find((response) => response.pubkey.equals(key)) !== undefined;
    }
}

/**
 * This is a validated callback stored on-chain (see {@link Callback}).
 */
export class ValidatedCallback {
    /// Remaining accounts.
    remainingAccounts: ValidatedRemainingAccount[];
    /// Callback data.
    data: Uint8Array;

    constructor(remainingAccounts: ValidatedRemainingAccount[], data: Uint8Array | number[]) {
        this.remainingAccounts = remainingAccounts;
        this.data = Array.isArray(data) ? new Uint8Array(data) : data;
    }
}

/** This is a validated remaining account stored on-chain (see {@link RemainingAccount}) */
export class ValidatedRemainingAccount {
    pubkey: web3.PublicKey;
    isWritable: boolean;

    constructor(pubkey: web3.PublicKey, isWritable: boolean) {
        this.pubkey = pubkey;
        this.isWritable = isWritable;
    }
}

/** Represents a state of a fulfilled randomness request {@link RequestAccount.state } */
export class Fulfilled {
    /**
     * Generated randomness.
     */
    randomness: Uint8Array;
    /**
     * Individual components of the resulting randomness.
     *
     * This os only available within the callback and otherwise always `null`.
     */
    responses: Response[] | null;

    constructor(randomness: Uint8Array | number[], responses: Response[] | null) {
        this.randomness = Array.isArray(randomness) ? new Uint8Array(randomness) : randomness;
        this.responses = responses;
    }
}

/**
 * A callback definition.
 *
 * This structure is used to define client-level or request-level callbacks:
 *
 * 1.  _client-level callback_ — defined upon the client registration and couldn't be avoided, but
 *     you can override it with the _request-level callback_. Additionally You can update the
 *     _client-level callback_ using the `SetCallback` instruction (see {@link SetCallbackBuilder}).
 * 2.  _request-level callback_ — overrides the _client-level callback_ (even if it is not defined).
 */
export class Callback {
    /**
     * Additional accounts to add to the callback CPI call.
     *
     * Every callback call will be invoked with the following accounts:
     *
     * -   the first one will always be the {@link Client} PDA (signer)
     * -   the second one will always be the client state PDA (writable)
     * -   the fourth one will always be the {@link NetworkState} PDA
     * -   the third one will always be the corresponding `RequestAccount` PDA
     * -   **subsequent accounts will be remaining accounts given here**
     */
    remainingAccounts: RemainingAccount[];
    /**
     * Borsh-serialized instruction data.
     *
     * This must be an instruction of a registered program.
     */
    data: Uint8Array;

    constructor(data: Uint8Array, remainingAccounts: RemainingAccount[] = []) {
        this.data = data;
        this.remainingAccounts = remainingAccounts;
    }
}

/**
 * An account to add to the callback invocation (see {@link Callback.remainingAccounts})
 */
export class RemainingAccount {
    /** Account address. */
    pubkey: web3.PublicKey;
    /**
     * Seeds to assert that this account belongs to the client program.
     *
     * This is used to set `isWritable` flag on the instruction account.
     * Only client program accounts could be writable.
     */
    seeds: Array<Uint8Array> | null;

    constructor(pubkey: web3.PublicKey, seeds: null) {
        this.pubkey = pubkey;
        this.seeds = seeds;
    }
}
