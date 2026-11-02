# Getting started with ORAO VRF on Solana

A 5-minute path to verifiable randomness on Solana, for both variants.

- [Choose a variant](#choose-a-variant): classic vs. callback
- [Classic quick start](#classic-quick-start) — Rust + JS
- [Callback quick start](#callback-quick-start) — Rust + JS
- [Testing on Devnet](#testing-on-devnet)
- [Next steps](#next-steps)

## Choose a variant

| Picking signal                                              | Classic                                | Callback                                 |
|-------------------------------------------------------------|----------------------------------------|------------------------------------------|
| Where you read the result                                   | Your client polls/awaits the PDA       | Your program's callback ix is invoked   |
| Number of transactions per round                            | 1 request tx + 1 read (off-chain)      | 1 request tx; fulfillment + callback share 1 tx |
| Needs polling logic / event subscription                    | Yes                                    | No                                       |
| Simpler integration                                         | ✅                                      |                                          |
| Atomic on-chain delivery into your program                  |                                        | ✅                                        |
| Higher per-request cost (you pay for callback execution)    |                                        | ✅                                        |
| Available networks                                          | Devnet + Mainnet                       | Devnet + Mainnet                         |
| Program ID                                                  | `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y` | `VRFCBePmGTpZ234BhbzNNzmyg39Rgdd6VgdfhHwKypU` |

**Rule of thumb**

- Off-chain consumer (CLI tool, web app, bot): **classic** — read the account when randomness lands.
- On-chain consumer (your Anchor program needs randomness mid-flow without a follow-up tx): **callback**.
- Building a game/NFT mint/lottery whose result must be settled atomically on-chain: **callback**.
- Just need a random number for a backend service: **classic**.

## Classic quick start

### 1. Add the SDK

```toml
# Cargo.toml
[dependencies]
# Off-chain client: `sdk` feature on the `solana-v4` crate cohort (both default)
orao-solana-vrf = "0.8.1"
# Off-chain client on Anchor 1.2's default `solana-v3` cohort:
# orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["sdk", "solana-v3"] }
# On-chain CPI in an Anchor program (follows the cohort of your `anchor-lang`):
# orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["cpi"] }
```

> Anchor 1.2 ships two sets of Solana crates, selected by the `solana-v3` (its default) and
> `solana-v4` features of `anchor-lang`. Both SDK crates mirror them as features: enable the
> one your project uses, never both.

```bash
# JS
npm install @orao-network/solana-vrf   # or: yarn add @orao-network/solana-vrf
```

### 2. Off-chain (Rust) — request + await

```rust
use anchor_client::{Client, Cluster, CommitmentConfig};
use orao_solana_vrf::{wait_fulfilled, RequestBuilder};
use std::sync::Arc;

let payer = Arc::new(payer_keypair);
let client = Client::new_with_options(Cluster::Devnet, payer, CommitmentConfig::confirmed());
let program = Arc::new(client.program(orao_solana_vrf::id())?);

let seed: [u8; 32] = rand::random();
let fulfilled = wait_fulfilled(seed, program.clone()).await;

RequestBuilder::new(seed).build(&program).await?.send().await?;
let randomness: [u8; 64] = fulfilled.await?;
```

### 3. Off-chain (JS/TS) — request + await

```typescript
import { AnchorProvider } from "@anchor-lang/core";
import { Orao } from "@orao-network/solana-vrf";

const provider = AnchorProvider.env();
const vrf = new Orao(provider);

const [seed, tx] = await (await vrf.request()).rpc();
console.log("Request tx:", tx);

const randomness = await vrf.waitFulfilled(seed); // 64 bytes
```

### 4. On-chain (CPI from your Anchor program)

```rust
use orao_solana_vrf::{cpi, cpi::accounts::RequestV2, RANDOMNESS_ACCOUNT_SEED, CONFIG_ACCOUNT_SEED};

#[derive(Accounts)]
#[instruction(seed: [u8; 32])]
pub struct MyRandomRequest<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: VRF on-chain config PDA
    #[account(mut, seeds = [CONFIG_ACCOUNT_SEED], bump, seeds::program = orao_solana_vrf::ID)]
    pub network_state: AccountInfo<'info>,
    /// CHECK: VRF treasury (from NetworkState)
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    /// CHECK: Randomness PDA derived from the seed
    #[account(mut, seeds = [RANDOMNESS_ACCOUNT_SEED, &seed], bump, seeds::program = orao_solana_vrf::ID)]
    pub request: AccountInfo<'info>,
    pub vrf: Program<'info, orao_solana_vrf::program::OraoVrf>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MyRandomRequest>, seed: [u8; 32]) -> Result<()> {
    let cpi_accounts = RequestV2 {
        payer: ctx.accounts.payer.to_account_info(),
        network_state: ctx.accounts.network_state.to_account_info(),
        treasury: ctx.accounts.treasury.to_account_info(),
        request: ctx.accounts.request.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    cpi::request_v2(
        anchor_lang::context::CpiContext::new(ctx.accounts.vrf.to_account_info(), cpi_accounts),
        seed,
    )?;
    Ok(())
}
```

A complete Anchor program using this pattern lives in
[`rust/examples/cpi`](./rust/examples/cpi) (Russian Roulette).

## Callback quick start

The callback variant requires a one-time **client registration** before any request.
Full guide: [`callback/README.md`](./callback/README.md). Minimum viable integration:

### 1. Add the SDK

```toml
# Cargo.toml
[dependencies]
# Name the Solana crate cohort your `anchor-lang` uses: `solana-v3` (Anchor's default) or `solana-v4`
orao-solana-vrf-cb = { version = "0.5", default-features = false, features = ["cpi", "solana-v3"] }
```

```bash
# JS
npm install @orao-network/solana-vrf-cb   # or: yarn add @orao-network/solana-vrf-cb
```

### 2. Register your client (one time, off-chain)

```rust
use orao_solana_vrf_cb::sdk::RegisterBuilder;

let signature = RegisterBuilder::new(state_pda_seeds)
    .with_callback(callback)        // or omit for a client without a default callback
    .build(&vrf_program, my_program_id, state_pda).await?
    .send().await?;
```

The signer must be the **upgrade authority** of your client program. This creates
a Client PDA whose balance pays for future requests.

### 3. Fund the Client PDA

```typescript
// Send some SOL to the Client PDA so it can pay request fees.
await provider.sendAndConfirm(
    new web3.Transaction().add(web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: clientPda,
        lamports: 0.1 * web3.LAMPORTS_PER_SOL,
    })),
);
```

### 4. Request from your program (CPI)

```rust
use orao_solana_vrf_cb::{cpi, cpi::accounts::Request, RequestParams};

pub fn invoke_request(ctx: Context<InvokeRequest>, seed: [u8; 32]) -> Result<()> {
    let mut cpi_accounts = cpi::accounts::Request {
        payer: ctx.accounts.payer.to_account_info(),
        state: ctx.accounts.state.to_account_info(),
        client: ctx.accounts.client.to_account_info(),
        network_state: ctx.accounts.network_state.to_account_info(),
        treasury: ctx.accounts.treasury.to_account_info(),
        request: ctx.accounts.request.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    // Your State PDA authorizes the CPI as a signer:
    cpi_accounts.state.is_signer = true;
    let signers: &[&[&[u8]]] = &[&[b"CLIENT_STATE", &[ctx.accounts.state.bump]]];

    cpi::request(
        anchor_lang::context::CpiContext::new(
            ctx.accounts.vrf.to_account_info(), cpi_accounts,
        ).with_signer(signers),
        RequestParams::new(seed),
    )?;
    Ok(())
}
```

### 5. Define your callback instruction

Required account order: **Client PDA (signer)**, **State PDA (writable)**, **NetworkState (read)**,
**RequestAccount (read)**, then your own remaining accounts.

```rust
pub fn callback(ctx: Context<MyCallback>, /* your params */) -> Result<()> {
    let randomness: &[u8] = ctx.accounts.request.fulfilled_randomness()
        .ok_or(ProgramError::InvalidAccountData)?;
    // randomness is 64 bytes — use it however you need
    Ok(())
}
```

A working end-to-end Anchor project lives in
[`callback/rust/examples/cpi`](./callback/rust/examples/cpi).

> ⚠️ Your callback **must not fail**. The VRF will fulfill the request even if your
> callback errors. See [Faulty callback policy](./callback/README.md#faulty-callback-policy-and-the-request-explorer)
> in the callback guide.

## Testing on Devnet

Devnet uses the same program IDs as mainnet, so no config changes between environments.
A typical test loop:

```bash
# Fund your test wallet
solana airdrop 2 -u devnet

# Run a request from the off-chain example
cargo run --release -p off-chain -- --rpc https://api.devnet.solana.com

# Or run the Anchor tests for the CPI example
cd rust/examples/cpi
anchor test --skip-local-validator --provider.cluster devnet
```

For a fully local loop with the VRF program preloaded, see
[Running a local test validator](./README.md#running-a-local-test-validator).

## Next steps

- **Recipes for common use-cases** — [`RECIPES.md`](./RECIPES.md) (NFT mint
  randomization, weighted raffles, coin flip, off-chain verification).
- **Classic deep dive** — [`README.md`](./README.md) (full CPI walkthrough, account
  table, randomness account state).
- **Callback deep dive** — [`callback/README.md`](./callback/README.md) (registration,
  callback rules, ALT support, directives, Solana limits).
- **Rust API docs** — [docs.rs/orao-solana-vrf](https://docs.rs/orao-solana-vrf) and
  [docs.rs/orao-solana-vrf-cb](https://docs.rs/orao-solana-vrf-cb).
- **Architecture diagrams** — [`docs/orao-vrf-classic.svg`](./docs/orao-vrf-classic.svg)
  and [`docs/orao-vrf-callback.svg`](./docs/orao-vrf-callback.svg).
