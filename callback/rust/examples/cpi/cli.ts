import * as anchor from "@coral-xyz/anchor";
import { Program, web3, AnchorProvider } from "@coral-xyz/anchor";
import IDL from "./target/idl/example_client.json";
import { ExampleClient } from "./target/types/example_client";
import { Command, InvalidArgumentError, Option } from "commander";
import { readFile } from "node:fs/promises";
import {
    PROGRAM_ID as VrfProgramId,
    OraoCb,
    RegisterBuilder,
    requestAccountAddress,
    clientAddress,
    Client,
    RequestAccount,
    requestAltAccountAddress,
    RequestAltAccount,
} from "@orao-network/solana-vrf-cb";
import { NetworkState } from "@orao-network/solana-vrf-cb";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const program = new Command();

program.addOption(
    new Option("-c, --cluster <name>", "Solana cluster to connect to")
        .choices(["localnet", "devnet", "mainnet"])
        .default("devnet")
);
program.requiredOption("-k, --key <path>", "Wallet secret key path.");
program
    .command("init")
    .description("Initializes the deployed ExampleClient program")
    .action(async (_options, command) => {
        let cluster = command.parent.opts().cluster as Cluster;
        let exampleClient = await openProgram(
            cluster,
            command.parent.opts().key
        );
        let tx = await exampleClient.methods.initialize().rpc();
        console.log("Initialized in", tx);
    });
program
    .command("register")
    .description("Registers ExampleClient program as a VRF client")
    .action(async (_options, command) => {
        let cluster = command.parent.opts().cluster as Cluster;
        let exampleClient = await openProgram(
            cluster,
            command.parent.opts().key
        );
        let vrf = new OraoCb(exampleClient.provider);
        let [clientStateAddr, clientStateBump] =
            web3.PublicKey.findProgramAddressSync(
                [Buffer.from("CLIENT_STATE")],
                exampleClient.programId
            );
        let builder = await new RegisterBuilder(
            vrf,
            exampleClient.programId,
            clientStateAddr,
            [Buffer.from("CLIENT_STATE"), Buffer.from([clientStateBump])]
        ).build();
        let tx = await builder.rpc();
        console.log("Registered in", tx);
    });
program
    .command("deposit")
    .requiredOption(
        "--amount <amount>",
        "how many lamports to deposit",
        myParseInt
    )
    .action(async (options, command) => {
        let cluster = command.parent.opts().cluster as Cluster;
        let exampleClient = await openProgram(
            cluster,
            command.parent.opts().key
        );

        let [clientStateAddr, clientStateBump] =
            web3.PublicKey.findProgramAddressSync(
                [Buffer.from("CLIENT_STATE")],
                exampleClient.programId
            );

        const [clientAddr, clientBump] = clientAddress(
            exampleClient.programId,
            clientStateAddr
        );

        let transfer = new web3.Transaction().add(
            web3.SystemProgram.transfer({
                fromPubkey: exampleClient.provider.publicKey!,
                toPubkey: clientAddr,
                lamports: options.amount,
            })
        );
        let tx = await exampleClient.provider.sendAndConfirm!(transfer);
        console.log("Deposited in", tx);
    });
program
    .command("request")
    .addOption(
        new Option("--amount <num>", "Number of requests to make")
            .default(1)
            .argParser(myParseInt)
    )
    .option(
        "--callback-override <param>",
        "Overrides the callback with or without additional account",
        myParseInt
    )
    .option(
        "--with-additional-account",
        "send additional account to overridden callback (ignored if --callback-override not given)",
        false
    )
    .description("Sends new randomness request and waits for result")
    .action(async (options, command) => {
        console.log("Making", options.amount, "request(s)");
        let cluster = command.parent.opts().cluster as Cluster;
        let exampleClient = await openProgram(
            cluster,
            command.parent.opts().key
        );
        let vrf = new OraoCb(exampleClient.provider);

        const [additionalAccountAddress, _additionalAccountBump] =
            web3.PublicKey.findProgramAddressSync(
                [Buffer.from("ADDITIONAL_ACCOUNT")],
                exampleClient.programId
            );

        let [clientStateAddr, _clientStateBump] =
            web3.PublicKey.findProgramAddressSync(
                [Buffer.from("CLIENT_STATE")],
                exampleClient.programId
            );

        const [clientAddr, _clientBump] = clientAddress(
            exampleClient.programId,
            clientStateAddr
        );

        console.log("=== Client Account (before request)===");
        let client = await vrf.getClient(clientAddr);
        let balance = await vrf.provider.connection.getBalance(clientAddr);
        describeClient(clientAddr, client, balance);
        console.log("");

        console.log("=== Client State Account (before request) ===");
        let stateBefore = await exampleClient.account.clientState.fetch(
            clientStateAddr
        );
        describeState(clientStateAddr, stateBefore);
        console.log("");

        console.log("=== Additional Account (before request) ===");
        let additionalAccount =
            await exampleClient.account.additionalAccount.fetch(
                additionalAccountAddress
            );
        describeAdditionalAccount(additionalAccountAddress, additionalAccount);
        console.log("");

        let seeds = [...Buffer.alloc(options.amount)].map(
            (_x) => web3.Keypair.generate().publicKey
        );
        let requestAddrs = seeds.map(
            (seed) => requestAccountAddress(clientAddr, seed.toBuffer())[0]
        );

        let howToOverride = null;
        if (options.callbackOverride !== undefined) {
            howToOverride = {
                parameter: options.callbackOverride,
                sendAdditionalAccount: options.withAdditionalAccount,
            };
        }
        let networkState = await vrf.getNetworkState();

        let builder = exampleClient.methods
            .request([...seeds[0].toBytes()], howToOverride)
            .accountsPartial({
                vrf: VrfProgramId,
                clientState: clientStateAddr,
                client: clientAddr,
                networkState: NetworkState.createAddress(networkState.bump)[0],
                treasury: networkState.config.treasury,
                request: requestAddrs[0],
            });

        let instructions = [];
        for (let i = 1; i < options.amount; i++) {
            let instruction = await exampleClient.methods
                .request([...seeds[i].toBytes()], howToOverride)
                .accountsPartial({
                    vrf: VrfProgramId,
                    clientState: clientStateAddr,
                    client: clientAddr,
                    networkState: NetworkState.createAddress(
                        networkState.bump
                    )[0],
                    treasury: networkState.config.treasury,
                    request: requestAddrs[i],
                })
                .instruction();
            instructions.push(instruction);
        }
        builder.postInstructions(instructions);

        let tx = await builder.rpc();

        console.log("Requested in", tx);
        console.log("");

        for (let i = 0; i < options.amount; i++) {
            for (let j = 0; j < 10; j++) {
                try {
                    let request = await vrf.getRequestAccount(requestAddrs[i]);
                    console.log(
                        `=== Request Account for ${seeds[
                            i
                        ].toString()} (new) ===`
                    );
                    describeRequest(requestAddrs[i], request!);
                    console.log("");
                    break;
                } catch (e) {
                    // pass
                }
            }
        }

        let fulfilledAccounts = [];
        for (let i = 0; i < options.amount; i++) {
            let fulfilled = await vrf.waitFulfilled(
                clientAddr,
                seeds[i].toBuffer(),
                "regular"
            );
            fulfilledAccounts.push(fulfilled);
            let txs = await vrf.provider.connection.getSignaturesForAddress(
                requestAddrs[i],
                undefined,
                "confirmed"
            );
            let slot = txs.reduce((acc, cur) => Math.max(acc, cur.slot), 0);
            let milliseconds = (slot - fulfilled.slot.toNumber()) * 400;
            console.log(
                `${seeds[i].toString()} fulfilled ~ in ${(
                    milliseconds / 1000
                ).toFixed(3)} seconds`
            );
        }
        console.log("");

        for (let i = 0; i < options.amount; i++) {
            console.log(
                `=== Request Account for ${seeds[i].toString()} (fulfilled) ===`
            );
            describeRequest(
                requestAddrs[i],
                fulfilledAccounts[i] as RequestAccount
            );
            console.log("");
        }

        console.log("=== Client Account (after requests) ===");
        client = await vrf.account.client.fetch(clientAddr);
        balance = await vrf.provider.connection.getBalance(clientAddr);
        describeClient(clientAddr, client, balance);
        console.log("");

        console.log("=== Client State Account (after requests fulfilled) ===");
        let stateAfter = await exampleClient.account.clientState.fetch(
            clientStateAddr
        );
        describeState(clientStateAddr, stateAfter);
        console.log("");

        console.log("=== Additional Account (after requests fulfilled) ===");
        additionalAccount = await exampleClient.account.additionalAccount.fetch(
            additionalAccountAddress
        );
        describeAdditionalAccount(additionalAccountAddress, additionalAccount);
        console.log("");
    });
program
    .command("request-alt")
    .addOption(
        new Option("--amount <num>", "Number of requests to make")
            .default(1)
            .argParser(myParseInt)
    )
    .option(
        "--callback-override <param>",
        "Overrides the callback with or without additional account",
        myParseInt
    )
    .option(
        "--with-additional-account",
        "send additional account to overridden callback (ignored if --callback-override not given)",
        false
    )
    .description("Sends new randomness request with ALT and waits for result")
    .action(async (options, command) => {
        console.log("Making", options.amount, "request(s)");
        let cluster = command.parent.opts().cluster as Cluster;
        let exampleClient = await openProgram(
            cluster,
            command.parent.opts().key
        );
        let vrf = new OraoCb(exampleClient.provider);

        const [additionalAccountAddress, _additionalAccountBump] =
            web3.PublicKey.findProgramAddressSync(
                [Buffer.from("ADDITIONAL_ACCOUNT")],
                exampleClient.programId
            );

        let [clientStateAddr, _clientStateBump] =
            web3.PublicKey.findProgramAddressSync(
                [Buffer.from("CLIENT_STATE")],
                exampleClient.programId
            );

        const [clientAddr, _clientBump] = clientAddress(
            exampleClient.programId,
            clientStateAddr
        );

        console.log("=== Client Account (before request)===");
        let client = await vrf.getClient(clientAddr);
        let balance = await vrf.provider.connection.getBalance(clientAddr);
        describeClient(clientAddr, client, balance);
        console.log("");

        console.log("=== Client State Account (before request) ===");
        let stateBefore = await exampleClient.account.clientState.fetch(
            clientStateAddr
        );
        describeState(clientStateAddr, stateBefore);
        console.log("");

        console.log("=== Additional Account (before request) ===");
        let additionalAccount =
            await exampleClient.account.additionalAccount.fetch(
                additionalAccountAddress
            );
        describeAdditionalAccount(additionalAccountAddress, additionalAccount);
        console.log("");

        // This was previously created on `devnet` with just a single entry:
        // - `additionalAccountAddress`
        let lookupTableAddress = new web3.PublicKey(
            "3P4HsrfbNGstn8A6xeNopjMEjaiipfe6QjLMpvkVHTQ5"
        );

        if (cluster == "localnet") {
            // we'll going to create new lookup table for `localnet` each time
            lookupTableAddress = await createLookupTableWith(
                exampleClient.provider,
                [additionalAccountAddress]
            );
        }

        let seeds = [...Buffer.alloc(options.amount)].map(
            (_x) => web3.Keypair.generate().publicKey
        );
        let requestAddrs = seeds.map(
            (seed) => requestAltAccountAddress(clientAddr, seed.toBuffer())[0]
        );

        let howToOverride = null;
        if (options.callbackOverride !== undefined) {
            howToOverride = {
                parameter: options.callbackOverride,
                sendAdditionalAccount: options.withAdditionalAccount,
                numLookupTables: 1,
            };
        }
        let networkState = await vrf.getNetworkState();

        let builder = exampleClient.methods
            .requestAlt([...seeds[0].toBytes()], howToOverride)
            .accountsPartial({
                vrf: VrfProgramId,
                clientState: clientStateAddr,
                client: clientAddr,
                networkState: NetworkState.createAddress(networkState.bump)[0],
                treasury: networkState.config.treasury,
                request: requestAddrs[0],
            })
            .remainingAccounts([
                {
                    pubkey: lookupTableAddress,
                    isSigner: false,
                    isWritable: false,
                },
            ]);

        let instructions = [];
        for (let i = 1; i < options.amount; i++) {
            let instruction = await exampleClient.methods
                .requestAlt([...seeds[i].toBytes()], howToOverride)
                .accountsPartial({
                    vrf: VrfProgramId,
                    clientState: clientStateAddr,
                    client: clientAddr,
                    networkState: NetworkState.createAddress(
                        networkState.bump
                    )[0],
                    treasury: networkState.config.treasury,
                    request: requestAddrs[i],
                })
                .remainingAccounts([
                    {
                        pubkey: lookupTableAddress,
                        isSigner: false,
                        isWritable: false,
                    },
                ])
                .instruction();
            instructions.push(instruction);
        }
        builder.postInstructions(instructions);

        let sig = await builder.rpc();

        console.log("Requested in", sig);
        console.log("");

        for (let i = 0; i < options.amount; i++) {
            for (let j = 0; j < 10; j++) {
                try {
                    let request = await vrf.getRequestAltAccount(
                        requestAddrs[i]
                    );
                    console.log(
                        `=== Request Account for ${seeds[
                            i
                        ].toString()} (new) ===`
                    );
                    describeRequestAlt(requestAddrs[i], request!);
                    console.log("");
                    break;
                } catch (e) {
                    // pass
                }
            }
        }

        let fulfilledAccounts = [];
        for (let i = 0; i < options.amount; i++) {
            let fulfilled = await vrf.waitFulfilled(
                clientAddr,
                seeds[i].toBuffer(),
                "alt"
            );
            fulfilledAccounts.push(fulfilled);
            let txs = await vrf.provider.connection.getSignaturesForAddress(
                requestAddrs[i],
                undefined,
                "confirmed"
            );
            let slot = txs.reduce((acc, cur) => Math.max(acc, cur.slot), 0);
            let milliseconds = (slot - fulfilled.slot.toNumber()) * 400;
            console.log(
                `${seeds[i].toString()} fulfilled ~ in ${(
                    milliseconds / 1000
                ).toFixed(3)} seconds`
            );
        }
        console.log("");

        for (let i = 0; i < options.amount; i++) {
            console.log(
                `=== Request Account for ${seeds[i].toString()} (fulfilled) ===`
            );
            describeRequest(
                requestAddrs[i],
                fulfilledAccounts[i] as RequestAccount
            );
            console.log("");
        }

        console.log("=== Client Account (after requests) ===");
        client = await vrf.account.client.fetch(clientAddr);
        balance = await vrf.provider.connection.getBalance(clientAddr);
        describeClient(clientAddr, client, balance);
        console.log("");

        console.log("=== Client State Account (after requests fulfilled) ===");
        let stateAfter = await exampleClient.account.clientState.fetch(
            clientStateAddr
        );
        describeState(clientStateAddr, stateAfter);
        console.log("");

        console.log("=== Additional Account (after requests fulfilled) ===");
        additionalAccount = await exampleClient.account.additionalAccount.fetch(
            additionalAccountAddress
        );
        describeAdditionalAccount(additionalAccountAddress, additionalAccount);
        console.log("");
    });

program.parse();

type Cluster = "localnet" | "devnet" | "mainnet";

async function getProvider(
    cluster: Cluster,
    key: string
): Promise<AnchorProvider> {
    let secretKey: Array<number> = JSON.parse(
        await readFile(key, { encoding: "utf-8" })
    );
    let payer = web3.Keypair.fromSecretKey(Buffer.from(secretKey));
    let url =
        cluster === "devnet"
            ? web3.clusterApiUrl("devnet")
            : cluster === "mainnet"
            ? web3.clusterApiUrl("mainnet-beta")
            : "http://127.0.0.1:8899";
    let connection = new web3.Connection(url, "confirmed");
    let wallet = new anchor.Wallet(payer);
    return new AnchorProvider(connection, wallet);
}

async function openProgram(
    cluster: Cluster,
    key: string
): Promise<Program<ExampleClient>> {
    let provider = await getProvider(cluster, key);
    return new Program(IDL as ExampleClient, provider);
}

function myParseInt(value: string, dummyPrevious: any) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new InvalidArgumentError("Not a number.");
    }
    return parsedValue;
}

function describeClient(
    clientAddr: web3.PublicKey,
    client: Client,
    balance: number
) {
    console.log("Client:", clientAddr.toString());
    console.log(" Balance:", balance);
    console.log(" Number of Requests:", client.numRequests.toString());
    if (client.callback) {
        console.log(" Callback:");
        console.log("  Data:", bs58.encode(client.callback.data));
        if (client.callback.remainingAccounts.length > 0) {
            console.log("  Remaining Accounts:");
            for (let account of client.callback.remainingAccounts) {
                if (account.isWritable) {
                    console.log(`   - (rw) ${account.pubkey}`);
                } else {
                    console.log(`   - (ro) ${account.pubkey}`);
                }
            }
        } else {
            console.log("  Remaining Accounts: []");
        }
    } else {
        console.log(" Callback: None");
    }
}

function describeState(
    stateAddr: anchor.web3.PublicKey,
    state: anchor.IdlAccounts<ExampleClient>["clientState"]
) {
    console.log("Client State:", stateAddr.toString());
    console.log(" Latest client-level callback call:");
    console.log("  Parameter:", state.clientLevelCallbackParam);
    console.log(
        "  Randomness:",
        bs58.encode(state.clientLevelCallbackRandomness)
    );
    console.log(" Latest request-level callback call:");
    console.log("  Parameter:", state.requestLevelCallbackParam);
    console.log(
        "  Randomness:",
        bs58.encode(state.requestLevelCallbackRandomness)
    );
}

function describeAdditionalAccount(
    address: anchor.web3.PublicKey,
    account: anchor.IdlAccounts<ExampleClient>["additionalAccount"]
) {
    console.log("Additional Account:", address.toString());
    console.log(" Latest data:");
    console.log("  Parameter:", account.param);
    console.log("  Randomness:", bs58.encode(account.randomness));
}

function describeRequest(requestAddr: web3.PublicKey, request: RequestAccount) {
    console.log("Request Account:", requestAddr.toString());
    console.log(" Client:", request.client.toString());
    console.log(" Seed:", bs58.encode(request.seed));
    console.log(" Slot:", request.slot.toNumber());
    let pending = request.getPending();
    let fulfilled = request.getFulfilled();
    if (pending) {
        console.log(" Pending:");
        if (pending.responses.length > 0) {
            console.log("  Responses:");
            for (let response of pending.responses) {
                console.log("   - From:", response.pubkey);
                console.log(
                    "     Contribution:",
                    bs58.encode(response.randomness)
                );
            }
        } else {
            console.log("  Responses: []");
        }
        if (pending.callbackOverride) {
            console.log("  Callback: OVERRIDDEN");
            console.log("   Data:", bs58.encode(pending.callback!.data));
            if (pending.callback!.remainingAccounts.length > 0) {
                console.log("   Remaining Accounts:");
                for (let account of pending.callback!.remainingAccounts) {
                    if (account.isWritable) {
                        console.log(`    - (rw) ${account.pubkey}`);
                    } else {
                        console.log(`    - (ro) ${account.pubkey}`);
                    }
                }
            } else {
                console.log("   Remaining Accounts: []");
            }
        } else {
            console.log("  Callback: NOT OVERRIDDEN");
        }
    } else if (fulfilled) {
        console.log(" Fulfilled:");
        console.log("  Randomness:", bs58.encode(fulfilled.randomness));
    }
}

function describeRequestAlt(
    requestAddr: web3.PublicKey,
    request: RequestAltAccount
) {
    console.log("Request Account (ALT):", requestAddr.toString());
    console.log(" Client:", request.client.toString());
    console.log(" Seed:", bs58.encode(request.seed));
    console.log(" Slot:", request.slot.toNumber());
    let pending = request.getPending();
    let fulfilled = request.getFulfilled();
    if (pending) {
        console.log(" Pending:");
        if (pending.responses.length > 0) {
            console.log("  Responses:");
            for (let response of pending.responses) {
                console.log("   - From:", response.pubkey);
                console.log(
                    "     Contribution:",
                    bs58.encode(response.randomness)
                );
            }
        } else {
            console.log("  Responses: []");
        }
        if (pending.callback) {
            console.log("  Callback: DEFINED");
            console.log(
                "   AccountsHash:",
                bs58.encode(pending.callback.accountsHash)
            );
            console.log("   Data:", bs58.encode(pending.callback.data));
            if (pending.callback!.remainingAccounts.length > 0) {
                console.log("   Remaining Accounts:");
                for (let account of pending.callback!.remainingAccounts) {
                    let access = account.isWritable ? "(rw)" : "(ro)";
                    if ("tableIndex" in account) {
                        console.log(
                            `    - ${access} address ${account.addressIndex} at table ${account.tableIndex}`
                        );
                    } else {
                        console.log(`    - ${access} ${account.pubkey}`);
                    }
                }
            } else {
                console.log("   Remaining Accounts: []");
            }
        } else {
            console.log("  Callback: NOT DEFINED");
        }
    } else if (fulfilled) {
        console.log(" Fulfilled:");
        console.log("  Randomness:", bs58.encode(fulfilled.randomness));
    }
}

async function createLookupTableWith(
    provider: anchor.Provider,
    addresses: web3.PublicKey[]
): Promise<web3.PublicKey> {
    // creating lookup table
    let [lookupTableInstruction, address] =
        web3.AddressLookupTableProgram.createLookupTable({
            authority: provider.publicKey!,
            payer: provider.publicKey!,
            recentSlot: await provider.connection.getSlot("finalized"),
        });
    let tx = new web3.Transaction().add(lookupTableInstruction);
    let signature = await provider.sendAndConfirm!(
        tx,
        [provider.wallet?.payer!],
        {
            maxRetries: 50,
        }
    );
    console.log("Lookup table created in:", signature);

    // put addresses to the lookup table
    let extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
        payer: provider.publicKey!,
        authority: provider.publicKey!,
        lookupTable: address,
        addresses,
    });
    tx = new web3.Transaction().add(extendInstruction);
    signature = await provider.sendAndConfirm!(tx, [provider.wallet?.payer!], {
        maxRetries: 50,
    });
    console.log("Lookup table populated in:", signature);

    return address;
}
