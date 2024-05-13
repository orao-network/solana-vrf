<h1 align="center">
  ORAO Solana VRF
</h1>

<p>
  Generate on-chain randomness on Solana. ORAO's Verifiable Random Function for Solana offers unbiased, fast and affordable randomness for your Solana programs. Create unique NFT characteristics, generate random levels for games and weapons, randomize airdrops and provide secure, verifiable lottery. Built using Anchor framework.
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@orao-network/solana-vrf"><img src="https://img.shields.io/npm/v/%40orao-network%2Fsolana-vrf?logo=npm&color=377CC0" /></a>
  <a href="https://crates.io/crates/orao-solana-vrf"><img src="https://img.shields.io/crates/v/orao-solana-vrf?logo=rust&color=darkgreen" /></a><br />
  
</p>

This repository provides off-chain Rust and JS web3 SDKs for requesting on-chain randomness using ORAO VRF program.

Program account (devnet/mainnet): `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y`

## Developer Integration Guide - CPI Example

CPI is an abbreviation for Cross Program Invocation on Solana – a way for one contract to call another
contract within a single transaction. This section will illustrate this
([full code is available on GitHub][6]).

The contract we'll use to illustrate the CPI is a simple single-player Russian Roulette where
the outcome of a round is derived from a fulfilled randomness.

_Note:_ the randomness will not be immediately available for your contract, so you'll need
to design it in a way that it'll wait for randomness being fulfilled. In our example a player
won't be able to start another round until the current one is finished (until the randomness
is fulfilled).

### 1. Create your contract

This examples is based on the [Anchor Framework](https://github.com/coral-xyz/anchor).
Please consult the [Anchor Book](https://book.anchor-lang.com/) on how to create a contract.

**Note:** we use Anchor v0.29

To perform a CPI call you'll need to add the orao VRF rust SDK with the `cpi` feature
into the list of your dependencies:

```toml
[dependencies]
# ...
orao-solana-vrf = { version = "0.3.0", default-features = false, features = ["cpi"] }
```

### 2. Collect the necessary accounts

Each Solana instruction requires a proper list of accounts. We'll need to call the Request
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

### 3. Perform a CPI call

In the Anchor Framework there is a `CpiContext` for this purpose (please consult
the [corresponding section](https://book.anchor-lang.com/anchor_in_depth/CPIs.html)
of the Anchor Book):

```rust
let cpi_program = ctx.accounts.vrf.to_account_info();
let cpi_accounts = orao_solana_vrf::cpi::accounts::Request {
    payer: ctx.accounts.player.to_account_info(),
    network_state: ctx.accounts.config.to_account_info(),
    treasury: ctx.accounts.treasury.to_account_info(),
    request: ctx.accounts.random.to_account_info(),
    system_program: ctx.accounts.system_program.to_account_info(),
};
let cpi_ctx = anchor_lang::context::CpiContext::new(cpi_program, cpi_accounts);
orao_solana_vrf::cpi::request(cpi_ctx, force)?;
```

### 4. Use the fulfilled randomness

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
pub fn current_state(randomness: &Randomness) -> CurrentState {
    if let Some(randomness) = randomness.fulfilled() {
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

1. Rust SDK ([source code](https://github.com/orao-network/solana-vrf/tree/master/rust))is based on the [`anchor-client`](https://docs.rs/anchor-client) library, so you'll need
   to acquire the `Program` instance to use it:

```rust
// please choose the necessary commitment level
let commitment_config = CommitmentConfig::confirmed();
// get this from the solana configuration
let payer: Keypair = ..;
// we'll wrap payer into an Arc so it plays well with the tokio runtime
let payer = std::sync::Arc::new(payer);
// please choose the proper cluster
let client = Client::new_with_options(Cluster::Devnet, payer, commitment_config);
let program = client.program(orao_solana_vrf::id());
```

### Rust SDK

Check out the source code.

It's simple to integrate ORAO VRF into an on-chain game. We've built a [Russian Roulette contract and CLI](https://github.com/orao-network/solana-vrf/tree/master/rust/examples/cpi). New developers can reference it to get insight into doing Solana CPI - Cross Program Invocation.

### JS / TS SDK

Browse through [js SDK](https://github.com/orao-network/solana-vrf/tree/master/js) and it's subdirectories for more info.
Check out [sample Typescript integration](https://github.com/orao-network/solana-vrf/blob/master/rust/examples/cpi/tests/russian-roulette.ts)

### How to run a test validator.

Note that `anchor test` will run it for the [cpi](rust/examples/cpi) tests.

Here is an example:

```sh
solana-test-validator -r \
    --bpf-program VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y js/dist/orao_vrf.so \
    --ledger /tmp/test-ledger
```
