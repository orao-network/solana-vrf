import { Program, Provider, web3 } from "@project-serum/anchor";
import { IdlTypes, TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { IDL, OraoVrf } from "./types/orao_vrf";
import nacl from 'tweetnacl';

export const PROGRAM_ADDRESS: string = "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y";
export const PROGRAM_ID: web3.PublicKey = new web3.PublicKey(PROGRAM_ADDRESS);

export const RANDOMNESS_ACCOUNT_SEED: Buffer = Buffer.from("orao-vrf-randomness-request");
export const CONFIG_ACCOUNT_SEED: Buffer = Buffer.from("orao-vrf-network-configuration");

let networkStateAddress: web3.PublicKey | null = null;

/** Returns VRF configuration address */
export function networkStateAccountAddress(): web3.PublicKey {
    if (networkStateAddress === null) {
        networkStateAddress = web3.PublicKey.findProgramAddressSync([CONFIG_ACCOUNT_SEED], PROGRAM_ID)[0];
    }
    return networkStateAddress;
}

/**
 * Returns randomness account address for the given `seed`.
 * 
 * @param seed  Seed buffer.
*/
export function randomnessAccountAddress(seed: Buffer): web3.PublicKey {
    return web3.PublicKey.findProgramAddressSync([RANDOMNESS_ACCOUNT_SEED, seed], PROGRAM_ID)[0];
}

function quorum(count: number, total: number): boolean {
    return count >= Math.floor(total * 2 / 3 + 1)
}

interface IRandomnessResponse {
    pubkey: web3.PublicKey;
    randomness: number[];
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
    verifyOffchain(
        fulfillmentAuthorities: web3.PublicKey[],
    ): boolean {
        if (!quorum(this.responses.length, fulfillmentAuthorities.length)) {
            return false;
        }

        let expected_randomness = Buffer.alloc(64);
        for (const response of this.responses) {
            if (fulfillmentAuthorities.find(x => x.equals(response.pubkey)) === undefined) {
                return false;
            }

            if (!nacl.sign.detached.verify(response.randomness, this.seed, response.pubkey.toBytes())) {
                return false;
            }

            for (let i = 0; i < 64; i++) {
                expected_randomness[i] ^= response.randomness[i];
            }
        }

        return expected_randomness.equals(this.randomness);
    }
}

/** Orao VRF program */
export class Orao extends Program<OraoVrf> {
    constructor(provider: Provider) {
        super(IDL, PROGRAM_ID, provider);
    }

    /**
     * Returns VRF configuration (throws if not initialized).
     * 
     * @param commitment (optional) commitment level.
     */
    async getNetworkState(commitment?: web3.Commitment): Promise<TypeDef<OraoVrf["accounts"][0], IdlTypes<OraoVrf>>> {
        return await this.account.networkState.fetch(networkStateAccountAddress(), commitment);
    }

    /**
     * Returns randomness account data for the given seed (throws if account absent).
     * 
     * @param seed      Seed buffer.
     * @param commitment (optional) commitment level.
     */
    async getRandomness(seed: Buffer, commitment?: web3.Commitment): Promise<Randomness> {
        let randomness = await this.account.randomness.fetch(randomnessAccountAddress(seed), commitment);
        let responses = randomness.responses as IRandomnessResponse[];
        return new Randomness(randomness.seed, randomness.randomness, responses.map(x => new RandomnessResponse(x.pubkey, x.randomness)));
    }
}
