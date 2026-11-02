# Recipes

Focused, copy-pasteable patterns for common ORAO VRF use-cases. Each recipe shows
the smallest amount of code needed and assumes you've finished the
[Getting Started](./GETTING_STARTED.md) guide.

- [Random NFT trait selection](#random-nft-trait-selection) — callback variant
- [Weighted raffle / lottery winner](#weighted-raffle--lottery-winner) — classic or callback
- [Off-chain verification of fulfilled randomness](#off-chain-verification-of-fulfilled-randomness) — any variant
- [Multi-round game with sequential requests](#multi-round-game-with-sequential-requests) — classic
- [Deterministic seed derivation](#deterministic-seed-derivation) — anti-collision pattern

---

## Random NFT trait selection

**Pattern:** mint a placeholder NFT, request randomness via callback, finalize traits
when the callback fires. The mint and the trait selection are atomic from the user's
perspective (one tx of theirs starts the flow; the callback completes it).

```rust
// Inside your client program — the request side
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MintParams { pub seed: [u8; 32] }

pub fn mint(ctx: Context<Mint>, params: MintParams) -> Result<()> {
    // 1. Allocate your NFT state, marked as "pending traits".
    ctx.accounts.nft.status = NftStatus::PendingTraits;

    // 2. CPI request to VRF, with a request-level callback that targets `finalize_traits`.
    let cb = orao_solana_vrf_cb::state::client::Callback::from_instruction_data(
        &crate::instruction::FinalizeTraits { nft: ctx.accounts.nft.key() },
    );

    // ... build cpi_accounts (see Getting Started, callback section) ...
    let cpi_params = orao_solana_vrf_cb::RequestParams::new(params.seed).with_callback(Some(cb));
    orao_solana_vrf_cb::cpi::request(cpi_ctx, cpi_params)?;
    Ok(())
}

// Callback ix invoked by VRF when randomness lands
pub fn finalize_traits(ctx: Context<FinalizeTraits>, nft: Pubkey) -> Result<()> {
    let randomness: &[u8] = ctx.accounts.request.fulfilled_randomness()
        .ok_or(ProgramError::InvalidAccountData)?;

    let r = ctx.accounts.nft.as_mut();
    // Derive each trait from a non-overlapping byte window of the 64-byte randomness.
    r.background = pick(&randomness[0..8], &BACKGROUNDS);
    r.body       = pick(&randomness[8..16], &BODIES);
    r.eyes       = pick(&randomness[16..24], &EYES);
    r.mouth      = pick(&randomness[24..32], &MOUTHS);
    r.rarity     = rarity_from(&randomness[32..40]);   // weighted, see below
    r.status     = NftStatus::Finalized;
    Ok(())
}

fn pick<'a, T>(bytes: &[u8], from: &'a [T]) -> &'a T {
    let n = u64::from_le_bytes(bytes.try_into().unwrap());
    &from[(n as usize) % from.len()]
}
```

**Why bytewise:** treating each 8-byte window as an independent uniform `u64` keeps trait
choices independent. Don't reuse the same bytes for two outputs.

---

## Weighted raffle / lottery winner

**Pattern:** participants each have an integer weight. Pick a winner with probability
proportional to weight.

```rust
/// Picks an index into `weights` with probability proportional to each weight.
/// `randomness` is one of the 64 bytes of the fulfilled randomness.
fn weighted_pick(randomness: &[u8], weights: &[u64]) -> usize {
    let total: u128 = weights.iter().map(|&w| w as u128).sum();
    let r = u64::from_le_bytes(randomness[0..8].try_into().unwrap()) as u128;
    let mut target = r % total;
    for (i, &w) in weights.iter().enumerate() {
        if target < w as u128 { return i; }
        target -= w as u128;
    }
    weights.len() - 1
}
```

**Anchored example (classic, off-chain settlement):**

```rust
// Request once, after entries are locked
let seed: [u8; 32] = rand::random();
RequestBuilder::new(seed).build(&program).await?.send().await?;
let randomness = wait_fulfilled(seed, program.clone()).await.await?;

let weights: Vec<u64> = entries.iter().map(|e| e.tickets).collect();
let winner_idx = weighted_pick(&randomness, &weights);
println!("Winner: {}", entries[winner_idx].name);
```

**Anchored example (callback, on-chain settlement):** put `weighted_pick` inside your
callback ix; read `weights` from your own State PDA.

---

## Off-chain verification of fulfilled randomness

**Pattern:** anyone — including users who don't trust your backend — can re-verify that
the randomness for a given seed was produced by authorized fulfillment authorities.
This is the *verifiable* in VRF.

```rust
use ed25519_dalek::{PublicKey, Signature, Verifier};
use orao_solana_vrf::{get_network_state, get_randomness};

let network = get_network_state(&program).await?;
let request = get_randomness(&program, &seed).await?;

// Each response is one authority's Ed25519 signature of the seed
// (`responses()` is `None` until the request is fulfilled).
let responses = request.responses().expect("request not fulfilled yet");
for r in responses {
    assert!(network.config.fulfillment_authorities.contains(&r.pubkey));
    let pk = PublicKey::from_bytes(&r.pubkey.to_bytes())?;
    let sig = Signature::from_bytes(&r.randomness)?;
    pk.verify(&seed, &sig)?; // errors if the signature is invalid
}

// Final randomness is the XOR of all response signatures.
let final_randomness = responses.iter().fold([0u8; 64], |mut acc, r| {
    for i in 0..64 { acc[i] ^= r.randomness[i]; }
    acc
});
assert_eq!(final_randomness, request.fulfilled_randomness().unwrap());
```

**JS equivalent** uses `tweetnacl.sign.detached.verify(seed, signature, pubkey)` or
`@noble/ed25519`.

---

## Multi-round game with sequential requests

**Pattern:** a player plays multiple rounds; each round needs fresh randomness without
collision with previous rounds.

```rust
// Don't do this — same seed will be rejected on the second round:
let seed = player_pubkey.to_bytes(); // ❌ collides after round 1

// Do this — derive a per-round seed:
// Cargo.toml: solana-keccak-hasher = "3" (a syscall on-chain, plain Rust off-chain)
fn round_seed(player: &Pubkey, round: u64) -> [u8; 32] {
    solana_keccak_hasher::hashv(&[player.as_ref(), &round.to_le_bytes()]).to_bytes()
}
```

Then in your program:

```rust
pub fn play(ctx: Context<Play>) -> Result<()> {
    let state = &mut ctx.accounts.player_state;
    let seed = round_seed(&ctx.accounts.player.key(), state.round);
    state.round = state.round.checked_add(1).unwrap();
    state.pending_seed = seed;

    // CPI request with `seed` — see Getting Started.
    Ok(())
}
```

The pattern works for both variants. With the callback variant, your callback can
read `state.round` to know which round is being settled.

---

## Deterministic seed derivation

**Pattern:** when seed uniqueness matters and you can't rely on a wallet-supplied random
seed (it could be replayed), derive it deterministically from on-chain state.

```rust
use solana_keccak_hasher::hashv; // Cargo.toml: solana-keccak-hasher = "3"

/// Combines callers, a context discriminator, and a monotonic counter into a
/// collision-resistant seed.
fn derive_seed(player: &Pubkey, context: &[u8], counter: u64) -> [u8; 32] {
    hashv(&[player.as_ref(), context, &counter.to_le_bytes()]).to_bytes()
}
```

**Why not just `Clock::get()?.slot`:** multiple txs in the same slot collide, and slot
is publicly known so it doesn't add unpredictability beyond uniqueness.

**Why not `rand::random()` on-chain:** there is no on-chain RNG that is unpredictable
*before* you ask VRF — that's the entire point of asking VRF.

---

## See also

- [Getting Started](./GETTING_STARTED.md) — install + minimum viable integration.
- [Callback integration guide](./callback/README.md) — registration, callback rules,
  Address Lookup Tables, directives.
- [Russian Roulette CPI example](./rust/examples/cpi) — complete Anchor program.
- [Callback example client](./callback/rust/examples/cpi) — complete callback flow.
