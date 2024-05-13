# Rust native example

This example shows how to request randomness from ORAO VRF.

The example first generates a seed and performs a randomness request, and then subscribes for the
corresponding `Fulfill` event. Fulfilled randomness will be verified off-chain and printed to stdout.
