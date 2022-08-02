import { BN, Program, Provider, web3 } from "@project-serum/anchor";
import { Ed25519Program, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
    NetworkConfiguration,
    NetworkState,
    OraoTokenFeeConfig,
    Randomness,
    RandomnessResponse,
} from "./state";
import { IDL, OraoVrf } from "./types/orao_vrf";

export {
    Randomness,
    RandomnessResponse,
    NetworkConfiguration,
    NetworkState,
    OraoTokenFeeConfig,
} from "./state";

export const PROGRAM_ADDRESS: string = "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y";
export const PROGRAM_ID: web3.PublicKey = new web3.PublicKey(PROGRAM_ADDRESS);

export const RANDOMNESS_ACCOUNT_SEED: Buffer = Buffer.from("orao-vrf-randomness-request");
export const CONFIG_ACCOUNT_SEED: Buffer = Buffer.from("orao-vrf-network-configuration");

let networkStateAddress: web3.PublicKey | null = null;

/**
 * Returns VRF configuration address (see helper [[Orao.getNetworkState]]).
 *
 * ```typescript
 * const networkStateAddress = networkStateAccountAddress();
 * ```
 */
export function networkStateAccountAddress(): web3.PublicKey {
    if (networkStateAddress === null) {
        networkStateAddress = web3.PublicKey.findProgramAddressSync(
            [CONFIG_ACCOUNT_SEED],
            PROGRAM_ID
        )[0];
    }
    return networkStateAddress;
}

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
export function randomnessAccountAddress(seed: Buffer | Uint8Array): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync([RANDOMNESS_ACCOUNT_SEED, seed], PROGRAM_ID)[0];
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

interface IRandomnessResponse {
    pubkey: web3.PublicKey;
    randomness: number[];
}

/** Orao VRF program */
export class Orao extends Program<OraoVrf> {
    payer: web3.PublicKey;

    constructor(provider: Provider) {
        super(IDL, PROGRAM_ID, provider);
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
    async getNetworkState(commitment?: web3.Commitment): Promise<NetworkState> {
        let state = await this.account.networkState.fetch(networkStateAccountAddress(), commitment);
        let config = state.config;
        let tokenFeeConfig = config.tokenFeeConfig as OraoTokenFeeConfig | null;
        return new NetworkState(
            new NetworkConfiguration(
                state.config.authority,
                state.config.treasury,
                state.config.requestFee,
                state.config.fulfillmentAuthorities,
                tokenFeeConfig != null
                    ? new OraoTokenFeeConfig(
                          tokenFeeConfig.mint,
                          tokenFeeConfig.treasury,
                          tokenFeeConfig.fee
                      )
                    : null
            ),
            state.numReceived
        );
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
    async getRandomness(
        seed: Buffer | Uint8Array,
        commitment?: web3.Commitment
    ): Promise<Randomness> {
        let randomness = await this.account.randomness.fetch(
            randomnessAccountAddress(seed),
            commitment
        );
        let responses = randomness.responses as IRandomnessResponse[];
        return new Randomness(
            randomness.seed,
            randomness.randomness,
            responses.map((x) => new RandomnessResponse(x.pubkey, x.randomness))
        );
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
    async request(seed?: Buffer | Uint8Array): Promise<RequestBuilder> {
        let actualSeed: Buffer | Uint8Array;
        if (seed) {
            actualSeed = seed;
        } else {
            actualSeed = nacl.randomBytes(32);
        }

        return new RequestBuilder(this, actualSeed);
    }
}

export class InitBuilder {
    vrf: Orao;
    config: NetworkConfiguration;

    /**
     * Creates a new init_network instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param authority config update authority
     * @param treasury fee treasury
     * @param fulfillmentAuthorities list of authorized fulfillment authorities
     * @param requestFee request fee (in lamports)
     */
    constructor(
        vrf: Orao,
        authority: web3.PublicKey,
        treasury: web3.PublicKey,
        fulfillmentAuthorities: web3.PublicKey[],
        requestFee: BN
    ) {
        this.vrf = vrf;
        this.config = new NetworkConfiguration(
            authority,
            treasury,
            requestFee,
            fulfillmentAuthorities,
            null
        );
    }

    /** Change token fee configuration. */
    withTokenFeeConfig(tokenFeeConfig: OraoTokenFeeConfig): InitBuilder {
        this.config.tokenFeeConfig = tokenFeeConfig;
        return this;
    }

    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    async rpc(): Promise<string> {
        const networkState = networkStateAccountAddress();

        const tx = await this.vrf.methods
            .initNetwork(
                this.config.requestFee,
                this.config.authority,
                this.config.fulfillmentAuthorities,
                this.config.tokenFeeConfig
            )
            .accounts({
                networkState,
                treasury: this.config.treasury,
            })
            .rpc();

        return tx;
    }
}

export class UpdateBuilder {
    vrf: Orao;
    authority?: web3.PublicKey;
    treasury?: web3.PublicKey;
    requestFee?: BN;
    fulfillmentAuthorities?: web3.PublicKey[];
    tokenFeeConfig?: OraoTokenFeeConfig | null;

    /**
     * Creates a new update_network instruction builder that updates nothing.
     *
     * @param vrf ORAO VRF program instance.
     */
    constructor(vrf: Orao) {
        this.vrf = vrf;
    }

    /** Change configuration authority. */
    with_authority(authority: web3.PublicKey): UpdateBuilder {
        this.authority = authority;
        return this;
    }

    /** Change threasury account address. */
    with_treasury(treasury: web3.PublicKey): UpdateBuilder {
        this.treasury = treasury;
        return this;
    }

    /** Change fee (in lamports). */
    with_fee(requestFee: BN): UpdateBuilder {
        this.requestFee = requestFee;
        return this;
    }

    /** Change fulfillment authorities. */
    with_fulfillment_authorities(fulfillmentAuthorities: web3.PublicKey[]): UpdateBuilder {
        this.fulfillmentAuthorities = fulfillmentAuthorities;
        return this;
    }

    /** Change token fee configuration. */
    with_token_fee_config(tokenFeeConfig: OraoTokenFeeConfig): UpdateBuilder {
        this.tokenFeeConfig = tokenFeeConfig;
        return this;
    }

    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    async rpc(): Promise<string> {
        const networkState = networkStateAccountAddress();
        const config = (await this.vrf.getNetworkState()).config;

        let requestFee = this.requestFee ? this.requestFee : config.requestFee;
        let authority = this.authority ? this.authority : config.authority;
        let treasury = this.treasury ? this.treasury : config.treasury;
        let fulfillmentAuthorities = this.fulfillmentAuthorities
            ? this.fulfillmentAuthorities
            : config.fulfillmentAuthorities;
        let tokenFeeConfig =
            this.tokenFeeConfig !== undefined ? this.tokenFeeConfig : config.tokenFeeConfig;

        const tx = await this.vrf.methods
            .updateNetwork(requestFee, authority, fulfillmentAuthorities, tokenFeeConfig)
            .accounts({
                networkState,
                treasury,
            })
            .rpc();

        return tx;
    }
}

export class RequestBuilder {
    vrf: Orao;
    seed: Uint8Array;
    tokenWallet: web3.PublicKey | null;

    /**
     * Creates a randomness request builder (defaults to pay fees with SOL).
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: Orao, seed: Uint8Array) {
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
    payWithToken(tokenWallet: web3.PublicKey): RequestBuilder {
        this.tokenWallet = tokenWallet;
        return this;
    }

    /**
     * Performs an RPC call.
     *
     * @returns a pair of seed and signature.
     */
    async rpc(): Promise<[Uint8Array, string]> {
        const networkState = networkStateAccountAddress();
        const networkStateAcc = await this.vrf.getNetworkState();

        const tx = await this.vrf.methods
            .request([...this.seed])
            .accounts({
                networkState,
                treasury: networkStateAcc.config.treasury,
                request: randomnessAccountAddress(this.seed),
            })
            .rpc();

        return [this.seed, tx];
    }
}

export class FulfillBuilder {
    vrf: Orao;
    seed: Uint8Array;

    /**
     * Creates a fulfill instruction builder.
     *
     * @param vrf ORAO VRF program instance.
     * @param seed seed value (32 bytes).
     */
    constructor(vrf: Orao, seed: Uint8Array) {
        this.vrf = vrf;
        this.seed = seed;
    }

    /**
     * Performs an RPC call.
     *
     * @returns a transaction signature.
     */
    async rpc(fulfillmentAuthority: web3.PublicKey, signature: Uint8Array): Promise<string> {
        let tx = await this.vrf.methods
            .fulfill()
            .accounts({
                instructionAcc: SYSVAR_INSTRUCTIONS_PUBKEY,
                networkState: networkStateAccountAddress(),
                request: randomnessAccountAddress(this.seed),
            })
            .preInstructions([
                Ed25519Program.createInstructionWithPublicKey({
                    publicKey: fulfillmentAuthority.toBytes(),
                    message: this.seed,
                    signature,
                }),
            ])
            .rpc();

        return tx;
    }
}
