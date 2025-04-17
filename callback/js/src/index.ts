import { BN, IdlAccounts, Instruction, Program, Provider, web3 } from "@coral-xyz/anchor";
import {
    Ed25519Program,
    ComputeBudgetProgram,
    TransactionInstruction,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    AccountMeta,
    AddressLookupTableAccount,
} from "@solana/web3.js";
import {
    FulfilledRequestAccount,
    NetworkConfiguration,
    NetworkState,
    RequestAccount,
    Client,
    ValidatedCallback,
    ValidatedRemainingAccount,
    Callback,
    RequestAltAccount,
} from "./state";
import { OraoVrfCb } from "./types/orao_vrf_cb";
import IDL from "./types/orao_vrf_cb.json";
import { MethodsBuilder } from "@coral-xyz/anchor/dist/cjs/program/namespace/methods";
import { AllInstructionsMap, IdlTypes } from "@coral-xyz/anchor/dist/cjs/program/namespace/types";
import { decodeUpgradeableLoaderState } from "@coral-xyz/anchor/dist/cjs/utils/registry";
import { sha256 } from "@noble/hashes/sha2";

export { Provider, MethodsBuilder, web3 };

export * from "./state";

export { IDL, OraoVrfCb };

/**
 * Address of a deployed Callback VRF
 */
export const PROGRAM_ADDRESS: string = IDL.address;

/**
 * Id of a deployed Callback VRF
 */
export const PROGRAM_ID: web3.PublicKey = new web3.PublicKey(PROGRAM_ADDRESS);

/**
 * Maximum supported number of fulfill authorities.
 */
export const MAX_FULFILLMENT_AUTHORITIES: number = 10;

export const CB_CONFIG_ACCOUNT_SEED: Buffer = Buffer.from("OraoVrfCbConfig");
export const CB_CLIENT_ACCOUNT_SEED: Buffer = Buffer.from("OraoVrfCbClient");
export const CB_REQUEST_ACCOUNT_SEED: Buffer = Buffer.from("OraoVrfCbRequest");
export const CB_REQUEST_ALT_ACCOUNT_SEED: Buffer = Buffer.from("OraoVrfCbRequestAlt");

/**
 * Creates VRF Configuration PDA address (see helper {@link OraoCb.getNetworkState}).
 *
 * ```typescript
 * const [address, bump] = networkStateAddress(knownBump);
 * assert!(bump === knownBump);
 * ```
 *
 * @param bump - known PDA bump
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function networkStateAddress(
    bump: number,
    vrf_id?: web3.PublicKey,
): [web3.PublicKey, number];

/**
 * Finds VRF Configuration PDA address (see helper {@link OraoCb.getNetworkState}).
 *
 * ```typescript
 * const [address, bump] = networkStateAddress();
 * ```
 *
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function networkStateAddress(vrf_id?: web3.PublicKey): [web3.PublicKey, number];
export function networkStateAddress(
    bump?: number | web3.PublicKey,
    vrf_id: web3.PublicKey = PROGRAM_ID,
): [web3.PublicKey, number] {
    if ("number" === typeof bump) {
        return [
            web3.PublicKey.createProgramAddressSync(
                [CB_CONFIG_ACCOUNT_SEED, new Uint8Array([bump])],
                vrf_id,
            ),
            bump,
        ];
    } else if (bump !== undefined) {
        vrf_id = bump;
    }
    return web3.PublicKey.findProgramAddressSync([CB_CONFIG_ACCOUNT_SEED], vrf_id);
}

/**
 * Creates Client PDA address for the given `program` and `state`.
 * (see helper {@link OraoCb.getClient}).
 *
 * ```typescript
 * const [address, bump] = clientAddress(program, state, knownBump);
 * assert(bump === knownBump);
 * ```
 *
 * @param program program address.
 * @param state program's side client state address.
 * @param bump - known PDA bump
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function clientAddress(
    program: web3.PublicKey,
    state: web3.PublicKey,
    bump: number,
    vrf_id?: web3.PublicKey,
): [web3.PublicKey, number];

/**
 * Finds Client PDA address for the given `program` and `state`.
 * (see helper {@link OraoCb.getClient}).
 *
 * ```typescript
 * const [address, bump] = clientAddress(program, state);
 * ```
 *
 * @param program program address.
 * @param state program's side client state address.
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function clientAddress(
    program: web3.PublicKey,
    state: web3.PublicKey,
    vrf_id?: web3.PublicKey,
): [web3.PublicKey, number];
export function clientAddress(
    program: web3.PublicKey,
    state: web3.PublicKey,
    bump?: number | web3.PublicKey,
    vrf_id = PROGRAM_ID,
): [web3.PublicKey, number] {
    let seeds = [CB_CLIENT_ACCOUNT_SEED, program.toBuffer(), state.toBuffer()];
    if ("number" === typeof bump) {
        return [
            web3.PublicKey.createProgramAddressSync([...seeds, new Uint8Array([bump])], vrf_id),
            bump,
        ];
    } else {
        if (bump !== undefined) {
            vrf_id = bump;
        }
        return web3.PublicKey.findProgramAddressSync(seeds, vrf_id);
    }
}

/**
 * Creates RequestAltAccount PDA address and bump for the given `client` and `seed`
 * (see helper {@link OraoCb.getRequestAltAccount}).
 *
 * ```typescript
 * const [address, bump] = requestAltAccountAddress(client, seed, knownBump);
 * assert(bump === knownBump);
 * ```
 *
 * @param client client address.
 * @param seed seed buffer.
 * @param bump known PDA bump.
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function requestAltAccountAddress(
    client: web3.PublicKey,
    seed: Buffer | Uint8Array,
    bump: number,
    vrf_id?: web3.PublicKey,
): [web3.PublicKey, number];
/**
 * Finds RequestAltAccount PDA address and bump for the given `client` and `seed`
 * (see helper {@link OraoCb.getRequestAltAccount}).
 *
 * ```typescript
 * const [address, bump] = requestAltAccountAddress(client, seed);
 * ```
 *
 * @param client client address.
 * @param seed seed buffer.
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function requestAltAccountAddress(
    client: web3.PublicKey,
    seed: Buffer | Uint8Array,
    vrf_id?: web3.PublicKey,
): [web3.PublicKey, number];
export function requestAltAccountAddress(
    client: web3.PublicKey,
    seed: Buffer | Uint8Array,
    bump?: number | web3.PublicKey,
    vrf_id = PROGRAM_ID,
): [web3.PublicKey, number] {
    let seeds = [CB_REQUEST_ALT_ACCOUNT_SEED, client.toBuffer(), seed];
    if ("number" === typeof bump) {
        return [
            web3.PublicKey.createProgramAddressSync([...seeds, new Uint8Array([bump])], vrf_id),
            bump,
        ];
    } else {
        if (bump !== undefined) {
            vrf_id = bump;
        }
        return web3.PublicKey.findProgramAddressSync(seeds, vrf_id);
    }
}

/**
 * Creates RequestAccount PDA address and bump for the given `client` and `seed`
 * (see helper {@link OraoCb.getRequestAccount}).
 *
 * ```typescript
 * const [address, bump] = requestAccountAddress(client, seed, knownBump);
 * assert(bump === knownBump);
 * ```
 *
 * @param client client address.
 * @param seed seed buffer.
 * @param bump known PDA bump.
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function requestAccountAddress(
    client: web3.PublicKey,
    seed: Buffer | Uint8Array,
    bump: number,
    vrf_id?: web3.PublicKey,
): [web3.PublicKey, number];
/**
 * Finds RequestAccount PDA and bump for the given `client` and `seed`
 * (see helper {@link OraoCb.getRequestAccount}).
 *
 * ```typescript
 * const [address, bump] = requestAccountAddress(client, seed);
 * ```
 *
 * @param client client address.
 * @param seed seed buffer.
 * @param [vrf_id=PROGRAM_ID] - you can override the program ID.
 */
export function requestAccountAddress(
    client: web3.PublicKey,
    seed: Buffer | Uint8Array,
    vrf_id?: web3.PublicKey,
): [web3.PublicKey, number];
export function requestAccountAddress(
    client: web3.PublicKey,
    seed: Buffer | Uint8Array,
    bump?: number | web3.PublicKey,
    vrf_id = PROGRAM_ID,
): [web3.PublicKey, number] {
    let seeds = [CB_REQUEST_ACCOUNT_SEED, client.toBuffer(), seed];
    if ("number" === typeof bump) {
        return [
            web3.PublicKey.createProgramAddressSync([...seeds, new Uint8Array([bump])], vrf_id),
            bump,
        ];
    } else {
        if (bump !== undefined) {
            vrf_id = bump;
        }
        return web3.PublicKey.findProgramAddressSync(seeds, vrf_id);
    }
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

/**
 * Compiles given `accounts` to a pair of `RemainingAccountAlt[]` and accountsHash
 * given the list of lookup tables.
 *
 * This helper function can be used to populate the `CallbackAlt` structure fields.
 */
export function compileAccounts(
    accounts: IdlTypes<OraoVrfCb>["remainingAccount"],
    lookupTables: AddressLookupTableAccount[],
): [IdlTypes<OraoVrfCb>["remainingAccountAlt"][], Uint8Array] {
    let accountsHashData = Buffer.alloc(32 * accounts.length, 0);
    const out = [];

    top: for (const account of accounts) {
        account.pubkey.toBuffer().copy(accountsHashData, 32 * out.length);
        for (let i in lookupTables) {
            const table = lookupTables[i];
            for (let j in table.state.addresses) {
                const address = table.state.addresses[j];
                if (address.equals(account.pubkey)) {
                    out.push({
                        lookup: {
                            0: {
                                tableIndex: i,
                                addressIndex: j,
                                seeds: account.seeds,
                            },
                        },
                    });
                    continue top;
                }
            }
        }

        out.push({
            plain: {
                0: account,
            },
        });
    }

    return [out, sha256(accountsHashData)];
}

/** Orao VRF program */
export class OraoCb extends Program<OraoVrfCb> {
    readonly _payer: web3.PublicKey;
    get payer(): web3.PublicKey {
        return this._payer;
    }

    /**
     * Constructs a new program given the provider.
     *
     * Make sure to choose the desired {@link web3.Commitment} when building your provider.
     *
     * @param provider - an object that implements the {@link Provider} interface.
     *     Make sure it uses the desired `CommitmentLevel`.
     * @param [id=PROGRAM_ID] - you can override the program ID.
     */
    constructor(provider: Provider, id = PROGRAM_ID) {
        super(IDL as OraoVrfCb, provider);
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
     * console.log("Request fee is " + state.config.requestFee);
     * ```
     *
     * @param commitment - you can override the provider's commitment level.
     */
    async getNetworkState(commitment?: web3.Commitment): Promise<NetworkState> {
        let state = await this.account.networkState.fetch(
            networkStateAddress(this.programId)[0],
            commitment,
        );
        let config = state.config;
        return new NetworkState(
            state.bump,
            new NetworkConfiguration(
                config.authority,
                config.treasury,
                config.requestFee,
                config.callbackDeadline,
                config.fulfillAuthorities,
            ),
            state.numRequests,
            state.numRegistered,
            state.numTerminated,
        );
    }

    /**
     * Returns client PDA (or `null` if missing).
     *
     * ```typescript
     * const client = await vrf.getClient(programAddress, stateAddress);
     * console.log("Client:" + client);
     * ```
     *
     * @param program - client program address
     * @param state - client state address
     * @param commitment - you can override the provider's commitment level.
     */
    async getClient(
        program: web3.PublicKey,
        state: web3.PublicKey,
        commitment?: web3.Commitment,
    ): Promise<Client>;
    /**
     * Returns client PDA (or `null` if missing).
     *
     * Throws if unable to deserialize.
     *
     * ```typescript
     * const client = await vrf.getClient(clientAddress);
     * console.log("Client:" + client);
     * ```
     *
     * @param client - client PDA address
     * @param commitment - you can override the provider's commitment level.
     */
    async getClient(client: web3.PublicKey, commitment?: web3.Commitment): Promise<Client>;
    async getClient(
        arg1: web3.PublicKey,
        arg2?: web3.PublicKey | web3.Commitment,
        commitment?: web3.Commitment,
    ): Promise<Client> {
        let client = arg1;
        if (arg2 instanceof web3.PublicKey) {
            client = clientAddress(arg1, arg2, this.programId)[0];
        } else if (arg2) {
            commitment = arg2;
        }
        let account = await this.account.client.fetch(client, commitment);
        let callback = account.callback
            ? new ValidatedCallback(
                  account.callback.remainingAccounts.map(
                      (a: { pubkey: web3.PublicKey; isWritable: boolean }) =>
                          new ValidatedRemainingAccount(a.pubkey, a.isWritable),
                  ),
                  account.callback.data,
              )
            : null;
        return new Client(
            account.bump,
            account.owner,
            account.program,
            account.state,
            account.numRequests,
            callback,
        );
    }

    /**
     * Returns request account data for the given client and seed (or `null` if missing).
     *
     * ```typescript
     * const requestAccount = await vrf.getRequestAccount(clientAddress, seed);
     * const fulfilled = requestAccount.getFulfilled();
     * if (fulfilled == null) {
     *     console.error("Randomness is not yet fulfilled");
     * } else {
     *     console.log("Randomness is fulfilled " + bs58.encode(fulfilled.randomness));
     * }
     * ```
     *
     * @param client - client address
     * @param seed - seed buffer
     * @param commitment - you can override the provider's commitment level.
     */
    async getRequestAccount(
        client: web3.PublicKey,
        seed: Uint8Array,
        commitment?: web3.Commitment,
    ): Promise<RequestAccount | null>;
    /**
     * Returns request account data at the given address (or `null` if missing).
     *
     * Throws if account couldn't be decoded.
     *
     * ```typescript
     * const requestAccount = await vrf.getRequestAccount(accountAddress);
     * const fulfilled = requestAccount.getFulfilled();
     * if (fulfilled == null) {
     *     console.error("Randomness is not yet fulfilled");
     * } else {
     *     console.log("Randomness is fulfilled " + bs58.encode(fulfilled.randomness));
     * }
     * ```
     *
     * @param accountAddress - request account address.
     * @param commitment - you can override the provider's commitment level.
     */
    async getRequestAccount(
        accountAddress: web3.PublicKey,
        commitment?: web3.Commitment,
    ): Promise<RequestAccount | null>;
    async getRequestAccount(
        arg1: web3.PublicKey,
        arg2?: Uint8Array | web3.Commitment,
        commitment?: web3.Commitment,
    ): Promise<RequestAccount | null> {
        let accountAddress = arg1;
        if ("string" !== typeof arg2 && arg2 !== undefined) {
            accountAddress = requestAccountAddress(arg1, arg2, this.programId)[0];
        }
        let requestAccount = await this.account.requestAccount.fetchNullable(
            accountAddress,
            commitment,
        );
        if (requestAccount === null) {
            return null;
        }

        return requestAccount === null ? null : RequestAccount.fromRawAccount(requestAccount);
    }

    /**
     * Returns request account data for the given client and seed (or `null` if missing).
     *
     * ```typescript
     * const requestAccount = await vrf.getRequestAltAccount(clientAddress, seed);
     * const fulfilled = requestAccount.getFulfilled();
     * if (fulfilled == null) {
     *     console.error("Randomness is not yet fulfilled");
     * } else {
     *     console.log("Randomness is fulfilled " + bs58.encode(fulfilled.randomness));
     * }
     * ```
     *
     * @param client - client address
     * @param seed - seed buffer
     * @param commitment - you can override the provider's commitment level.
     */
    async getRequestAltAccount(
        client: web3.PublicKey,
        seed: Uint8Array,
        commitment?: web3.Commitment,
    ): Promise<RequestAltAccount | null>;
    /**
     * Returns request account data at the given address (or `null` if missing).
     *
     * Throws if account couldn't be decoded.
     *
     * ```typescript
     * const requestAccount = await vrf.getRequestAccount(accountAddress);
     * const fulfilled = requestAccount.getFulfilled();
     * if (fulfilled == null) {
     *     console.error("Randomness is not yet fulfilled");
     * } else {
     *     console.log("Randomness is fulfilled " + bs58.encode(fulfilled.randomness));
     * }
     * ```
     *
     * @param accountAddress - request account address.
     * @param commitment - you can override the provider's commitment level.
     */
    async getRequestAltAccount(
        accountAddress: web3.PublicKey,
        commitment?: web3.Commitment,
    ): Promise<RequestAltAccount | null>;
    async getRequestAltAccount(
        arg1: web3.PublicKey,
        arg2?: Uint8Array | web3.Commitment,
        commitment?: web3.Commitment,
    ): Promise<RequestAltAccount | null> {
        let accountAddress = arg1;
        if ("string" !== typeof arg2 && arg2 !== undefined) {
            accountAddress = requestAltAccountAddress(arg1, arg2, this.programId)[0];
        }
        let requestAccount = await this.account.requestAltAccount.fetchNullable(
            accountAddress,
            commitment,
        );
        if (requestAccount === null) {
            return null;
        }

        return requestAccount === null ? null : RequestAltAccount.fromRawAccount(requestAccount);
    }

    /**
     * Waits for the given randomness to be fulfilled.
     *
     * @param client - client address
     * @param seed - seed
     * @param requestKind - whether it is regular request or ALT request
     * @param commitment - you can override the provider's commitment level.
     */
    async waitFulfilled(
        client: web3.PublicKey,
        seed: Buffer | Uint8Array,
        requestKind: "regular" | "alt",
        commitment?: web3.Commitment,
    ): Promise<FulfilledRequestAccount>;
    /**
     * Waits for the given randomness to be fulfilled.
     *
     * @param accountAddress - randomness account address
     * @param commitment - you can override the provider's commitment level.
     */
    async waitFulfilled(
        accountAddress: web3.PublicKey,
        commitment?: web3.Commitment,
    ): Promise<FulfilledRequestAccount>;
    async waitFulfilled(
        arg1: web3.PublicKey,
        arg2?: Buffer | Uint8Array | web3.Commitment,
        commitment?: web3.Commitment | "regular" | "alt",
    ): Promise<FulfilledRequestAccount> {
        let accountAddress = arg1;
        if ("string" !== typeof arg2 && arg2 !== undefined) {
            if (commitment == "regular") {
                accountAddress = requestAccountAddress(arg1, arg2, this.programId)[0];
            } else {
                accountAddress = requestAltAccountAddress(arg1, arg2, this.programId)[0];
            }
        }
        let actualCommitment = this.provider.connection.commitment;
        if (commitment && commitment != "regular" && commitment != "alt") {
            actualCommitment = commitment;
        }

        return new Promise(async (_resolve, reject) => {
            let resolved = false;

            let maybeResolve = (
                subscriptionId: number,
                requestAccount: RequestAccount | RequestAltAccount,
            ) => {
                if (requestAccount.getFulfilled() === null) {
                    return;
                }
                if (resolved) {
                    return;
                }
                resolved = true;
                this.provider.connection.removeAccountChangeListener(subscriptionId);
                _resolve(requestAccount as FulfilledRequestAccount);
            };

            try {
                let subscriptionId = this.provider.connection.onAccountChange(
                    accountAddress,
                    (accountInfo, _ctx) => {
                        try {
                            let decoded: IdlAccounts<OraoVrfCb>["requestAccount"] =
                                this.coder.accounts.decode("requestAccount", accountInfo.data);
                            maybeResolve(subscriptionId, RequestAccount.fromRawAccount(decoded));
                        } catch {
                            let decoded: IdlAccounts<OraoVrfCb>["requestAltAccount"] =
                                this.coder.accounts.decode("requestAltAccount", accountInfo.data);
                            maybeResolve(subscriptionId, RequestAltAccount.fromRawAccount(decoded));
                        }
                    },
                    { commitment: actualCommitment },
                );

                // In case it's already fulfilled
                let rawAccount = await this.provider.connection.getAccountInfo(
                    accountAddress,
                    actualCommitment,
                );
                if (rawAccount) {
                    try {
                        let decoded: IdlAccounts<OraoVrfCb>["requestAccount"] =
                            this.coder.accounts.decode("requestAccount", rawAccount.data);
                        maybeResolve(subscriptionId, RequestAccount.fromRawAccount(decoded));
                    } catch {
                        let decoded: IdlAccounts<OraoVrfCb>["requestAltAccount"] =
                            this.coder.accounts.decode("requestAltAccount", rawAccount.data);
                        maybeResolve(subscriptionId, RequestAltAccount.fromRawAccount(decoded));
                    }
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Returns available client balance.
     * @param client — client PDA address
     */
    async clientBalance(client: web3.PublicKey): Promise<BN>;

    /**
     * Returns available client balance.
     * @param program — client program address
     * @param state — client state address
     */
    async clientBalance(program: web3.PublicKey, state: web3.PublicKey): Promise<BN>;
    async clientBalance(acc1: web3.PublicKey, acc2?: web3.PublicKey): Promise<BN> {
        if (!acc2) {
            let account = await this.provider.connection.getAccountInfo(acc1);
            let rent = await this.provider.connection.getMinimumBalanceForRentExemption(
                account?.data.length || 0,
            );
            return account?.lamports ? new BN(account.lamports - rent) : new BN(0);
        } else {
            let [client] = clientAddress(acc1, acc2, this.programId);
            return await this.clientBalance(client);
        }
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
                this.computeUnitPriceMultiplier,
            );
            if (fee !== null) {
                instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee }));
            }
        }

        if (this.computeUnitLimit !== null) {
            instructions.push(
                ComputeBudgetProgram.setComputeUnitLimit({ units: this.computeUnitLimit }),
            );
        }

        return instructions;
    }
}

/**
 * A convenient builder for the `Initialize` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link InitializeBuilder.withComputeUnitPrice} and {@link InitializeBuilder.withComputeUnitLimit}
 * to opt-out)
 *
 * @hidden
 */
export class InitializeBuilder {
    vrf: OraoCb;
    requestFee: BN;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a new init_network instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param requestFee request fee (in lamports)
     */
    constructor(vrf: OraoCb, requestFee: BN) {
        this.vrf = vrf;
        this.requestFee = requestFee;
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
    withComputeUnitPrice(computeUnitPrice: bigint): InitializeBuilder {
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
    withComputeUnitPriceMultiplier(multiplier: number): InitializeBuilder {
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
    withComputeUnitLimit(computeUnitLimit: number): InitializeBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `Initialize` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link InitializeBuilder.withComputeUnitPrice} and
     * {@link InitializeBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrfCb, AllInstructionsMap<OraoVrfCb>["initialize"]>> {
        const networkState = networkStateAddress(this.vrf.programId)[0];

        let params = { requestFee: this.requestFee };
        let accounts = { networkState };
        let tx = this.vrf.methods.initialize(params).accountsPartial(accounts);

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection),
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
 * A convenient builder for the `Configure` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link ConfigureBuilder.withComputeUnitPrice} and {@link ConfigureBuilder.withComputeUnitLimit}
 * to opt-out)
 *
 * @hidden
 */
export class ConfigureBuilder {
    vrf: OraoCb;
    newConfig: NetworkConfiguration;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a new `Configure` instruction.
     *
     * @param vrf ORAO VRF program instance.
     */
    constructor(vrf: OraoCb, newConfig: NetworkConfiguration) {
        this.vrf = vrf;
        this.newConfig = newConfig;
    }

    /** Change configuration authority. */
    withAuthority(authority: web3.PublicKey): ConfigureBuilder {
        this.newConfig.authority = authority;
        return this;
    }

    /** Change treasury account address. */
    withTreasury(treasury: web3.PublicKey): ConfigureBuilder {
        this.newConfig.treasury = treasury;
        return this;
    }

    /** Change fee (in lamports). */
    withFee(requestFee: BN): ConfigureBuilder {
        this.newConfig.requestFee = requestFee;
        return this;
    }

    /** Change callback deadline (in slots). */
    withCallbackDeadline(callbackDeadline: BN): ConfigureBuilder {
        this.newConfig.callbackDeadline = callbackDeadline;
        return this;
    }

    /** Change fulfill authorities. */
    withFulfillAuthorities(fulfillAuthorities: web3.PublicKey[]): ConfigureBuilder {
        this.newConfig.fulfillAuthorities = fulfillAuthorities;
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
    withComputeUnitPrice(computeUnitPrice: bigint): ConfigureBuilder {
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
    withComputeUnitPriceMultiplier(multiplier: number): ConfigureBuilder {
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
    withComputeUnitLimit(computeUnitLimit: number): ConfigureBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `UpdateNetwork` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link ConfigureBuilder.withComputeUnitPrice} and
     * {@link ConfigureBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrfCb, AllInstructionsMap<OraoVrfCb>["configure"]>> {
        const networkState = networkStateAddress(this.vrf.programId)[0];

        let params = { newConfig: this.newConfig };
        let accounts = { networkState };
        let tx = this.vrf.methods.configure(params).accountsPartial(accounts);

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection),
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
 * A convenient builder for the `Register` instruction.
 *
 * This instruction registers a new Callback VRF client. Every registration is performed for
 * a pair of accounts:
 * 1. Program account — it's a client program address capable of doing
 *    requests and handling callbacks (if any).
 * 2. State account — it's an arbitrary PDA belonging to the client program that becomes
 *    a request authority, i.e. it must sign the `Request` CPI calls,
 *
 * Note that same program can be registered many times as long as unique state accounts are used
 * for every registration.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RegisterBuilder.withComputeUnitPrice} and {@link RegisterBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class RegisterBuilder {
    vrf: OraoCb;
    program: web3.PublicKey;
    state: web3.PublicKey;
    stateSeeds: Array<Uint8Array>;
    callback: Callback | null;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a `Register` instruction builder with empty client-level callback.
     *
     * @param vrf ORAO VRF program instance.
     * @param program program being registered
     * @param state the state PDA of a client being registered
     * @param stateSeeds `state` seeds and bump
     */
    constructor(
        vrf: OraoCb,
        program: web3.PublicKey,
        state: web3.PublicKey,
        stateSeeds: Array<Uint8Array>,
    ) {
        this.vrf = vrf;
        this.program = program;
        this.state = state;
        this.stateSeeds = stateSeeds;
        this.callback = null;
    }

    /** Sets the client-level callback */
    withCallback(callback: Callback | null) {
        this.callback = callback;
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
    withComputeUnitPrice(computeUnitPrice: bigint): RegisterBuilder {
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
    withComputeUnitPriceMultiplier(multiplier: number): RegisterBuilder {
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
    withComputeUnitLimit(computeUnitLimit: number): RegisterBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `Register` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link RegisterBuilder.withComputeUnitPrice} and
     * {@link RegisterBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrfCb, AllInstructionsMap<OraoVrfCb>["register"]>> {
        const networkState = networkStateAddress(this.vrf.programId)[0];
        const client = clientAddress(this.program, this.state, this.vrf.programId)[0];

        const clientProgramAccount = await this.vrf.provider.connection.getAccountInfo(
            this.program,
        );

        if (clientProgramAccount === null) {
            throw new Error("Client program not found");
        }

        const clientProgramData = decodeUpgradeableLoaderState(clientProgramAccount.data).program
            .programdataAddress;

        let params = { stateSeeds: this.stateSeeds, callback: this.callback };
        let accounts = {
            program: this.program,
            programData: clientProgramData,
            state: this.state,
            client,
            networkState,
        };

        let tx = this.vrf.methods.register(params).accountsPartial(accounts);

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection),
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
        const tx_signature = await tx.rpc();

        return tx_signature;
    }
}

/**
 * A convenient builder for the `SetCallback` instruction.
 *
 * This instruction updates the client-level callback for a client (see {@link Callback});
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RegisterBuilder.withComputeUnitPrice} and {@link RegisterBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class SetCallbackBuilder {
    vrf: OraoCb;
    client: web3.PublicKey;
    newCallback: Callback | null;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a `SetCallback` instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param client
     * @param newCallback new client-level callback
     */
    constructor(vrf: OraoCb, client: web3.PublicKey, newCallback: Callback | null) {
        this.vrf = vrf;
        this.client = client;
        this.newCallback = newCallback;
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
    withComputeUnitPrice(computeUnitPrice: bigint): SetCallbackBuilder {
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
    withComputeUnitPriceMultiplier(multiplier: number): SetCallbackBuilder {
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
    withComputeUnitLimit(computeUnitLimit: number): SetCallbackBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `SetCallback` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link SetCallbackBuilder.withComputeUnitPrice} and
     * {@link SetCallbackBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<
        MethodsBuilder<OraoVrfCb, AllInstructionsMap<OraoVrfCb>["setCallback"]>
    > {
        let params = { newCallback: this.newCallback };
        let accounts = {
            client: this.client,
        };

        let tx = this.vrf.methods.setCallback(params).accountsPartial(accounts);

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection),
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
        const tx_signature = await tx.rpc();

        return tx_signature;
    }
}

/**
 * A convenient builder for the `Transfer` instruction.
 *
 * This instruction transfers client ownership to another account. Client owner is able
 * to update client-level callback and withdraw client funds.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RegisterBuilder.withComputeUnitPrice} and {@link RegisterBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class TransferBuilder {
    vrf: OraoCb;
    client: web3.PublicKey;
    newOwner: web3.PublicKey;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a `Transfer` instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param client
     * @param newOwner new client owner
     */
    constructor(vrf: OraoCb, client: web3.PublicKey, newOwner: web3.PublicKey) {
        this.vrf = vrf;
        this.client = client;
        this.newOwner = newOwner;
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
    withComputeUnitPrice(computeUnitPrice: bigint): TransferBuilder {
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
    withComputeUnitPriceMultiplier(multiplier: number): TransferBuilder {
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
    withComputeUnitLimit(computeUnitLimit: number): TransferBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `Transfer` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link TransferBuilder.withComputeUnitPrice} and
     * {@link TransferBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrfCb, AllInstructionsMap<OraoVrfCb>["transfer"]>> {
        let params = { newOwner: this.newOwner };
        let accounts = {
            client: this.client,
        };

        let tx = this.vrf.methods.transfer(params).accountsPartial(accounts);

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection),
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
        const tx_signature = await tx.rpc();

        return tx_signature;
    }
}

/**
 * A convenient builder for the `Withdraw` instruction.
 *
 * This instructions withdraw funds from the {@link Client} PDA account. Note that you won't
 * be able to withdraw past the rent exemption — use {@link OraoCb.clientBalance} to
 * get the available balance.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RegisterBuilder.withComputeUnitPrice} and {@link RegisterBuilder.withComputeUnitLimit}
 * to opt-out)
 */
export class WithdrawBuilder {
    vrf: OraoCb;
    client: web3.PublicKey;
    amount: BN;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a `Withdraw` instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param client
     * @param amount amount to withdraw (in lamports)
     */
    constructor(vrf: OraoCb, client: web3.PublicKey, amount: BN) {
        this.vrf = vrf;
        this.client = client;
        this.amount = amount;
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
    withComputeUnitPrice(computeUnitPrice: bigint): WithdrawBuilder {
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
    withComputeUnitPriceMultiplier(multiplier: number): WithdrawBuilder {
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
    withComputeUnitLimit(computeUnitLimit: number): WithdrawBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    /**
     * Returns a {@link MethodsBuilder} instance for the `Withdraw` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link WithdrawBuilder.withComputeUnitPrice} and
     * {@link WithdrawBuilder.withComputeUnitLimit} to opt-out).
     */
    async build(): Promise<MethodsBuilder<OraoVrfCb, AllInstructionsMap<OraoVrfCb>["withdraw"]>> {
        let params = { amount: this.amount };
        let accounts = {
            client: this.client,
        };

        let tx = this.vrf.methods.withdraw(params).accountsPartial(accounts);

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection),
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
        const tx_signature = await tx.rpc();

        return tx_signature;
    }
}

/**
 * A convenient builder for the `Fulfill` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RegisterBuilder.withComputeUnitPrice} and {@link RegisterBuilder.withComputeUnitLimit}
 * to opt-out)
 *
 * @hidden
 */
export class FulfillBuilder {
    vrf: OraoCb;
    client: web3.PublicKey;
    seed: Uint8Array;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param client the client that made the request
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: OraoCb, client: web3.PublicKey, seed: Uint8Array) {
        this.vrf = vrf;
        this.client = client;
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
     * Returns a {@link MethodsBuilder} instance for the `Fulfill` instruction.
     *
     * Note, that compute budget instructions will be prepended to the returned
     * instance (use {@link FulfillBuilder.withComputeUnitPrice} and
     * {@link FulfillBuilder.withComputeUnitLimit} to opt-out).
     *
     * @param fulfillAuthority - public key of a fulfill authority
     * @param signature - signature of a `client || seed`, performed by the fulfill authority
     */
    async build(
        fulfillAuthority: web3.PublicKey,
        signature: Uint8Array,
    ): Promise<MethodsBuilder<OraoVrfCb, AllInstructionsMap<OraoVrfCb>["fulfill"]>> {
        const networkState = networkStateAddress(this.vrf.programId)[0];

        const clientAccount = await this.vrf.account.client.fetch(this.client);
        const requestAccount = await this.vrf.getRequestAccount(this.client, this.seed);

        if (requestAccount === null) {
            throw new Error("RequestAccount not found");
        }

        const pending = requestAccount.getPending();
        if (pending === null) {
            throw new Error("Already fulfilled");
        }

        let params = {};
        let accounts = {
            program: clientAccount.program,
            state: clientAccount.state,
            client: this.client,
            request: requestAccountAddress(this.client, this.seed, requestAccount.bump)[0],
            networkState,
            instructionAcc: SYSVAR_INSTRUCTIONS_PUBKEY,
        };

        let remainingAccounts: Array<AccountMeta> = [];
        if (pending.callback) {
            for (const account of pending.callback.remainingAccounts) {
                remainingAccounts.push({
                    pubkey: account.pubkey,
                    isSigner: false,
                    isWritable: account.isWritable,
                });
            }
        }

        let tx = this.vrf.methods
            .fulfill(params)
            .accountsPartial(accounts)
            .remainingAccounts(remainingAccounts);

        if (!this.computeBudgetConfig.isEmpty()) {
            tx = tx.preInstructions(
                await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection),
            );
        }

        let message = new Uint8Array([...this.client.toBuffer(), ...this.seed]);
        tx = tx.preInstructions([
            Ed25519Program.createInstructionWithPublicKey({
                publicKey: fulfillAuthority.toBytes(),
                message,
                signature,
            }),
        ]);

        return tx;
    }

    /**
     * Performs an RPC call.
     *
     * @param fulfillAuthority - public key of a fulfill authority
     * @param signature - signature of a `client || seed`, performed by the fulfill authority
     *
     * @returns a transaction signature.
     */
    async rpc(fulfillAuthority: web3.PublicKey, signature: Uint8Array): Promise<string> {
        let tx = await this.build(fulfillAuthority, signature);
        const tx_signature = await tx.rpc();

        return tx_signature;
    }
}

/**
 * A convenient builder for the `FulfillAlt` instruction.
 *
 * Note that by default it will guess and apply a prioritization fee (see
 * {@link RegisterBuilder.withComputeUnitPrice} and {@link RegisterBuilder.withComputeUnitLimit}
 * to opt-out)
 *
 * @hidden
 */
export class FulfillAltBuilder {
    vrf: OraoCb;
    client: web3.PublicKey;
    seed: Uint8Array;
    private computeBudgetConfig: ComputeBudgetConfig = new ComputeBudgetConfig();

    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param client the client that made the request
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: OraoCb, client: web3.PublicKey, seed: Uint8Array) {
        this.vrf = vrf;
        this.client = client;
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
    withComputeUnitPrice(computeUnitPrice: bigint): FulfillAltBuilder {
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
    withComputeUnitPriceMultiplier(multiplier: number): FulfillAltBuilder {
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
    withComputeUnitLimit(computeUnitLimit: number): FulfillAltBuilder {
        this.computeBudgetConfig.computeUnitLimit = computeUnitLimit;
        return this;
    }

    async build_instructions(
        fulfillAuthority: web3.PublicKey,
        signature: Uint8Array,
        lookup_tables: AddressLookupTableAccount[],
    ): Promise<TransactionInstruction[]> {
        const networkState = networkStateAddress(this.vrf.programId)[0];

        const clientAccount = await this.vrf.account.client.fetch(this.client);
        const requestAccount = await this.vrf.getRequestAltAccount(this.client, this.seed);

        if (requestAccount === null) {
            throw new Error("RequestAccount not found");
        }

        const pending = requestAccount.getPending();
        if (pending === null) {
            throw new Error("Already fulfilled");
        }

        let params = {};
        let accounts = {
            program: clientAccount.program,
            state: clientAccount.state,
            client: this.client,
            request: requestAltAccountAddress(this.client, this.seed, requestAccount.bump)[0],
            networkState,
            instructionAcc: SYSVAR_INSTRUCTIONS_PUBKEY,
        };

        let remainingAccounts: Array<AccountMeta> = lookup_tables.map((x) => ({
            pubkey: x.key,
            isSigner: false,
            isWritable: false,
        }));
        if (pending.callback) {
            remainingAccounts = [
                ...remainingAccounts,
                ...pending.callback.decompile(lookup_tables).map((x) => ({
                    pubkey: x.pubkey,
                    isSigner: false,
                    isWritable: x.isWritable,
                })),
            ];
        }

        let fulfillAltInstruction = await this.vrf.methods
            .fulfillAlt(params)
            .accountsPartial(accounts)
            .remainingAccounts(remainingAccounts)
            .instruction();

        let instructions: TransactionInstruction[] = [];

        if (!this.computeBudgetConfig.isEmpty()) {
            instructions.push(
                ...(await this.computeBudgetConfig.getInstructions(this.vrf.provider.connection)),
            );
        }

        let message = new Uint8Array([...this.client.toBuffer(), ...this.seed]);
        instructions.push(
            Ed25519Program.createInstructionWithPublicKey({
                publicKey: fulfillAuthority.toBytes(),
                message,
                signature,
            }),
        );

        instructions.push(fulfillAltInstruction);

        return instructions;
    }
}

async function get_recommended_micro_lamport_fee(
    connection: web3.Connection,
    computeUnitPrice: bigint | null,
    computeUnitPriceMultiplier: number | null,
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
