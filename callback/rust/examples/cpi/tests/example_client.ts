import * as anchor from "@coral-xyz/anchor";
import { Program, web3, BN } from "@coral-xyz/anchor";
import { ExampleClient } from "../target/types/example_client";
import { assert } from "chai";
import {
    InitializeBuilder,
    OraoCb,
    RegisterBuilder,
    clientAddress,
    ConfigureBuilder,
    FulfillBuilder,
    requestAccountAddress,
    NetworkState,
    TransferBuilder,
} from "@orao-network/solana-vrf-cb";
import testSecretKey from "../test_keypair.json";
import nacl from "tweetnacl";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const testKeyPair = web3.Keypair.fromSecretKey(new Uint8Array(testSecretKey));

/**
 * In this tests we first register an ExampleClient program as a VRF Client,
 * then show how to perform requests and use callbacks.
 *
 * Terminology:
 *
 * * client program — is a program registered as a Callback VRF client
 *                     It is able to perform randomness requests via CPI
 * * client account — is a PDA allocated by the Callback VRF on client registration
 *                     It holds client balance and used to pay request fees and rent
 *                     It also signs callback calls
 * * client state — is a PDA of a client program used during client registration
 *                   It is used to sign randomness requests.
 *                   The pair (client program, client state) uniquely identifies a registered
 *                   client — same client program may register multiple times as soon as it
 *                   uses different client states for every registration.
 * * callback — is a pair of serialized instruction data and list of additional accounts (might be blank).
 *               It is possible for a client to have client-level callback that is invoked on every
 *               fulfilled request, and a request-level callback that overrides the client-level callback.
 */
describe("example_client", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const exampleClient = anchor.workspace
        .ExampleClient as Program<ExampleClient>;

    /** We'll use VRF JavaScript SDK to simplify this tests */
    let vrf = new OraoCb(exampleClient.provider);

    /**
     * Let's find the client state address.
     *
     * We'll going to use this PDA to register our ExampleClient program as a VRF client.
     *
     * Note that you can register the same program multiple times as long as different
     * state PDAs are used for every registration. This account can hold arbitrary data,
     * in our case it will hold some fields to help as test the VRF behavior.
     */
    const [clientStateAddr, clientStateBump] =
        web3.PublicKey.findProgramAddressSync(
            [Buffer.from("CLIENT_STATE")],
            exampleClient.programId
        );

    /**
     * Let's find the additional account address.
     *
     * It is possible to give arbitrary accounts to the VRF callback,
     * but for an account to be writable it must be a PDA of the registered program.
     *
     * We'll going to use this account to test that writable callback accounts works as expected.
     */
    const [additionalAccountAddress, additionalAccountBump] =
        web3.PublicKey.findProgramAddressSync(
            [Buffer.from("ADDITIONAL_ACCOUNT")],
            exampleClient.programId
        );

    /**
     * Let's find the client PDA address on the VRF side.
     *
     * This account will be allocated as soon as we register a new client.
     *
     * As mentioned above, we'll going to register just once so this will
     * be the only VRF client account used in this tests.
     */
    const [clientAddr, clientBump] = clientAddress(
        exampleClient.programId,
        clientStateAddr
    );

    it("Initialize client program", async () => {
        /**
         * ClientProgram's initialization process just allocates the accounts
         *
         * See the source code and comments in
         *     `program/example-client/src/instructions/initialize.rs`
         *
         * See account definitions and comments in
         *     `program/example-client/src/state/client_state.rs`
         *     `program/example-client/src/state/additional_account.rs`
         */
        const tx = await exampleClient.methods.initialize().rpc();
        console.log("ClientProgram initialized in", tx);

        /** Let's assert that client state is properly allocated */
        let client_state = await exampleClient.account.clientState.fetch(
            clientStateAddr
        );
        assert.deepEqual(client_state, {
            bump: clientStateBump,
            clientLevelCallbackRandomness: [...Buffer.alloc(64)],
            clientLevelCallbackParam: 0,
            requestLevelCallbackRandomness: [...Buffer.alloc(64)],
            requestLevelCallbackParam: 0,
        });

        /** Let's assert that additional account is properly allocated */
        let additional_account =
            await exampleClient.account.additionalAccount.fetch(
                additionalAccountAddress
            );
        assert.deepEqual(additional_account, {
            bump: additionalAccountBump,
            randomness: [...Buffer.alloc(64)],
            param: 0,
        });
    });

    it("Register", async () => {
        /**
         * We are now ready to register a client.
         *
         * Note that only program owner is authorized for this (we don't need
         * to bother here because anchor's test environment matches this requirement).
         *
         * We'll use {@link RegisterBuilder} for convenience.
         *
         * Also note that we are not using {@link RegisterBuilder.withCallback} for now,
         * i.e. the new client won't have a client-level callback.
         */
        let builder = await new RegisterBuilder(
            vrf,
            exampleClient.programId, // the program we are registering
            clientStateAddr, // the state PDA we are using for registration
            // the state PDA seeds
            [Buffer.from("CLIENT_STATE"), Buffer.from([clientStateBump])]
        ).build();
        let tx = await builder.rpc();
        console.log("Registered in", tx);

        /** Let's assert that the client PDA was allocated on the VRF side */
        let client = await vrf.getClient(clientAddr);
        assert.equal(client.bump, clientBump);
        assert.equal(
            client.owner.toBase58(),
            exampleClient.provider.publicKey.toBase58()
        );
        assert.equal(
            client.program.toBase58(),
            exampleClient.programId.toBase58()
        );
        assert.equal(client.state.toBase58(), clientStateAddr.toBase58());
        assert(client.numRequests.eq(new BN(0)));
        assert.strictEqual(client.callback, null);
    });

    it("Basic request", async () => {
        /**
         * Our program is now registered, but before doing any request we need
         * to fund the client PDA, since it will pay VRF fees.
         */
        let transfer = new web3.Transaction().add(
            web3.SystemProgram.transfer({
                fromPubkey: vrf.provider.publicKey,
                toPubkey: clientAddr,
                lamports: web3.LAMPORTS_PER_SOL * 1,
            })
        );
        await vrf.provider.sendAndConfirm(transfer);

        /**
         * We are now ready to preform our first request. Requests are made
         * via CPI.
         *
         * Let's test the default behavior, i.e. request will be fulfilled
         * but no callback will be called because our client is registered
         * without client-level callback and we won't give the request-level
         * callback.
         *
         * See the source code and comments in
         *     `program/example-client/src/instructions/request.rs`
         */
        let networkState = await vrf.getNetworkState();
        let seed = nacl.randomBytes(32);
        let requestAddr = requestAccountAddress(clientAddr, seed)[0];
        let tx = await exampleClient.methods
            .request([...seed], null)
            .accountsPartial({
                vrf: vrf.programId,
                clientState: clientStateAddr,
                client: clientAddr,
                networkState: NetworkState.createAddress(networkState.bump)[0],
                treasury: networkState.config.treasury,
                request: requestAddr,
            })
            .rpc();
        console.log("Requested in", tx);

        /**
         * Let's assert that the randomness is actually fulfilled and that no callback was called.
         *
         * Wait fulfilled is an off-chain helper function to wait for fulfilled randomness.
         * You can also listen for the `fulfilled` event.
         */
        let fulfilled = await vrf.waitFulfilled(clientAddr, seed);
        assert(Buffer.from(fulfilled.seed).equals(seed)); // seed matches
        assert.equal(fulfilled.state.randomness.length, 64); // randomness size
        assert(!Buffer.alloc(64).equals(fulfilled.state.randomness)); // randomness is not zeroed
        console.log("Fulfilled:", bs58.encode(fulfilled.state.randomness));
        let { clientLevelCallbackRandomness, requestLevelCallbackRandomness } =
            await exampleClient.account.clientState.fetch(clientStateAddr);
        assert.deepEqual(clientLevelCallbackRandomness, [...Buffer.alloc(64)]); // client-level callback wasn't called
        assert.deepEqual(requestLevelCallbackRandomness, [...Buffer.alloc(64)]); // request-level callback wasn't called
    });

    let previousClientLevelCallbackRandomness: number[];
    it("Request with client-level callback", async () => {
        /**
         * Let's test the client-level callback.
         *
         * Note that our client was register without client-level callback
         * so to set one up we need to call the `SetCallback` VRF instruction.
         */
        let ixCode = new anchor.BorshInstructionCoder(exampleClient.idl);
        let tx = await vrf.methods
            .setCallback({
                newCallback: {
                    remainingAccounts: [], // no remaining accounts in this test
                    // borsh-encoded callback instruction data
                    data: ixCode.encode("clientLevelCallback", {
                        testParameter: 42,
                    }),
                },
            })
            .accountsPartial({
                client: clientAddr,
            })
            .rpc();
        console.log("Callback updated in", tx);

        /**
         * Now let's perform another request and assert that the callback was called.
         *
         * See the source code and comments in
         *     `program/example-client/src/instructions/request.rs`
         */
        let networkState = await vrf.getNetworkState();
        let seed = nacl.randomBytes(32);
        let requestAddr = requestAccountAddress(clientAddr, seed)[0];
        tx = await exampleClient.methods
            .request([...seed], null)
            .accountsPartial({
                vrf: vrf.programId,
                clientState: clientStateAddr,
                client: clientAddr,
                networkState: NetworkState.createAddress(networkState.bump)[0],
                treasury: networkState.config.treasury,
                request: requestAddr,
            })
            .rpc();
        console.log("Requested in", tx);

        let fulfilled = await vrf.waitFulfilled(clientAddr, seed);
        assert(Buffer.from(fulfilled.seed).equals(seed)); // seed matches
        assert.equal(fulfilled.state.randomness.length, 64); // randomness size
        assert(!Buffer.alloc(64).equals(fulfilled.state.randomness)); // randomness is not zeroed
        console.log("Fulfilled:", bs58.encode(fulfilled.state.randomness));
        let {
            clientLevelCallbackRandomness,
            requestLevelCallbackRandomness,
            clientLevelCallbackParam,
        } = await exampleClient.account.clientState.fetch(clientStateAddr);
        assert(
            Buffer.from(clientLevelCallbackRandomness).equals(
                fulfilled.state.randomness
            )
        ); // client-level callback was called
        assert.equal(clientLevelCallbackParam, 42); // client-level callback parameter was given to the callback
        assert.deepEqual(requestLevelCallbackRandomness, [...Buffer.alloc(64)]); // request-level callback wasn't called

        // save some values for the next test
        previousClientLevelCallbackRandomness = clientLevelCallbackRandomness;
    });

    it("Request with request-level callback (no additional account)", async () => {
        /**
         * Our client now have client-level callback registered (see previous test),
         * but we can override one using the request-level callback.
         *
         * > Note that it is also possible to use request-level callback
         * > even if client have no client-level callback.
         *
         * The override logic is implemented in the {@link ExampleClient}'s `request` instruction,
         * so from the offchain-perspective we only need to give the following optional input parameter.
         *
         * See the source code and comments in
         *     `program/example-client/src/instructions/request.rs`
         */
        let howToOverride = {
            parameter: 7, // this param will be given to the `requestLevelCallbackInstruction`
            sendAdditionalAccount: false, // no additional account this time
        };
        let networkState = await vrf.getNetworkState();
        let seed = nacl.randomBytes(32);
        let requestAddr = requestAccountAddress(clientAddr, seed)[0];
        let tx = await exampleClient.methods
            .request([...seed], howToOverride)
            .accountsPartial({
                vrf: vrf.programId,
                clientState: clientStateAddr,
                client: clientAddr,
                networkState: NetworkState.createAddress(networkState.bump)[0],
                treasury: networkState.config.treasury,
                request: requestAddr,
            })
            .rpc();
        console.log("Requested in", tx);

        /**
         * Now let's assert that the request-level callback was called
         * and that the client-level callback wasn't called.
         */
        let fulfilled = await vrf.waitFulfilled(clientAddr, seed);
        assert(Buffer.from(fulfilled.seed).equals(seed)); // seed matches
        assert.equal(fulfilled.state.randomness.length, 64); // randomness size
        assert(!Buffer.alloc(64).equals(fulfilled.state.randomness)); // randomness is not zeroed
        console.log("Fulfilled:", bs58.encode(fulfilled.state.randomness));
        let {
            clientLevelCallbackRandomness,
            requestLevelCallbackRandomness,
            requestLevelCallbackParam,
        } = await exampleClient.account.clientState.fetch(clientStateAddr);
        assert.deepEqual(
            clientLevelCallbackRandomness,
            previousClientLevelCallbackRandomness
        ); // client-level callback wasn't called
        assert(
            Buffer.from(requestLevelCallbackRandomness).equals(
                fulfilled.state.randomness
            ) && requestLevelCallbackParam === howToOverride.parameter
        ); // request-level callback was called
        let { randomness, param } =
            await exampleClient.account.additionalAccount.fetch(
                additionalAccountAddress
            );
        assert(Buffer.from(randomness).equals(Buffer.alloc(64)) && param === 0); // additional account wasn't involved in the request-level callback
    });

    it("Request with request-level callback (with additional writable account)", async () => {
        /**
         * This test is the same as the previous one, but now we given an additional
         * writable account to the request-level callback.
         *
         * > Note that it is also possible to use additional accounts
         * > with a client-level callback
         *
         * The override logic is implemented in the {@link ExampleClient}'s `request` instruction,
         * so from the offchain-perspective we only need to give the following optional input parameter.
         *
         * See the source code and comments in
         *     `program/example-client/src/instructions/request.rs`
         */
        let howToOverride = {
            parameter: 111, // this param will be given to the `requestLevelCallbackInstruction`
            sendAdditionalAccount: true, // now we specify that additional account must be given
        };
        let networkState = await vrf.getNetworkState();
        let seed = nacl.randomBytes(32);
        let requestAddr = requestAccountAddress(clientAddr, seed)[0];
        let tx = await exampleClient.methods
            .request([...seed], howToOverride)
            .accountsPartial({
                vrf: vrf.programId,
                clientState: clientStateAddr,
                client: clientAddr,
                networkState: NetworkState.createAddress(networkState.bump)[0],
                treasury: networkState.config.treasury,
                request: requestAddr,
            })
            .rpc();
        console.log("Requested in", tx);

        /**
         * Let's assert that the request-level callback was called,
         * that the client-level callback wasn't called
         * and that the additional account was updated according to the callback logic.
         */
        let fulfilled = await vrf.waitFulfilled(clientAddr, seed);
        assert(Buffer.from(fulfilled.seed).equals(seed)); // seed matches
        assert.equal(fulfilled.state.randomness.length, 64); // randomness size
        assert(!Buffer.alloc(64).equals(fulfilled.state.randomness)); // randomness is not zeroed
        console.log("Fulfilled:", bs58.encode(fulfilled.state.randomness));
        let {
            clientLevelCallbackRandomness,
            requestLevelCallbackRandomness,
            requestLevelCallbackParam,
        } = await exampleClient.account.clientState.fetch(clientStateAddr);
        assert.deepEqual(
            clientLevelCallbackRandomness,
            previousClientLevelCallbackRandomness
        ); // client-level callback wasn't called
        assert(
            Buffer.from(requestLevelCallbackRandomness).equals(
                fulfilled.state.randomness
            ) && requestLevelCallbackParam === howToOverride.parameter
        ); // request-level callback was called
        let { randomness, param } =
            await exampleClient.account.additionalAccount.fetch(
                additionalAccountAddress
            );
        assert(
            Buffer.from(randomness).equals(fulfilled.state.randomness) &&
                param === howToOverride.parameter
        ); // additional account wasn't involved in the request-level callback
    });

    it("Withdraw client funds", async () => {
        /**
         * Let's withdraw remaining client funds.
         *
         * Only client owner is able to withdraw funds. The owned is the one who
         * registered the client but you can use the `Transfer` instruction
         * to change the client owner (see {@link TransferBuilder}).
         */
        let balanceBefore = await exampleClient.provider.connection.getBalance(
            clientAddr
        );
        let availableBalance = await vrf.clientBalance(
            exampleClient.programId,
            clientStateAddr
        );
        let tx = await vrf.methods
            .withdraw({ amount: availableBalance })
            .accountsPartial({ client: clientAddr })
            .rpc();
        console.log("Withdrawn in", tx);

        let balanceAfter = await exampleClient.provider.connection.getBalance(
            clientAddr
        );

        assert(
            new BN(balanceBefore).sub(availableBalance).eq(new BN(balanceAfter))
        );
    });

    /**
     * This sets up a test VRF instance. Just skip this part.
     */
    let subscription: number;
    before(async () => {
        await (
            await new InitializeBuilder(vrf, new BN(10_000_000)).build()
        ).rpc();

        let state = await vrf.getNetworkState();

        let authorities = [
            web3.Keypair.fromSeed(Buffer.alloc(32, 4)),
            web3.Keypair.fromSeed(Buffer.alloc(32, 5)),
            web3.Keypair.fromSeed(Buffer.alloc(32, 6)),
            web3.Keypair.fromSeed(Buffer.alloc(32, 7)),
        ];

        for (const a of authorities) {
            let transfer = new web3.Transaction().add(
                web3.SystemProgram.transfer({
                    fromPubkey: vrf.provider.publicKey,
                    toPubkey: a.publicKey,
                    lamports: web3.LAMPORTS_PER_SOL * 1,
                })
            );
            await vrf.provider.sendAndConfirm(transfer);
        }

        await (
            await new ConfigureBuilder(vrf, {
                ...state.config,
                fulfillAuthorities: authorities.map((x) => x.publicKey),
            }).build()
        ).rpc();

        subscription = vrf.addEventListener(
            "requested",
            async (event, _slot, _signature) => {
                try {
                    let message = new Uint8Array([
                        ...event.client.toBuffer(),
                        ...event.seed,
                    ]);
                    for (let a of authorities) {
                        let signature = nacl.sign.detached(
                            message,
                            a.secretKey
                        );
                        let builder = await new FulfillBuilder(
                            vrf,
                            event.client,
                            new Uint8Array(event.seed)
                        ).build(a.publicKey, signature);
                        await builder
                            .remainingAccounts([
                                {
                                    pubkey: additionalAccountAddress,
                                    isSigner: false,
                                    isWritable: true,
                                },
                            ])
                            .rpc();
                    }
                } catch (e) {
                    // pass
                }
            }
        );
    });

    after(async () => {
        vrf.removeEventListener(subscription);
    });
});
