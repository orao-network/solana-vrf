import { BN, IdlAccounts, IdlTypes, web3 } from "@coral-xyz/anchor";
import {
    networkStateAddress,
    PROGRAM_ID,
    requestAccountAddress,
    requestAltAccountAddress,
} from ".";
import { OraoVrfCb } from "./types/orao_vrf_cb";
import { sha256 } from "@noble/hashes/sha2";

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

    static fromRawData(data: IdlTypes<OraoVrfCb>["response"]): Response {
        return new Response(data.pubkey, data.randomness);
    }
}

/** Helper struct representing the fulfilled subset of the {@link RequestAccount}/{@link RequestAltAccount} */
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
 * A PDA allocated for every randomness request with Address Lookup Tables support.
 *
 * Holds request metadata and state.
 */
export class RequestAltAccount {
    /** Request account bump */
    bump: number;
    /** The slot at which the request was made */
    slot: BN;
    /** The client created the request. */
    client: web3.PublicKey;
    /** Request seed */
    seed: Uint8Array;
    /** The state of this randomness request */
    state: RequestAltState;

    constructor(
        bump: number,
        slot: BN,
        client: web3.PublicKey,
        seed: number[] | Uint8Array,
        state: RequestAltState,
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
        return requestAltAccountAddress(client, seed, vrf_id);
    }

    /** See {@link requestAccountAddress} */
    static createAddress(
        client: web3.PublicKey,
        seed: Uint8Array,
        bump: number,
        vrf_id: web3.PublicKey = PROGRAM_ID,
    ): [web3.PublicKey, number] {
        return requestAltAccountAddress(client, seed, bump, vrf_id);
    }

    static fromRawAccount(
        accountData: IdlAccounts<OraoVrfCb>["requestAltAccount"],
    ): RequestAltAccount {
        let state =
            "pending" in accountData.state
                ? new PendingAlt(
                      accountData.state.pending["0"].responses.map(Response.fromRawData),
                      accountData.state.pending["0"].callback
                          ? ValidatedCallbackAlt.fromRawData(
                                accountData.state.pending["0"].callback,
                            )
                          : null,
                      accountData.state.pending["0"].lookupTables,
                  )
                : new Fulfilled(
                      accountData.state.fulfilled["0"].randomness,
                      accountData.state.fulfilled["0"].responses
                          ? accountData.state.fulfilled["0"].responses.map(Response.fromRawData)
                          : null,
                  );

        return new RequestAltAccount(
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
    getPending(): PendingAlt | null {
        return "randomness" in this.state ? null : this.state;
    }

    /** Returns fulfilled state (or `null` if this request is still pending) */
    getFulfilled(): Fulfilled | null {
        return "randomness" in this.state ? this.state : null;
    }
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
                      accountData.state.pending["0"].responses.map(Response.fromRawData),
                      accountData.state.pending["0"].callback
                          ? ValidatedCallback.fromRawData(accountData.state.pending["0"].callback)
                          : null,
                      accountData.state.pending["0"].callbackOverride,
                  )
                : new Fulfilled(
                      accountData.state.fulfilled["0"].randomness,
                      accountData.state.fulfilled["0"].responses
                          ? accountData.state.fulfilled["0"].responses.map(Response.fromRawData)
                          : null,
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
export type RequestAltState = PendingAlt | Fulfilled;

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

/** Represents a state of a pending randomness request {@link RequestAltAccount.state } */
export class PendingAlt {
    /** Responses collected so far */
    responses: Response[];
    /** Callback (if any) */
    callback: ValidatedCallbackAlt | null;
    /** Lookup Tables given to the callback */
    lookupTables: web3.PublicKey[];

    constructor(
        responses: Response[],
        callback: ValidatedCallbackAlt | null,
        lookupTables: web3.PublicKey[],
    ) {
        this.responses = responses;
        this.callback = callback;
        this.lookupTables = lookupTables;
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

    static fromRawData(data: IdlTypes<OraoVrfCb>["validatedCallback"]): ValidatedCallback {
        return new ValidatedCallback(
            data.remainingAccounts.map(ValidatedRemainingAccount.fromRawData),
            Array.isArray(data.data) ? new Uint8Array(data.data) : data.data,
        );
    }
}

/**
 * This is a validated callback stored on-chain (see {@link Callback}).
 */
export class ValidatedCallbackAlt {
    /// This hash is used to validate the lookup accounts.
    accountsHash: Uint8Array;
    /// Remaining accounts.
    remainingAccounts: ValidatedRemainingAccountAlt[];
    /// Callback data.
    data: Uint8Array;

    constructor(
        accountsHash: Uint8Array | number[],
        remainingAccounts: ValidatedRemainingAccountAlt[],
        data: Uint8Array | number[],
    ) {
        this.accountsHash = Array.isArray(accountsHash)
            ? new Uint8Array(accountsHash)
            : accountsHash;
        this.remainingAccounts = remainingAccounts;
        this.data = Array.isArray(data) ? new Uint8Array(data) : data;
    }

    static fromRawData(data: IdlTypes<OraoVrfCb>["validatedCallbackAlt"]): ValidatedCallbackAlt {
        return new ValidatedCallbackAlt(
            Array.isArray(data.accountsHash)
                ? new Uint8Array(data.accountsHash)
                : data.accountsHash,
            data.remainingAccounts.map((x: IdlTypes<OraoVrfCb>["validatedRemainingAccountAlt"]) => {
                return "lookup" in x
                    ? ValidatedLookupAccount.fromRawData(x.lookup[0])
                    : ValidatedRemainingAccount.fromRawData(x.plain[0]);
            }),
            Array.isArray(data.data) ? new Uint8Array(data.data) : data.data,
        );
    }

    /**
     * Resolves lookup accounts back to plain accounts (see {@link compileAccounts}).
     *
     * @param lookupTables - the list of lookup tables given upon compilation
     */
    decompile(lookupTables: web3.AddressLookupTableAccount[]): ValidatedRemainingAccount[] {
        const accountsHashData = Buffer.alloc(32 * this.remainingAccounts.length);
        const output: ValidatedRemainingAccount[] = [];
        for (const account of this.remainingAccounts) {
            if ("tableIndex" in account) {
                let table = lookupTables[account.tableIndex];
                if (!table) {
                    throw new Error("Table index out of bounds");
                }
                let address = table.state.addresses[account.addressIndex];
                if (!table) {
                    throw new Error("Address index out of bounds");
                }
                output.push({ pubkey: address, isWritable: account.isWritable });
            } else {
                output.push(account);
            }
        }

        for (let i = 0; i < output.length; i++) {
            output[i].pubkey.toBuffer().copy(accountsHashData, 32 * i);
        }

        let expectedHash = Buffer.from(sha256(accountsHashData));

        if (!expectedHash.equals(this.accountsHash)) {
            throw new Error(
                `accountsHash mismatch ${expectedHash.toString("hex")} != ${Buffer.from(this.accountsHash).toString("hex")} `,
            );
        }

        return output;
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

    static fromRawData(
        data: IdlTypes<OraoVrfCb>["validatedRemainingAccount"],
    ): ValidatedRemainingAccount {
        return new ValidatedRemainingAccount(data.pubkey, data.isWritable);
    }
}

type ValidatedRemainingAccountAlt = ValidatedRemainingAccount | ValidatedLookupAccount;

/** This is a validated remaining account stored on-chain (see {@link RemainingAccount}) */
export class ValidatedLookupAccount {
    tableIndex: number;
    addressIndex: number;
    isWritable: boolean;

    constructor(tableIndex: number, addressIndex: number, isWritable: boolean) {
        this.tableIndex = tableIndex;
        this.addressIndex = addressIndex;
        this.isWritable = isWritable;
    }

    static fromRawData(data: IdlTypes<OraoVrfCb>["validatedLookupAccount"]) {
        return new ValidatedLookupAccount(data.tableIndex, data.addressIndex, data.isWritable);
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
