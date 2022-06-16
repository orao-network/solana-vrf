# CPI Example

This example contract shows how to perform a cross-program invocation (CPI) of the ORAO VRF contract.

## Contract

This contract implements a trivial single-player Russian Roulette. The outcome of a round is based
on the randomness, requested from ORAO VRF contract via CPI. The contract have only one instruction
called "SpinAndPullTheTrigger { force }" (see [`src/instructions.rs`](src/instructions.rs)).
This instruction asserts that the player is able to play and invokes ORAO VRF via CPI
(see [`src/processor.rs`](src/processor.rs)). The "force" value is used as a VRF seed
(generated randomly).

Round outcome is derived lazily from the VRF randomness.

### The contract logic

There are three possible player states:

* *alive* – last round outcome shows that the player is still alive (5/6 chance) or is not yet
  played. Player is able to play again.
* *dead* – last round outcome shows that the player is dead (1/6 chance).
  Player can't play anymore.
* *playing* – another round was started but the randomness is not yet fulfilled by the ORAO VRF
  (indicated as "spinning cylinder"). Player is not able to play at the moment.
   
### How to deploy

First, You need to generate a new identity for the contract:

```
$ solana-keygen new -o id_russian_roulette.json
Generating a new keypair

For added security, enter a BIP39 passphrase

NOTE! This passphrase improves security of the recovery seed phrase NOT the
keypair file itself, which is stored as insecure plain text

BIP39 Passphrase (empty for none): 

Wrote new keypair to /Users/set/.config/solana/id_russian_roulette.json
=============================================================================
pubkey: J2tHGZGditCi6ywttLXkWgs4DWwoco6cpuARGKnR3XZK
=============================================================================
Save this seed phrase and your BIP39 passphrase to recover your new keypair:
various sword vote artwork adapt creek reject net course viable cousin kidney
=============================================================================
```

Second, You need to put its public key into the declare_id macro:

```
$ vim src/lib.rs
```

Third, You need to build and publish the contract.

Please verify that are enough funds on your account to deploy the contract.
1 SOL will probably not be enough, so get some SOL to your devnet keypair.

```
$ cargo build-bpf -- --lib
...
To deploy this program:
  $ solana program deploy solana-vrf/rust/target/deploy/russian_roulette.so
The program address will default to this keypair (override with --program-id):
  solana-vrf/rust/target/deploy/russian_roulette-keypair.json

$ solana program deploy --program-id id_russian_roulette.json solana-vrf/rust/target/deploy/russian_roulette.so
Program Id: J2tHGZGditCi6ywttLXkWgs4DWwoco6cpuARGKnR3XZK
```

### How to play

There is a CLI helper that is able to invoke a round and show player state.

```
# Play a round:
$ cargo run --bin russian_roulette --features="cli" -- play

Using RPC https://api.devnet.solana.com, keypair /Users/set/.config/solana/id.json
Loading a bullet and spinning a cylinder..
Waiting for the round to finish..
The cylinder is still spinning..
The cylinder is still spinning..
The cylinder is still spinning..
Player HSCqQaDHGNc2kdPD2NTUKi3S953WZEJCnbrF4RHoxGjz is alive after 1 rounds
...
...
...
# Shows the player state:
$ cargo run --bin russian_roulette --features="cli" -- state

Using RPC https://api.devnet.solana.com, keypair /Users/set/.config/solana/id.json
Player HSCqQaDHGNc2kdPD2NTUKi3S953WZEJCnbrF4RHoxGjz is alive after 11 rounds


Using RPC https://api.devnet.solana.com, keypair /Users/set/.config/solana/id.json
Loading a bullet and spinning the cylinder..
Waiting for the round to finish..
The cylinder is still spinning..
The cylinder is still spinning..
The cylinder is still spinning..
Player HSCqQaDHGNc2kdPD2NTUKi3S953WZEJCnbrF4RHoxGjz is alive after 12 rounds
```
