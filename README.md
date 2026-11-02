<h1 align="center">
  ORAO Solana VRF
</h1>

<p>
  Generate on-chain randomness on Solana. ORAO's Verifiable Random Function (VRF) is an oracle
  that delivers unbiased, fast and affordable randomness to your Solana programs and off-chain
  apps: create unique NFT characteristics, generate random levels for games and weapons,
  randomize airdrops and run secure, verifiable lotteries. Built using the Anchor framework.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@orao-network/solana-vrf"><img src="https://img.shields.io/npm/v/%40orao-network%2Fsolana-vrf?logo=npm&color=377CC0&label=%40orao-network%2Fsolana-vrf" /></a>
  <a href="https://crates.io/crates/orao-solana-vrf"><img src="https://img.shields.io/crates/v/orao-solana-vrf?logo=rust&color=darkgreen&label=orao-solana-vrf" /></a>
  <a href="https://www.npmjs.com/package/@orao-network/solana-vrf-cb"><img src="https://img.shields.io/npm/v/%40orao-network%2Fsolana-vrf-cb?logo=npm&color=377CC0&label=%40orao-network%2Fsolana-vrf-cb" /></a>
  <a href="https://crates.io/crates/orao-solana-vrf-cb"><img src="https://img.shields.io/crates/v/orao-solana-vrf-cb?logo=rust&color=darkgreen&label=orao-solana-vrf-cb" /></a>
</p>

**New here?**
👉 [**Getting Started**](./GETTING_STARTED.md) — 5-minute path for both variants, with a decision matrix between the two.
👉 [**Recipes**](./RECIPES.md) — copy-pasteable patterns: NFT trait selection, weighted raffle, off-chain verification, multi-round games.

## Table of contents

- [Two variants: Classic and Callback](#two-variants-classic-and-callback)
- [Adding the SDK to your project](#adding-the-sdk-to-your-project) — crate features and the Solana crate cohort
- [Classic VRF](#classic-vrf)
  - [Off-chain: Rust SDK](#off-chain-rust-sdk)
  - [Off-chain: JS / TS SDK](#off-chain-js--ts-sdk)
  - [On-chain: CPI walkthrough](#on-chain-cpi-walkthrough)
    - [1. Create your contract](#1-create-your-contract)
    - [2. Collect the necessary accounts](#2-collect-the-necessary-accounts)
    - [3. Perform a CPI call](#3-perform-a-cpi-call)
    - [4. Use the fulfilled randomness](#4-use-the-fulfilled-randomness)
- [Callback VRF](#callback-vrf)
- [Running a local test validator](#running-a-local-test-validator)

## Two variants: Classic and Callback

ORAO VRF is deployed as two programs that share the same fulfillment network. Both run on
devnet and mainnet under the same program IDs, so nothing changes between the two clusters.

| | **Classic VRF** | **Callback VRF** |
|---|---|---|
| Program ID (devnet / mainnet) | `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y` | `VRFCBePmGTpZ234BhbzNNzmyg39Rgdd6VgdfhHwKypU` |
| How you request | A transaction from your wallet or app, or a CPI from your program | A CPI from your program, which is registered once as a VRF client |
| How you get the result | The oracle writes the randomness into a PDA derived from your seed; read it off-chain or in a later instruction | The oracle invokes a callback instruction of your program with the randomness, in the fulfillment transaction itself |
| Best for | Backends, bots and web apps; on-chain programs that can settle in a follow-up transaction | Games, NFT mints, lotteries and anything that must settle atomically on-chain without a follow-up transaction |
| Rust crate / npm package | [`orao-solana-vrf`](https://crates.io/crates/orao-solana-vrf) / [`@orao-network/solana-vrf`](https://www.npmjs.com/package/@orao-network/solana-vrf) | [`orao-solana-vrf-cb`](https://crates.io/crates/orao-solana-vrf-cb) / [`@orao-network/solana-vrf-cb`](https://www.npmjs.com/package/@orao-network/solana-vrf-cb) |
| Guide | this page | [`callback/README.md`](./callback/README.md) |

Rule of thumb: if the randomness is consumed off-chain, or your program can wait for it in a
later transaction, use **Classic**; if your program needs the randomness pushed into it, use
**Callback**. The [decision matrix](./GETTING_STARTED.md#choose-a-variant) in Getting Started
compares the two in more detail.

## Adding the SDK to your project

Both Rust crates have the same feature layout:

- `sdk` (default) — the async off-chain client built on `anchor-client`.
- `cpi` — the on-chain CPI bindings for your Anchor program, without an entrypoint.
- `solana-v4` (default) / `solana-v3` — the **Solana crate cohort**. Anchor 1.2 ships two sets
  of Solana crates, selected by the `solana-v3` (its default) and `solana-v4` features of
  `anchor-lang`, and refuses to mix them. The SDK crates mirror those features, so enable the
  one your project uses, never both.

Which cohort are you on? Look at the `anchor-lang` line of your program:

```toml
anchor-lang = "1.2.1"                                                           # solana-v3 (Anchor's default)
anchor-lang = { version = "1.2.1", default-features = false, features = ["solana-v4"] }  # solana-v4
```

Then pick the matching line below. JS has no cohort: `npm install @orao-network/solana-vrf`
(or `@orao-network/solana-vrf-cb`) works with `@anchor-lang/core` as is.

**Latest, the `solana-v4` cohort (default)** — what our programs, bots and examples use:

```toml
# Off-chain client
orao-solana-vrf = "0.8.1"
orao-solana-vrf-cb = "0.5"

# On-chain CPI from an Anchor program built with `solana-v4`
orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["cpi", "solana-v4"] }
orao-solana-vrf-cb = { version = "0.5", default-features = false, features = ["cpi", "solana-v4"] }
```

**The `solana-v3` cohort** — a stock Anchor 1.2 program, or an off-chain tool that already
depends on the `solana-sdk` 3.x line:

```toml
# Off-chain client
orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["sdk", "solana-v3"] }
orao-solana-vrf-cb = { version = "0.5", default-features = false, features = ["sdk", "solana-v3"] }

# On-chain CPI from a stock Anchor 1.2 program
orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["cpi", "solana-v3"] }
orao-solana-vrf-cb = { version = "0.5", default-features = false, features = ["cpi", "solana-v3"] }
```

Notes:

- For the classic crate `features = ["cpi"]` alone also works: with no cohort named it follows
  the cohort your program enables on `anchor-lang`. The callback crate needs the cohort named
  even for `cpi`, because its `AddressLookupTableAccount` type differs between the two.
- Naming the wrong cohort fails at compile time with anchor-lang's "features `solana-v3` and
  `solana-v4` are mutually exclusive" error; fix the feature instead of adding the other one.
- Earlier releases (`orao-solana-vrf` 0.7, `orao-solana-vrf-cb` 0.4) were built for Anchor
  0.32 and the Solana 2.x crates; stay on them if your program is still there.

## Classic VRF

A classic request is a transaction that creates a randomness account (a PDA derived from a
32-byte seed you choose) and pays the request fee. The fulfillment authorities sign the seed
with Ed25519, the program verifies the signatures and stores the resulting 64-byte randomness
in that account, where anyone can read and verify it.

### Off-chain: Rust SDK

The Rust SDK ([source code](https://github.com/orao-network/solana-vrf/tree/master/rust))
is based on the [`anchor-client`](https://docs.rs/anchor-client) library (dependency lines
[above](#adding-the-sdk-to-your-project)).

You'll acquire a `Program` instance to use it:

```rust
use anchor_client::{Client, Cluster, CommitmentConfig};
use std::sync::Arc;

let payer = Arc::new(payer_keypair);
let client = Client::new_with_options(Cluster::Devnet, payer, CommitmentConfig::confirmed());
let program = client.program(orao_solana_vrf::id())?;
```

A minimal randomness request from off-chain code:

```rust
use orao_solana_vrf::{wait_fulfilled, RequestBuilder};

let seed: [u8; 32] = rand::random();
let fulfilled = wait_fulfilled(seed, program.clone()).await;

RequestBuilder::new(seed).build(&program).await?.send().await?;

let randomness = fulfilled.await?;
```

The full example lives in [`rust/examples/off-chain`](./rust/examples/off-chain); the
[Recipes](./RECIPES.md) show how to verify a fulfilled randomness off-chain.

### Off-chain: JS / TS SDK

Install the [`@orao-network/solana-vrf`](https://www.npmjs.com/package/@orao-network/solana-vrf)
package and use the `Orao` class:

```typescript
import { AnchorProvider } from "@anchor-lang/core";
import { Orao } from "@orao-network/solana-vrf";

const provider = AnchorProvider.env();
const vrf = new Orao(provider);

// Request randomness with a random seed (`request()` builds the transaction asynchronously).
const [seed, tx] = await (await vrf.request()).rpc();
console.log("Request tx:", tx);

// Wait for fulfillment (default commitment is "finalized").
const randomness = await vrf.waitFulfilled(seed);
console.log("Randomness:", randomness.randomness);
```

See the [js SDK](https://github.com/orao-network/solana-vrf/tree/master/js) and
[sample Typescript integration](https://github.com/orao-network/solana-vrf/blob/master/rust/examples/cpi/tests/russian-roulette.ts)
for more.

### On-chain: CPI walkthrough

CPI is an abbreviation for Cross Program Invocation on Solana – a way for one contract to call another
contract within a single transaction. This section will illustrate this
([full code is available on GitHub][6]).

The contract we'll use to illustrate the CPI is a simple single-player Russian Roulette where
the outcome of a round is derived from a fulfilled randomness.

_Note:_ the randomness will not be immediately available for your contract, so you'll need
to design it in a way that it'll wait for randomness being fulfilled. In our example a player
won't be able to start another round until the current one is finished (until the randomness
is fulfilled).

#### 1. Create your contract

This example is based on the [Anchor Framework](https://github.com/coral-xyz/anchor), v1.2.1.
Please consult the [Anchor Book](https://book.anchor-lang.com/) on how to create a contract.

To perform a CPI call add the orao VRF Rust SDK with the `cpi` feature to your dependencies,
naming the Solana crate cohort of your program (see
[Adding the SDK to your project](#adding-the-sdk-to-your-project)):

```toml
[dependencies]
# ...
orao-solana-vrf = { version = "0.8.1", default-features = false, features = ["cpi", "solana-v4"] }
```

#### 2. Collect the necessary accounts

Each Solana instruction requires a proper list of accounts. We'll need to call the RequestV2
instruction so here is the list of required accounts:

-   payer – VRF client
-   network_state – VRF on-chain state address
-   treasury - address of the VRF treasury (taken from the VRF on-chain state)
-   request - PDA to store the randomness (derived from the seed)
-   system_program – required to create the request account

Above means that our instruction needs all of these accounts besides it's own accounts.
Particularly our Russian-Roulette instruction will require the following list of accounts:

```rust
#[derive(Accounts)]
#[instruction(force: [u8; 32])]
pub struct SpinAndPullTheTrigger<'info> {
    /// Player will be the `payer` account in the CPI call.
    #[account(mut)]
    pub player: Signer<'info>,

    /// This is the player state account, it is required by Russian-Roulette to store player data
    // (number of rounds played and info to derive the last round outcome)
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerState::SIZE,
        seeds = [
            PLAYER_STATE_ACCOUNT_SEED,
            player.key().as_ref()
        ],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,

    /// This account points to the last VRF request, it is necessary to validate that the player
    /// is alive and is able to play another round.
    /// CHECK:
    #[account(
        seeds = [RANDOMNESS_ACCOUNT_SEED, player_state.force.as_ref()],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub prev_round: AccountInfo<'info>,

    /// This account is the current VRF request account, it'll be the `request` account in the CPI call.
    /// CHECK:
    #[account(
        mut,
        seeds = [RANDOMNESS_ACCOUNT_SEED, &force],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub random: AccountInfo<'info>,

    /// VRF treasury account, it'll be the `treasury` account in the CPI call.
    /// CHECK:
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]

    /// VRF on-chain state account, it'll be the `network_state` account in the CPI call.
    pub config: Account<'info, NetworkState>,

    /// VRF program address to invoke CPI
    pub vrf: Program<'info, OraoVrf>,

    /// System program address to create player_state and to be used in CPI call.
    pub system_program: Program<'info, System>,
}
```

#### 3. Perform a CPI call

In the Anchor Framework there is a `CpiContext` for this purpose (please consult
the [corresponding section](https://book.anchor-lang.com/anchor_in_depth/CPIs.html)
of the Anchor Book):

```rust
let cpi_program = ctx.accounts.vrf.to_account_info();
let cpi_accounts = orao_solana_vrf::cpi::accounts::RequestV2 {
    payer: ctx.accounts.player.to_account_info(),
    network_state: ctx.accounts.config.to_account_info(),
    treasury: ctx.accounts.treasury.to_account_info(),
    request: ctx.accounts.random.to_account_info(),
    system_program: ctx.accounts.system_program.to_account_info(),
};
let cpi_ctx = anchor_lang::context::CpiContext::new(cpi_program, cpi_accounts);
orao_solana_vrf::cpi::request_v2(cpi_ctx, force)?;
```

#### 4. Use the fulfilled randomness

Our contract derives round outcome from the fulfilled randomness, round considered
to be in-progress if randomness is not yet fulfilled:

```rust
/// Last round outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurrentState {
    /// Player is alive and able to play.
    Alive,
    /// Player is dead and can't play anymore.
    Dead,
    /// Player is waiting for current round to finish.
    Playing,
}

/// Derives last round outcome.
pub fn current_state(randomness: &RandomnessAccountData) -> CurrentState {
    if let Some(randomness) = randomness.fulfilled_randomness() {
        if is_dead(randomness) {
            CurrentState::Dead
        } else {
            CurrentState::Alive
        }
    } else {
        CurrentState::Playing
    }
}

/// Decides whether player is dead or alive.
fn is_dead(randomness: &[u8; 64]) -> bool {
    // use only first 8 bytes for simplicity
    let value = randomness[0..size_of::<u64>()].try_into().unwrap();
    u64::from_le_bytes(value) % 6 == 0
}
```

[1]: https://docs.rs/orao-solana-vrf/latest/orao_solana_vrf/state/struct.Randomness.html
[2]: https://docs.rs/orao-solana-vrf/latest/orao_solana_vrf/state/struct.NetworkState.html
[3]: https://docs.rs/orao-solana-vrf/latest/orao_solana_vrf/state/struct.NetworkConfiguration.html
[4]: https://github.com/orao-network/solana-vrf/tree/master/rust/examples/off-chain
[5]: https://docs.rs/orao-solana-vrf/latest/orao_solana_vrf/struct.RequestBuilder.html
[6]: https://github.com/orao-network/solana-vrf/tree/master/rust/examples/cpi

## Callback VRF

With the callback variant your program is registered once as a VRF client, requests
randomness through CPI and receives it in a callback instruction invoked by the oracle, so a
game round or a mint can be settled in the fulfillment transaction itself. The integration
guide, including registration, funding, callback rules and Address Lookup Table support, is
in [`callback/README.md`](./callback/README.md); a complete client program lives in
[`callback/rust/examples/cpi`](./callback/rust/examples/cpi).

```toml
[dependencies]
# name the Solana crate cohort of your program: `solana-v4` or `solana-v3`
orao-solana-vrf-cb = { version = "0.5", default-features = false, features = ["cpi", "solana-v4"] }
```

## Running a local test validator

`anchor test` will spin up a local validator automatically for the [cpi](rust/examples/cpi)
tests (its `Anchor.toml` clones the VRF program from devnet). To run a validator
manually with the VRF program preloaded, clone it from the cluster the same way:

```sh
solana-test-validator -r \
    --url devnet \
    --clone-upgradeable-program VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y \
    --ledger /tmp/test-ledger
```

Use `--url mainnet-beta` to clone the mainnet build instead; both clusters run the
same program version.
