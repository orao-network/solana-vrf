# CPI Example

This example contract shows how to perform a cross-program invocation (CPI)
of the ORAO VRF contract.

## Contract

This contract implements a trivial single-player Russian Roulette. The outcome
of a round is based on the randomness, requested from ORAO VRF contract via CPI.
The contract have only one instruction called "SpinAndPullTheTrigger { force }"
(see [`programs/russian-roulette/src/lib.rs`](programs/russian-roulette/src/lib.rs)).
This instruction asserts that the player is able to play and invokes ORAO VRF
via CPI. The "force" value (generated randomly) is used as a VRF seed.

Round outcome is derived lazily from the fulfilled VRF randomness.

### The contract logic

There are three possible player states:

* *alive* – last round outcome shows that the player is still alive (5/6 chance) or is not yet
  played. Player is able to play again.
* *dead* – last round outcome shows that the player is dead (1/6 chance).
  Player can't play anymore.
* *playing* – another round was started but the randomness is not yet fulfilled by VRF authorities
  (indicated as "spinning cylinder"). Player is not able to play at the moment.
   
### How to play

[Tests](tests/russian-roulette.ts) shows the contract logic in action.

Also there are a simple CLI for this contract (it is published on `devnet`):

```sh
# The `state` subcommand shows the current player state:
$ cargo run -q --package roulette-cli -- state
-- Using RPC https://api.devnet.solana.com, keypair /tmp/id.json
-- ------
Player HSCqQaDHGNc2kdPD2NTUKi3S953WZEJCnbrF4RHoxGjz is alive after 2 round(s)

# The `play` subcommand runs a single round:
$ cargo run -q --package roulette-cli -- play
-- Using RPC https://api.devnet.solana.com, keypair /tmp/id.json
-- ------
Loading a bullet and spinning the cylinder..
Waiting for the round to finish..
CLICK! Player HSCqQaDHGNc2kdPD2NTUKi3S953WZEJCnbrF4RHoxGjz is alive after 3 round(s)
```

### How to deploy

Note that the contract is already deployed on the `devnet`, however you can
change it's ID and deploy on another address:

```sh
# Generete a new keypair
$ solana-keygen new -o /tmp/new_keypair.json

# Update contract ID with the public key of the new keypair
vim programs/russian-roulette/lib.rs # update `declare_id!` macro value
vim Anchor.toml # update `programs.localnet.russian_roulette` address

# Deploy on the new address (add more funds to your wallet in case of 0x1 error)
anchor deploy --program-keypair /tmp/new_keypair.json --program-name russian-roulette
```
