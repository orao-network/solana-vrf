import assert from "assert";
import * as anchor from "@project-serum/anchor";
import { Program, BN, Spl } from "@project-serum/anchor";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Ed25519Program,
} from "@solana/web3.js";
import { Orao, networkStateAccountAddress, randomnessAccountAddress } from "../../../../js/dist";
import { RussianRoulette } from "../target/types/russian_roulette";
import nacl from "tweetnacl";

describe("russian-roulette", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.RussianRoulette as Program<RussianRoulette>;
    const vrf = new Orao(provider);

    // This accounts are for test VRF.
    const treasury = Keypair.generate();
    const fulfillmentAuthority = Keypair.generate();

    // Initial force for russian-roulette
    let force = Keypair.generate().publicKey;
    // Player state account address won't change during the tests.
    const [playerState] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("russian-roulette-player-state"),
            provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
    );

    // This helper will play a single round of russian-roulette.
    async function spinAndPullTheTrigger(prevForce: Buffer, force: Buffer) {
        const prevRound = randomnessAccountAddress(prevForce);
        const random = randomnessAccountAddress(force);

        await program.methods
            .spinAndPullTheTrigger([...force])
            .accounts({
                player: provider.wallet.publicKey,
                playerState,
                prevRound,
                vrf: vrf.programId,
                config: networkStateAccountAddress(),
                treasury: treasury.publicKey,
                random,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
    }

    // This helper will fulfill randomness for our test VRF.
    async function emulateFulfill(seed: Buffer) {
        let signature = nacl.sign.detached(seed, fulfillmentAuthority.secretKey);
        await vrf.methods
            .fulfill()
            .accounts({
                instructionAcc: SYSVAR_INSTRUCTIONS_PUBKEY,
                networkState: networkStateAccountAddress(),
                request: randomnessAccountAddress(seed),
            })
            .preInstructions([
                Ed25519Program.createInstructionWithPublicKey({
                    publicKey: fulfillmentAuthority.publicKey.toBytes(),
                    message: seed,
                    signature,
                }),
            ])
            .rpc();
    }


    before(async () => {
        // Initialize test VRF
        const fee = 2 * LAMPORTS_PER_SOL;
        const fullfillmentAuthorities = [
            fulfillmentAuthority.publicKey,
        ];
        const configAuthority = Keypair.generate();

        await vrf.methods
            .initNetwork(
                new BN(fee),
                configAuthority.publicKey,
                fullfillmentAuthorities,
                null
            )
            .accounts({
                networkState: networkStateAccountAddress(),
                treasury: treasury.publicKey,
            })
            .rpc();
    });

    it("spin and pull the trigger", async () => {
        await spinAndPullTheTrigger(Buffer.alloc(32), force.toBuffer());

        const playerStateAcc = await program.account.playerState.fetch(playerState);

        assert.ok(Buffer.from(playerStateAcc.force).equals(force.toBuffer()));
        assert.ok(playerStateAcc.rounds.eq(new BN(1)));
    });

    it("play until dead", async () => {
        let currentNumberOfRounds = 1;
        let prevForce = force;

        while (true) {
            await emulateFulfill(force.toBuffer());

            const randomness = await vrf.getRandomness(force.toBuffer());
            assert.ok(!Buffer.from(randomness.randomness).equals(Buffer.alloc(64)));

            if (Buffer.from(randomness.randomness).readBigUInt64LE() % BigInt(6) === BigInt(0)) {
                console.log("The player is dead");
                break;
            } else {
                console.log("The player is alive");
            }

            // Run another round
            prevForce = force;
            force = Keypair.generate().publicKey;
            await spinAndPullTheTrigger(prevForce.toBuffer(), force.toBuffer());

            const playerStateAcc = await program.account.playerState.fetch(playerState);

            assert.ok(Buffer.from(playerStateAcc.force).equals(force.toBuffer()));
            assert.ok(playerStateAcc.rounds.eq(new BN(++currentNumberOfRounds)));
        }
    });

    it("can't play anymore", async () => {
        const prevForce = force;
        force = Keypair.generate().publicKey;
        try {
            await spinAndPullTheTrigger(prevForce.toBuffer(), force.toBuffer());
        } catch (e) {
            assert.equal(e.error.errorCode.code, 'PlayerDead');
            return
        }

        assert.ok(false, "Instruction invocation should fail");
    });
});
