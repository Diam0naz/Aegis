# Aegis — Forward Implementation Plan

## Overview

Aegis is a prediction market protocol on Solana. This plan organizes all identified
improvements into phased milestones, integrating program hardening, ecosystem tooling
(Alpenglow, BAM, Arcium, Umbra), and frontend development.

---

## Phase 1 — Program Correctness (Pre-Audit)
*Fix bugs before any mainnet consideration. No new features.*

### 1.1 Creator fee redirection vulnerability
**File:** `settle_batch.rs`
Add constraint enforcing `creator_fee_account` matches `market.creator_fee_vault`:
```rust
constraint = creator_fee_account.key() == market.creator_fee_vault
    @ AegisError::InvalidCreatorFeeAccount
```

### 1.2 Resolution timing race condition
**File:** `propose_resolution.rs`
Require market to be `Locked` before resolution can be proposed:
```rust
require!(market.status == MarketStatus::Locked, AegisError::MarketNotLocked);
```

### 1.3 LP removal during active batch
**File:** `remove_liquidity.rs`
Block liquidity withdrawal while a batch is in progress:
```rust
require!(!market.batch_active, AegisError::BatchInProgress);
```

### 1.4 Missing emit events for liquidity
**Files:** `add_liquidity.rs`, `remove_liquidity.rs`
Emit `LiquidityAdded` and `LiquidityRemoved` events — subgraph indexers are already
defined in the txtx runbook but the program never fires them.

### 1.5 Pyth price staleness check
**File:** `check_price_resolution.rs`
Reject stale price feeds:
```rust
require!(
    clock.unix_timestamp - price.publish_time < 60,
    AegisError::StalePriceFeed
);
```

**Deliverable:** All five fixes merged, full test suite passing, `anchor build` clean.

---

## Phase 2 — Economic Security
*Harden the protocol against adversarial actors.*

### 2.1 Maximum position size
Add `max_order_bps` parameter to `create_market` (e.g. 1000 = max 10% of pool per order).
Enforce in `submit_order`:
```rust
let max_order = lp_pool.total_liquidity * market.max_order_bps as u64 / 10_000;
require!(amount <= max_order, AegisError::OrderExceedsMaxSize);
```

### 2.2 Crank incentivization
Add a `crank_tip_bps` field to `Market`. In `settle_batch`, transfer a small fixed
amount from the protocol fee to `cranker` account. This makes batch settlement
economically rational for third-party cranks on mainnet.

### 2.3 Oracle slashing and bonding
- Require oracles to post a bond (SOL) when registering via `OracleConfig`
- If an oracle votes against the finalized outcome, slash their bond
- Require minimum quorum (e.g. 3-of-5) before `tally_oracle_votes` is valid
- Add `min_oracle_bond` and `quorum_threshold` to `OracleConfig`

### 2.4 Emergency pause
Add `PauseMarket` instruction gated to `market.authority`. Sets a new
`MarketStatus::Paused` variant. All instructions except `remove_liquidity` and
`redeem_winnings` reject on `Paused` status. Allows authority to freeze a market
if a bug is discovered post-launch without trapping user funds.

### 2.5 Replace linear LMSR approximation with proper fixed-point exp
**File:** `submit_order.rs` (`lmsr_yes_price_bps`)

The current implementation uses a linear ratio (`yes / (yes + no)`) which diverges
from true LMSR pricing as quantities grow relative to `b_param`. Under true LMSR,
`P(YES) = exp(yes/b) / (exp(yes/b) + exp(no/b))`. The linear approximation
underprices extreme positions, meaning LPs are undercompensated when the market
is heavily skewed.

Replace with a fixed-point softmax using a lookup table or Taylor series for `exp`:
```rust
// exp(x) ≈ 1 + x + x²/2 + x³/6  for |x| < 2
// For larger x, use range reduction: exp(x) = exp(x - k*ln2) * 2^k
```
Must remain `no_std` compatible (no `f64`). Validate against reference values at
`b=100`, `b=1000`, `b=10000` across the full quantity range before replacing.

### 2.6 LMSR overflow audit
Formally verify `lmsr_yes_price_bps` at boundary values:
- `b_param = 100` (minimum), large quantities
- `yes_qty` or `no_qty` approaching `u64::MAX`
Add fuzz tests using `cargo fuzz` targeting the pricing function specifically.
Run this after 2.5 so the fuzz target covers the real implementation.

**Deliverable:** Economic attack vectors closed. Fuzz test suite added.

---

## Phase 3 — BAM Integration (Programmable Sequencing)
*Integrate Jito BAM for MEV-resistant order flow.*

### 3.1 BAM plugin for batch ordering
Define a BAM sequencing plugin that enforces:
- Orders submitted within a batch window are ordered by timestamp, not by tip size
- No order can be inserted after `batch_slot_start + batch_window_slots`
- Crank transactions are prioritized at batch close

This makes Aegis's batch clearing genuinely fair — no validator can reorder orders
within a batch to extract value.

### 3.2 Private transaction scheduling for cranks
Use BAM's private scheduling to submit `settle_batch` transactions without revealing
the crank's intent in the mempool. Prevents front-running the settlement itself.

### 3.3 Application-controlled sequencing rules
Expose a market-level `sequencing_policy` field (enum: `FairOrder`, `TimeWeighted`,
`StakeWeighted`). BAM plugin reads this and applies the corresponding ordering logic.
Market creators choose their microstructure.

**Deliverable:** BAM plugin spec written and prototyped. Integration tested on devnet
once BAM is publicly available.

---

## Phase 4 — Arcium Integration (Private Oracle Votes)
*Seal oracle votes until quorum, preventing front-running on resolution.*

### 4.1 Sealed oracle voting
Replace public `submit_oracle_vote` with an Arcium MPC circuit:
- Each oracle submits an encrypted vote to the Arcium network
- Votes are aggregated off-chain using secret sharing
- Only the aggregate outcome is revealed on-chain when quorum is reached
- Individual oracle votes remain private

This closes the attack vector where a trader watches oracle votes accumulate and
trades against the outcome before `tally_oracle_votes` finalizes.

### 4.2 Confidential resolution bond
Use Arcium to seal the resolution proposer's identity until the challenge window
closes. Prevents targeted harassment or bribery of proposers on high-value markets.

### 4.3 Private LP positions (longer term)
Allow LPs to commit liquidity without revealing position size on-chain. Arcium
computes the proportional LP token allocation in an MPC circuit. Relevant for
institutional LPs who don't want strategy leakage.

**Deliverable:** Arcium oracle voting circuit designed. Integration dependent on
Arcium mainnet availability.

---

## Phase 5 — Umbra-style Privacy Routing
*Reduce metadata leakage for traders.*

### 5.2 Stealth order submission
Integrate stealth address generation for order submission. Traders generate a
one-time address per order — breaks linkability between orders from the same wallet.

### 5.1 Implement `reveal_order` instruction and enforce commit-reveal in settle_batch

The `BatchOrder` account already carries `commitment_hash`, `is_commit_reveal`, and
`is_revealed` fields, and `submit_order` flags orders with `impact > COMMIT_REVEAL_THRESHOLD_BPS`
(currently 200 bps). However, the `reveal_order` instruction does not exist yet, and
`settle_batch` does not reject unrevealed high-impact orders — the protection is
declared but not enforced.

**Step 1 — `reveal_order` instruction:**
```rust
// Verify hash(outcome || amount || nonce) == order.commitment_hash
let hash = anchor_lang::solana_program::hash::hashv(&[
    &[outcome as u8], amount.to_le_bytes().as_ref(), nonce.as_ref()
]);
require!(hash.to_bytes() == order.commitment_hash, AegisError::InvalidReveal);
order.is_revealed = true;
order.outcome = outcome;
order.amount_in = amount;
```

**Step 2 — enforce in `settle_batch`:**
```rust
if order.is_commit_reveal {
    require!(order.is_revealed, AegisError::OrderNotRevealed);
}
```

**Step 3 — enforce in `submit_order` for high-impact orders:**
```rust
if impact > COMMIT_REVEAL_THRESHOLD_BPS {
    order.is_commit_reveal = true;
    order.is_revealed = false;
    order.commitment_hash = commitment_hash; // passed as param
    // do NOT write outcome/amount yet — written at reveal time
}
```

### 5.3 Intent separation
Separate order intent (what you want) from order execution (what goes on-chain).
Orders are committed as hashed intents, revealed at batch settlement. This is
already partially implemented via the batch model — extend it with full
commit-reveal using Pedersen commitments.

### 5.4 Metadata hardening
Document and mitigate known deanonymization vectors:
- Timing correlation (orders submitted close together from same IP)
- Amount fingerprinting (round numbers are identifiable)
- Gas/fee patterns

**Important caveat:** Privacy is probabilistic. Document the threat model honestly
in the protocol spec. Do not claim anonymity — claim unlinkability with known
limitations.

**Deliverable:** Commit-reveal scheme implemented. Stealth address support added
as optional feature at market creation.

---

## Phase 6 — Alpenglow Readiness (UX Overhaul)
*Redesign frontend and confirmation flow for sub-200ms finality.*

### 6.1 Optimistic UI
When Alpenglow ships, treat transactions as confirmed immediately after submission.
Show optimistic state in the UI, reconcile with chain state on confirmation.
Remove all polling loops and WebSocket fallbacks from the frontend.

### 6.2 Real-time market state
Replace mock data with live on-chain subscriptions:
```ts
connection.onAccountChange(marketPDA, (info) => {
  const market = program.coder.accounts.decode('Market', info.data);
  setMarketState(market);
});
```

### 6.3 Subgraph-driven history
Query the txtx-deployed subgraphs for:
- Trade history (`OrderSubmitted`, `BatchSettled`)
- LP activity (`LiquidityAdded`, `LiquidityRemoved`)
- Resolution timeline (`ResolutionProposed`, `ResolutionFinalized`)

Use this to build market charts, LP dashboards, and resolution history UI.

### 6.4 Wallet adapter integration
Add `@solana/wallet-adapter-react` to the Next.js app. Support:
- Phantom, Backpack, Solflare
- Mobile wallet adapter for native app path

### 6.5 Fix missing frontend modules
Implement the missing files that currently prevent the app from building:
- `@/lib/mockData` → replace with real chain queries
- `@/lib/utils` → price formatting, slot-to-time conversion, BN helpers
- `@/components/MarketCard` → live market data from subgraph
- `@/components/TradePanel` → connected to `submit_order` instruction
- `@/components/Navbar` → wallet connect button

**Deliverable:** Frontend builds and connects to localnet. All mock data replaced
with real chain state.

---

## Phase 7 — Audit and Mainnet
*External review before real funds.*

### 7.1 Formal security audit
Engage a Solana-specialized auditor (OtterSec, Neodyme, or Trail of Bits).
Focus areas:
- LMSR arithmetic correctness
- Oracle manipulation vectors
- Fee accounting invariants
- PDA collision analysis

### 7.2 Invariant test suite
Before audit, write invariant tests covering:
- `vault_balance >= max_possible_payout` at all times
- `total_lp_supply > 0` whenever `total_liquidity > 0`
- `yes_price_bps + no_price_bps == 10_000` after every batch
- Fee accounting: `fees_collected == sum(order_fee for all filled orders)`

### 7.3 Mainnet deployment checklist
- [ ] All Phase 1-2 fixes merged
- [ ] Audit complete, critical findings resolved
- [ ] BAM plugin tested on devnet
- [ ] Emergency pause tested
- [ ] Oracle slashing tested
- [ ] Frontend connected to mainnet RPC
- [ ] Monitoring: alerts on vault balance anomalies, stalled batches

---

## Priority Matrix

| Item | Impact | Effort | Phase |
|---|---|---|---|
| Creator fee redirection fix | Critical | Low | 1 |
| Resolution timing fix | Critical | Low | 1 |
| LP removal during batch | Critical | Low | 1 |
| Emit liquidity events | High | Low | 1 |
| Max position size | High | Low | 2 |
| Crank incentivization | High | Medium | 2 |
| Oracle slashing | High | High | 2 |
| Emergency pause | Medium | Low | 2 |
| Replace linear LMSR with fixed-point exp | High | Medium | 2 |
| LMSR overflow / fuzz audit | High | Medium | 2 |
| BAM sequencing plugin | High | High | 3 |
| Arcium oracle votes | Medium | Very High | 4 |
| reveal_order + settle_batch enforcement | High | Medium | 5 |
| Commit-reveal (Pedersen / stealth) | Medium | Medium | 5 |
| Optimistic UI (Alpenglow) | High | Medium | 6 |
| Subgraph frontend | High | Medium | 6 |
| Wallet adapter | High | Low | 6 |
| Formal audit | Critical | External | 7 |

---

## Technology Dependency Map

```
Aegis Core Program
    ├── Phase 1-2: self-contained (no external deps)
    ├── Phase 3: depends on BAM public availability
    ├── Phase 4: depends on Arcium mainnet
    ├── Phase 5: self-contained (commit-reveal is pure crypto)
    ├── Phase 6: depends on Alpenglow for full UX benefit
    │            (can ship frontend before Alpenglow, just with polling)
    └── Phase 7: depends on Phases 1-2 complete
```

Phases 1, 2, 5, and 6 can be built now without waiting for any external protocol.
Phases 3 and 4 are roadmap items gated on BAM and Arcium availability.
Phase 7 gates mainnet.
