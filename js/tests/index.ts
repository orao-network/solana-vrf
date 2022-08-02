import assert from "assert";
import { AnchorProvider, web3, BN } from "@project-serum/anchor";
import {
    Orao,
    networkStateAccountAddress,
    PROGRAM_ADDRESS,
    NetworkState,
    InitBuilder,
} from "../src";
import { describe, it } from "mocha";

describe("vrf", () => {
    const provider = AnchorProvider.local();
    const program = new Orao(provider);

    const networkState = networkStateAccountAddress();

    const fulfillmentAuthority = web3.Keypair.fromSeed(Buffer.alloc(32));

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
                provider.publicKey,
                [fulfillmentAuthority.publicKey],
                new BN(2 * web3.LAMPORTS_PER_SOL)
            ).rpc();
            console.log("InitNetwork transaction signature", tx);
            networkStateAcc = await program.getNetworkState();
        }
        assert.ok(networkStateAcc.config.authority.equals(provider.publicKey));
        assert.ok(networkStateAcc.config.treasury.equals(provider.publicKey));
        assert.ok(networkStateAcc.config.requestFee.eq(new BN(2 * web3.LAMPORTS_PER_SOL)));
        assert.deepEqual(networkStateAcc.config.fulfillmentAuthorities, [
            fulfillmentAuthority.publicKey,
        ]);
    });

    it("Request randomness", async () => {
        const [seed, tx] = await (await program.request()).rpc();

        const randomnessAcc = await program.getRandomness(seed);
        assert.deepEqual([...randomnessAcc.seed], [...seed]);

        console.log("Your transaction signature", tx);
    });
});
