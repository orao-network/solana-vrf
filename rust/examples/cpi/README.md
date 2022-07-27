# CPI Example

This example contract shows how to perform a cross-program invocation (CPI)
of the ORAO VRF contract.

## Contract

This contract implements a trivial single-player Russian Roulette. The outcome
of a round is based on the randomness, requested from ORAO VRF contract via CPI.
The contract has only one instruction called "SpinAndPullTheTrigger { force }"
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
