<h1 align="center">
  ORAO Solana VRF with Callback
</h1>

<p>
  Generate on-chain randomness on Solana and invoke a Callback on your contract. ORAO's Verifiable Random Function for Solana offers unbiased, fast and affordable randomness for your Solana programs. Create unique NFT characteristics, generate random levels for games and weapons, randomize airdrops and provide secure, verifiable lottery. Built using Anchor framework.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@orao-network/solana-vrf-cb"><img src="https://img.shields.io/npm/v/%40orao-network%2Fsolana-vrf-cb?logo=npm&color=377CC0" /></a>
  <a href="https://crates.io/crates/orao-solana-vrf-cb"><img src="https://img.shields.io/crates/v/orao-solana-vrf-cb?logo=rust&color=darkgreen" /></a><br />
</p>

This repository provides Rust and JS web3 SDKs for ORAO Callback VRF program.

Program account (devnet): `VRFCBePmGTpZ234BhbzNNzmyg39Rgdd6VgdfhHwKypU`

## Developer Integration Guide

The Callback VRF program is intended for on-chain usage. Here are the steps you must follow to create a new VRF client (every step is considered in detail later in this guide):

1.  Create, deploy and initialize a client program for Solana
2.  Register your client program at the Callback VRF
3.  Fund the new Client PDA created in the previous step
4.  Request randomness

### 1. Create, deploy and initialize a client program for Solana

All the requests to the Callback VRF are made via CPI by a registered client, so the first step is to write a client program.

Here are the minimal requirements for a client program:

1.  Program must have at least one PDA (bellow called a _State PDA_) that is
    going to be used as a request authority — this PDA will sign the CPI call
    to the `Request` instruction so that the request could be authorized by the
    Callback VRF.
2.  Program must have an instruction that is going to invoke the `Request`
    instruction via CPI.

Client programs can have one or more instructions that can be used as callbacks.

    Callback instructions have some requirements imposed on their list
    of accounts (see the [Callback](#callback) section bellow).


As you can see the minimal client program could have just two instructions:
first one to initialize the state PDA and the second one to perform the Request CPi. The complete example of a Callback VRF client program
could be found in the [rust/examples/cpi](./rust/examples/cpi) folder.

### 2. Register your client program at the Callback VRF

This step will create a new _Client PDA_ on the Callback VRF. This PDA will be
used for the following purposes:

1.  Its balance will be used to pay request fees
2.  It will be a signer of a callback CPI (for authentication purposes).

Please note that only the program owner (it's [upgrade authority](https://solana.com/docs/core/programs#updating-solana-programs))
is able to call the `Register` instruction — this account becomes an owner of
the new client. The client ownership could later be transferred using the `Transfer` instruction (see bellow).

Also note that you can register the same client program multiple times as long
as unique State PDAs are used for every registration — every such registration
will create it's own independent Client PDA.

Here is the data you need to provide to invoke the `Register` instruction:

1.  Address of your client program
2.  Address of your client program's `ProgramData` account
3.  A State PDA address
4.  State PDAs seeds + bump (via `Register` instruction parameters)
5.  (Optionally) A _Client-level_ callback (via `Register` instruction parameters)
    (more info on callbacks and its kinds is in the [Callback](#callback) section)

In JS SDK there is a helper named `RegisterBuilder` for the `Register` instruction:

```typescript
let vrf = new OraoCb(provider);

let builder = await new RegisterBuilder(
    vrf,
    clientProgram.programId,
    clientStateAddress,
    [...clientStateSeeds, Buffer.from([clientStateBump])]
)
    // You can omit the callback completely so the
    // new client won't have a client-level callback
    .withCallback(/* see the Callback section bellow */)
    .build();

console.log("Registered in", await builder.rpc());
```

Rust SDK has its own `RegisterBuilder` helper for the `Register` instruction:

```rust
let vrf: anchor_client::Program<_> = /* ... */;
let state_seeds: Vec<Vec<u8>> = /* State PDA seeds and bump */;
let signature = RegisterBuilder::new(state_seeds)
    // You can omit the callback completely so the
    // new client won't have a client-level callback
    .with_callback(/* see the Callback section bellow */)
    .build(vrf, program_address, state_address).await?
    .send().await?;

println!("Registered in {signature}");
```

#### Callback

An arbitrary client program instruction can be used as a callback instruction
as long as it expects the following list of accounts:

1.  (signer) Client PDA will sign the callback call
2.  (writable) State PDA will be writable within the callback
3.  (readonly) VRF's `NetworkState` PDA will be available for reading
4.  (readonly) Fulfilled `RequestAccount` PDA will be available for reading
5.  (optional) ... zero or many additional accounts given upon registration
    or upon the `Request` CPI (see bellow)

There are two types of callbacks:

1.  _Client-level_ callback — a callback (if any) that is given upon the
    client registration — it will be called for every fulfilled request
    of this client, but may be overridden by the _Request-level_ callback.
2.  _Request-level_ callback — a callback (if any) that is given upon the
    `Request` CPI — it will be called for the request it was given to.
    If there is a Client-level callback defined for this client, then
    it won't get called if _Request-level_ callback is given.

To define a callback you must provide the following information:

1.  Borsh-serialized instruction data.

    In rust it is convenient to use the `Callback::from_instruction_data` helper:

    ```rust
    let cb = Callback::from_instruction_data(SomeInstr::new(/* some params */));
    ```

    In Typescript you may use the `BorshInstructionCoder` for your IDL:

    ```typescript
    let ixCoder = new anchor.BorshInstructionCoder(clientProgram.idl);
    let callback = {
        data: ixCoder.encode("some_instruction_name", {
            /* some params */
        }),
        // ...
    };
    ```

2.  (optional) A list of remaining accounts — note that for a remaining account
    to be writable you must prove that it's a client program's PDA by providing
    seeds and bump:

    In rust it is convenient to use the `Callback::with_remaining_account` helper:

    ```rust
    let cb = Callback::from_instruction_data(SomeInstr::new(/* some params */))
        .with_remaining_account(RemainingAccount::readonly(some_address))
        .with_remaining_account(RemainingAccount::writable(
            some_other_address,
            vec![ACCOUNT_SEED.to_vec(), vec![account_bump]],
        ));
    ```

    In Typescript you just fill the object fields:

    ```typescript
    let ixCoder = new anchor.BorshInstructionCoder(clientProgram.idl);
    let callback = {
        data: ixCoder.encode("some_instruction_name", {
            /* some params */
        }),
        remainingAccounts: [
            {
                pubkey: some_address,
                seeds: null,
            },
            {
                pubkey: some_address,
                seeds: [Buffer.from(ACCOUNT_SEED), Buffer.from([account_bump])],
            },
        ],
    };
    ```

##### Updating client-level callback with `SetCallback` instruction

There is a `SetCallback` instruction that allows a client owner to update/remove
the client-level callback:

- in typescript:

    ```typescript
    let signature = await cbProgram2.methods
        .setCallback({
            newCallback: {
                /* see above on how to define a callback */
            },
        })
        .accountsPartial({ client: clientAddress })
        .rpc();
    console.log("Callback updated in:", signature);
    ```

- in rust:

    ```rust
    let vrf = provider.program(orao_solana_vrf_cb::id())?;
    let signature = SetCallbackBuilder::new((/* see above on how to define a callback */))
        .build(&vrf, client_addr).await?
        .send().await?;
    println!("Callback updated in {signature}");
    ```

### 3. Fund the new Client PDA created in the previous step

As soon as `Register` instruction is successfully executed a new Client PDA
is allocated. Its address could be easily found using proper helper function:

- in typescript:

    ```typescript
    import { clientAddress } from "@orao-network/solana-vrf-cb";
    const [clientAddr, clientBump] = clientAddress(
        exampleClient.programId,
        clientStateAddr
    );
    ```

- in rust:

    ```rust
    use orao_solana_vrf_cb::state::Client;
    let (client_addr, client_bump) = Client::find_address(
        program_addr,
        state_addr,
        id(),
    );
    ```

Now to make a `Request` CPI the Client PDA must be funded — it's balance will
be used to pay request fees and rent:

- effective VRF fees can be observed in the VRF's `NetworkState` account
- the request rent is reimbursed upon fulfill

To fund the client you need to transfer some funds to the Client PDA. You can
do it directly or via your program's instruction — in fact Solana imposes no
limitations on how accounts can be funded:

```typescript
// Here we'll fund our Client PDA using the SystemProgram's Transfer instruction.
let transfer = new web3.Transaction().add(
    web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: clientAddr,
        lamports: amountToTransfer,
    })
);
await provider.sendAndConfirm(transfer);
```

#### Withdrawing client funds using the `Withdraw` instruction

You can withdraw client funds using Callback VRF's `Withdraw` instruction.

This is a trivial operation but please note that you won't be able to withdraw
past Client's funds necessary for rent exemption — there is a helper that
returns the available client balance:

- in typescript use `OraoCb.clientBalance` method:

    ```typescript
    let vrf = new OraoCb(anchorProvider);
    let availableBalance = await vrf.clientBalance(clientAddr);
    ```

- in rust use `orao_solana_vrf_cb:sdk::client_balance`:

    ```rust
    let vrf = provider.program(orao_solana_vrf_cb::id())?;
    let available_balance = client_balance(&vrf, client_addr).await?;
    ```

Here is an example of off-chain `Withdraw` invocation:

- in typescript:

    ```typescript
    let vrf = new OraoCb(provider);
    let signature = vrf.methods
        .withdraw({ amount: amountInLamports })
        .accountsPartial({ client: clientAddr })
        .rpc();
    console.log("Withdrawn in", signature);
    ```

- in rust there is a `WithdrawBuilder` helper:

    ```rust
    let vrf = provider.program(orao_solana_vrf_cb::id())?;
    let signature = WithdrawBuilder::new(amount_in_lamports)
        .build(&vrf, client_addr).await?
        .send().await?;
    println!("Registered in {signature}");
    ```

### 4. Request new randomness

Randomness requests are performed via CPI to the VRF's `Request` instruction, so
it's a job for one of your program's instructions. Please note that you
can provide a request-level callback and a list of its remaining accounts —
you can decide that in the logic of your instruction (see the [Callback](#callback) section above).

Every `Request` invocation has to provide a unique seed — this seed represents
a commitment necessary to verify the generated randomness. Note that every
registered client has a separate seed space — you don't need to worry on whether
some seed is already used by another client or not, but you still need to make
sure that your seed is not already used by your client -  in case it's already used by your client 
the `Request` instruction will error out.

#### An example of a simple `Request` CPI

This example shows the simplest possible way for a client program to invoke
the `Request` instruction - no request-level callback or complex logic will
be used:

```rust
/// This is the instruction of our program, that is going to perform `Request` CPI.
///
/// Our simple instruction has no logic in itself so in fact all of its accounts
/// and the `seed` parameter are here only to be proxied to the CPI.
///
#[derive(Accounts)]
#[instruction(seed: [u8; 32])]
pub struct InvokeRequest<'info> {
    /// An account that pays transaction fees.
    #[account(mut)]
    pub payer: Signer<'info>,

    // We're going to call VRF's instruction, so we need VRF's the program account.
    pub vrf: Program<'info, OraoVrfCb>,

    // All of the following accounts are required
    // by the VRF's `Request` instruction.

    /// State PDA account will authenticate the request.
    ///
    /// The layout of this account might be arbitrary so
    /// we omit the `ClientState` definition for brevity
    #[account(mut)]
    pub state: Account<'info, ClientState>,
    /// Client PDA will pay fees and rent.
    #[account(mut)]
    pub client: Account<'info, Client>,
    /// Network state holds the effective VRF configuration
    #[account(mut)]
    pub network_state: Account<'info, NetworkState>,
    /// Treasury will receive fees (it's actual address is in the `NetworkState`)
    /// CHECK: Asserted by the CPI
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// The request account we're going to create
    /// CHECK: Asserted by the CPI
    #[account(mut)]
    pub request: AccountInfo<'info>,
    /// System program is necessary because `Request` will create an account.
    pub system_program: Program<'info, System>,
}

// ..

/// And here is a handler for our `InvokeRequest` instruction
pub fn handler(ctx: Context<InvokeRequest>, seed: [u8; 32]) -> Result<()> {
    use orao_solana_vrf_cb::{cpi, RequestParams};
    // As stated above our simple instruction will just perform CPI
    // without any other logic.

    // First lets prepare instruction parameters and accounts.
    let cpi_program = ctx.accounts.vrf.to_account_info();
    let cpi_params = RequestParams::new(seed);
    let mut cpi_accounts = cpi::accounts::Request {
        payer: ctx.accounts.payer.to_account_info(),
        state: ctx.accounts.state.to_account_info(),
        client: ctx.accounts.client.to_account_info(),
        network_state: ctx.accounts.network_state.to_account_info(),
        treasury: ctx.accounts.treasury.to_account_info(),
        request: ctx.accounts.request.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    // As said above our state account will authorize the `Request` CPI,
    // so VRF expects it to sign the invocation
    // (see https://solana.com/developers/guides/getstarted/how-to-cpi-with-signer)
    cpi_accounts.state.is_signer = true;
    let signers_seeds: &[&[&[u8]]] = &[&[
        b"CLIENT_STATE",
        &[ctx.accounts.state.bump],
    ]];

    // Now just perform the CPI
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts)
        .with_signer(signers_seeds);
    cpi::request(cpi_ctx, cpi_params)?;

    Ok(())
}
```

#### An example of a `Request` CPI with an optional request-level callback

This example is similar to the one shown above but it adds one additional
parameter to opt-in into a request-level callback (for callbacks and its kinds
see the [Callback](#callback) section above).

Additionally our request-level callback will illustrate how one can provide
additional accounts to a callback — we're going to provide two accounts

- some read-only account — this illustrates basic functionality
- a writable account — this illustrates how to give a writable Program's
  PDA to a callback

```rust
/// This is the instruction of our program, that is going to perform `Request` CPI.
///
/// In addition to the seed it also takes a boolean that is going to indicate
/// that caller opts-in to a request-level callback.
///
#[derive(Accounts)]
#[instruction(seed: [u8; 32], with_cb: bool)]
pub struct InvokeRequest<'info> {
    /// An account that pays transaction fees.
    #[account(mut)]
    pub payer: Signer<'info>,

    // We're going to call VRF's instruction, so we need VRF's program account.
    pub vrf: Program<'info, OraoVrfCb>,

    // All of the following accounts are required
    // by the VRF's `Request` instruction.
    // Note that this instruction does not take any of additional accounts
    // used by the request-level callback — this is because they are going
    // to be provided by the oracle upon the callback invocation.

    /// State PDA account will authenticate the request.
    ///
    /// The layout of this account might be arbitrary so
    /// we omit the `ClientState` definition for brevity
    #[account(mut)]
    pub state: Account<'info, ClientState>,
    /// Client PDA will pay fees and rent.
    #[account(mut)]
    pub client: Account<'info, Client>,
    /// Network state holds the effective VRF configuration
    #[account(mut)]
    pub network_state: Account<'info, NetworkState>,
    /// Treasury will receive fees (it's actual address is in the `NetworkState`)
    /// CHECK: Asserted by the CPI
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// The request account we're going to create
    /// CHECK: Asserted by the CPI
    #[account(mut)]
    pub request: AccountInfo<'info>,
    /// System program is necessary because `Request` will create an account.
    pub system_program: Program<'info, System>,
}

// ..

/// And here is a handler for our `InvokeRequest` instruction
pub fn handler(
    ctx: Context<InvokeRequest>,
    seed: [u8; 32],
    with_cb: bool,
) -> Result<()> {
    use orao_solana_vrf_cb::{
        cpi, RequestParams, state::client::Callback, instruction
    };
    // As said above our simple instruction will just perform CPI
    // without any other logic.

    // First lets prepare instruction parameters and accounts.
    let cpi_program = ctx.accounts.vrf.to_account_info();
    let mut cpi_params = RequestParams::new(seed);
    let mut cpi_accounts = cpi::accounts::Request {
        payer: ctx.accounts.payer.to_account_info(),
        state: ctx.accounts.state.to_account_info(),
        client: ctx.accounts.client.to_account_info(),
        network_state: ctx.accounts.network_state.to_account_info(),
        treasury: ctx.accounts.treasury.to_account_info(),
        request: ctx.accounts.request.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    // As said above our state account will authorize the `Request` CPI,
    // so VRF expects it to sign the invocation
    // (see https://solana.com/developers/guides/getstarted/how-to-cpi-with-signer)
    cpi_accounts.state.is_signer = true;
    let signers_seeds: &[&[&[u8]]] = &[&[
        b"CLIENT_STATE",
        &[ctx.accounts.state.bump],
    ]];

    // Now let's check if caller opted-in to a request-level callback
    let callback = with_cb.then(|| {
        // Let's pretend that we have two accounts required by our callback
        // *   the first one is "Data" account holding some necessary information
        //     our callback needs to read — this is an arbitrary account
        // *   the second one is the "Statistic" account our callback needs
        //     to updated — this is our program's PDA
        // The `Callback` instruction itself is defined bellow.
        let data_address = SOME_KNOWN_ADDRESS;
        let (stat_address, stat_bump) = Pubkey::find_program_address(
            &[b"STATISTIC"],
            &self::id(),
        );

        // Now let's define a callback giving our read-only and writable accounts
        Callback::from_instruction_data(
            &instruction::Callback { example_param: 42 },
        )
        // This gives the read-only account — it will go first
        .with_remaining_account(RemainingAccount::readonly(data_address))
        // This gives the writable account — it will go second
        .with_remaining_account(RemainingAccount::writable(
            stat_address,
            vec![b"STATISTIC".to_vec(), vec![stat_bump]]
        ))
    });

    // And finally let's perform the CPI reflecting the callback that
    // may be defined
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts)
        .with_signer(signers_seeds);
    cpi::request(cpi_ctx, cpi_params)?;

    Ok(())
}

/// This is our callback instruction definition.
///
/// All the accounts here follows the callback accounts requirements
/// described in the "Callback" section of this guide except the last
/// two accounts that are the additional accounts we've added to the callback.
///
/// Note that it accepts a parameter named `example_param` and its value was
/// given by the request-level callback definition above and will be available
/// within the instruction handler.
///
/// The instruction handler definition is omitted for brevity.
#[derive(Accounts)]
#[instruction(example_param: u8)]
pub struct Callback<'info> {
    /// The first account is always the Client PDA and must be a signer.
    ///
    /// This must be thoroughly verified to avoid unauthorized calls.
    #[account(
        signer,
        seeds = [
            orao_solana_vrf_cb::CB_CLIENT_ACCOUNT_SEED,
            crate::id().as_ref(),
            client.state.as_ref(),
        ],
        bump = client.bump,
        seeds::program = orao_solana_vrf_cb::id(),
        has_one = state,
    )]
    pub client: Account<'info, Client>,
    /// The layout of this account might be arbitrary so
    /// we omit the `ClientState` definition for brevity
    #[account(
        mut,
        seeds = [b"CLIENT_STATE"],
        bump = state.bump,
    )]
    pub state: Account<'info, ClientState>,
    /// Effective VRF configuration is available for observation.
    #[account(
        seeds = [CB_CONFIG_ACCOUNT_SEED],
        bump = network_state.bump,
        seeds::program = orao_vrf_cb::id(),
    )]
    pub network_state: Account<'info, NetworkState>,
    /// This request will alway be in the fulfilled state.
    #[account(
        seeds = [CB_REQUEST_ACCOUNT_SEED, client.key().as_ref(), request.seed()],
        bump,
        seeds::program = orao_vrf_cb::id(),
    )]
    pub request: Account<'info, RequestAccount>,

    // Bellow follows our additional accounts

    /// The first additional account is "Data" account.
    ///
    /// We pretend that it is holding some necessary information
    /// our callback needs to read (the definition is omitted for brevity).
    pub data: Account<'info, Data>,
    /// The second additional account is "Statistic" account.
    ///
    /// We pretend that our callback will update this account (the definition
    /// is omitted for brevity).
    #[account(mut, seeds = [b"STATISTIC"], bump = statistic.bump)]
    pub statistic: Account<'info, Statistic>,
}
```

## Transferring client ownership using the `Transfer` instruction

The effective owner of a client is stored in the `owner` field of a Client PDA.
The owner is able to:

- update client-level callback using `SetCallback` instruction
- withdraw funds from the Client PDA
- transfer ownership of the client

`Transfer` is a simple instruction requiring only the Client PDA being
transferred and a new owner address, but the signer must be the current
client owner:

- in typescript:

    ```typescript
    let vrf = new OraoCb(provider);
    let signature = await vrf.methods
        .transfer({ newOwner: newOwnerAddress })
        .accountsPartial({ client: clientAddress })
        .rpc();
    console.log("Transferred in:", signature);
    ```

- in rust:

    ```rust
    let vrf = provider.program(orao_solana_vrf_cb::id())?;
    let signature = TransferBuilder::new(new_owner_address)
        .build(&vrf, client_addr).await?
        .send().await?;
    println!("Transferred in {signature}");
    ```
