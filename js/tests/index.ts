import assert from "assert";
import { AnchorProvider, web3, BN } from "@project-serum/anchor";
import { Orao, networkStateAccountAddress, randomnessAccountAddress, PROGRAM_ADDRESS } from "../src";
import { describe, it } from "mocha"

describe("vrf", () => {
    const provider = AnchorProvider.local();
    const program = new Orao(provider);

    const networkState = networkStateAccountAddress();

    const fulfillmentAuthority = web3.Keypair.generate();

    it("get vrf program", async () => {
        assert.ok(program.programId.equals(new web3.PublicKey(PROGRAM_ADDRESS)));
    });

    it("init network", async () => {
        try {
            const networkStateAcc = await program.getNetworkState();
            console.log(networkStateAcc);
        } catch (e) {
            // not initialized
            const tx = await program.methods
                .initNetwork(
                    new BN(2 * web3.LAMPORTS_PER_SOL),
                    provider.publicKey,
                    [fulfillmentAuthority.publicKey],
                    null,
                )
                .accounts({
                    networkState,
                    treasury: provider.publicKey,
                })
                .rpc();
            console.log("InitNetwork transaction signature", tx);
        }
    })

    it("Request randomness", async () => {
        const seed = web3.Keypair.generate().publicKey.toBuffer();
        const networkStateAcc = await program.getNetworkState();

        const tx = await program.methods
            .request([...seed])
            .accounts({
                networkState,
                treasury: networkStateAcc.config.treasury,
                request: randomnessAccountAddress(seed),
            })
            .rpc();

        const randomnessAcc = await program.getRandomness(seed);

        assert.deepEqual([...randomnessAcc.seed], [...seed]);

        console.log("Your transaction signature", tx);
    })
});
