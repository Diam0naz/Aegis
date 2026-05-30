# Aegis Privacy Threat Model

## What Aegis is and is not

Aegis is a prediction market protocol. It is **not** an anonymity system.
All transactions are on-chain and permanently visible. Your wallet address
is always the transaction signer.

What Aegis does provide is **unlinkability of order intent** for large orders
within a batch window — meaning an observer cannot determine which direction
a high-impact order is betting before the batch settles.

---

## Current protections (implemented)

### Batch clearing

All orders within a batch window clear at a single uniform price.

**What this prevents:** An order cannot get a better price by arriving earlier
within the same batch window. There is no price-time priority to exploit.

**What this does not prevent:** A validator can still observe standard orders
and reorder them within a block. BAM integration (Phase 3) is required to
close this gap.

### Commit-reveal for high-impact orders

Orders that would move the price by more than 200 bps are flagged as
commit-reveal orders. The trader submits `hash(outcome || amount || nonce)`
at order time and reveals the preimage before `settle_batch`.

**What this prevents:** Validators and other traders cannot read the order
direction from the mempool and trade ahead of it within the same batch window.
The existence of a large order is visible, but not which side it is on.

**Current implementation status:** The `BatchOrder` account stores
`commitment_hash`, `is_commit_reveal`, and `is_revealed` fields, and
`submit_order` flags high-impact orders correctly. However, the `reveal_order`
instruction does not yet exist, and `settle_batch` does not yet reject
unrevealed high-impact orders. **The protection is declared in the data model
but not yet enforced on-chain.** This is tracked as Phase 5.1 in the roadmap.

---

## Known deanonymization vectors

These are weaknesses Aegis does not mitigate on-chain. Users must handle them
at the network and wallet layer.

### Timing correlation

Orders submitted close together in time from the same IP address are linkable
at the network layer, even if submitted from different wallets.

**User mitigation:** Use a VPN or Tor. Aegis has no on-chain mitigation for
this.

### Amount fingerprinting

Round-number order amounts (e.g. exactly 100 USDC, 1000 USDC) are
distinguishable from noise and may correlate orders across markets or time
periods.

**User mitigation:** Add random noise to order sizes. Aegis does not enforce
this.

### Fee and priority patterns

Wallets that consistently use the same priority fee level are fingerprintable
across transactions.

**User mitigation:** Randomise priority fees within a reasonable range.

### Wallet clustering

A wallet that both provides liquidity and submits orders in the same market
can be identified as having a position in both directions.

**User mitigation:** Use separate wallets for LP and trading activity.

---

## What Aegis does NOT claim

- **Anonymity:** Aegis does not hide the existence of your transactions.
- **Sender privacy:** Your wallet address is always the transaction signer.
  Stealth addresses are a planned future feature (Phase 5.2), not available today.
- **Amount privacy:** Standard order amounts are fully public. Only the
  direction of high-impact commit-reveal orders is hidden pre-reveal — and
  only once Phase 5.1 is complete.
- **Intra-batch ordering fairness:** Without BAM (Phase 3), validators retain
  discretion over ordering within a block.

---

## Planned privacy improvements (not yet available)

| Feature | What it adds | Roadmap phase |
|---|---|---|
| `reveal_order` instruction + `settle_batch` enforcement | Makes commit-reveal protection actually enforced on-chain | Phase 5.1 |
| BAM sequencing plugin | Removes validator discretion over intra-batch order ordering | Phase 3 |
| Arcium sealed oracle votes | Hides individual oracle votes until quorum; prevents front-running resolution | Phase 4 |
| Stealth address support | Breaks linkability between orders from the same wallet | Phase 5.2 |

---

## Summary

Today, Aegis provides batch-level price fairness and a data model that supports
commit-reveal for high-impact orders. The commit-reveal enforcement is not yet
active. Anonymity is not a goal of the protocol. The threat model above documents
what is real, what is partial, and what is planned.
