import assert from "assert";
import { AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import {
    Orao,
    networkStateAccountAddress,
    PROGRAM_ADDRESS,
    NetworkState,
    InitBuilder,
    FulfillBuilder,
} from "../src";
import { describe, it } from "mocha";
import nacl from "tweetnacl";

describe("vrf", () => {
    const provider = AnchorProvider.env();
    const program = new Orao(provider);

    let seed = nacl.randomBytes(32);
    const fulfillmentAuthority = web3.Keypair.fromSeed(Buffer.alloc(32));

    let initialBalance = 0;
    let balanceAfterRequest = 0;
    let balanceAfterFulfill = 0;
    let networkState: NetworkState;

    it("get vrf program", async () => {
        assert.ok(program.programId.equals(new web3.PublicKey(PROGRAM_ADDRESS)));
    });

    it("init network", async () => {
        let networkStateAcc: NetworkState;
        try {
            networkStateAcc = await program.getNetworkState();
        } catch (e) {
            // not initialized
            const tx = await new InitBuilder(
                program,
                provider.publicKey,
                fulfillmentAuthority.publicKey,
                [fulfillmentAuthority.publicKey],
                new BN(2 * web3.LAMPORTS_PER_SOL)
            ).rpc();
            console.log("InitNetwork transaction signature", tx);
            networkStateAcc = await program.getNetworkState();
        }
        assert.ok(networkStateAcc.config.authority.equals(provider.publicKey));
        assert.ok(networkStateAcc.config.treasury.equals(fulfillmentAuthority.publicKey));
        assert.ok(networkStateAcc.config.requestFee.eq(new BN(2 * web3.LAMPORTS_PER_SOL)));
        assert.deepEqual(networkStateAcc.config.fulfillmentAuthorities, [
            fulfillmentAuthority.publicKey,
        ]);

        initialBalance = await provider.connection.getBalance(provider.publicKey);
        networkState = await program.getNetworkState();
    });

    it("Request randomness", async () => {
        const [_, tx] = await (await program.request(seed)).rpc();

        const randomnessAcc = await program.getRandomness(seed);
        const accountSeed = randomnessAcc.getSeed();
        const client = randomnessAcc.getClient()?.toBytes() || new Uint8Array(32);
        assert.deepEqual([...accountSeed], [...seed]);
        assert.deepEqual([...client], [...provider.publicKey.toBytes()]);

        console.log("Your transaction signature", tx);
        balanceAfterRequest = await provider.connection.getBalance(provider.publicKey);
    });

    it("Fulfills randomness", async () => {
        let signature = nacl.sign.detached(seed, fulfillmentAuthority.secretKey);
        const tx = await new FulfillBuilder(program, seed).rpc(
            fulfillmentAuthority.publicKey,
            signature
        );

        const randomnessAcc = await program.getRandomness(seed);
        const accountSeed = randomnessAcc.getSeed();
        const randomness = randomnessAcc.getFulfilledRandomness() || new Uint8Array(64);
        assert.deepEqual([...accountSeed], [...seed]);
        assert.deepEqual([...randomness], [...signature]);

        console.log("Fulfilled", randomness);

        balanceAfterFulfill = await provider.connection.getBalance(provider.publicKey);

        assert(initialBalance > balanceAfterRequest, "request isn't free");
        assert(balanceAfterFulfill > balanceAfterRequest, "extra funds are reimbursed");
        console.log(
            initialBalance - balanceAfterFulfill - networkState.config.requestFee <
                web3.LAMPORTS_PER_SOL / 50,
            "request cost is less than 0.002 SOL"
        );
    });
});
