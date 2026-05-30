import { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

// ── Price formatting ──────────────────────────────────────────────

/** Convert basis points (0–10000) to a human-readable percentage string */
export function bpsToPercent(bps: number | BN): string {
  const n = BN.isBN(bps) ? bps.toNumber() : bps;
  return (n / 100).toFixed(2) + "%";
}

/** Format a USDC amount (6 decimals) to a display string */
export function formatUsdc(lamports: number | BN): string {
  const n = BN.isBN(lamports) ? lamports.toNumber() : lamports;
  return (n / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a large number with K/M suffix */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

// ── Slot / time conversion ────────────────────────────────────────

const SLOT_DURATION_MS = 400; // Solana target: 400ms per slot

/** Convert a slot count to approximate milliseconds */
export function slotsToMs(slots: number | BN): number {
  const n = BN.isBN(slots) ? slots.toNumber() : slots;
  return n * SLOT_DURATION_MS;
}

/** Convert a future slot to an estimated Date */
export function slotToDate(
  targetSlot: number | BN,
  currentSlot: number,
  now: Date = new Date(),
): Date {
  const target = BN.isBN(targetSlot) ? targetSlot.toNumber() : targetSlot;
  const deltaMs = (target - currentSlot) * SLOT_DURATION_MS;
  return new Date(now.getTime() + deltaMs);
}

/** Human-readable time-until string for a future slot */
export function slotToCountdown(
  targetSlot: number | BN,
  currentSlot: number,
): string {
  const target = BN.isBN(targetSlot) ? targetSlot.toNumber() : targetSlot;
  const deltaMs = (target - currentSlot) * SLOT_DURATION_MS;
  if (deltaMs <= 0) return "Ended";

  const seconds = Math.floor(deltaMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ── BN helpers ────────────────────────────────────────────────────

/** Safe BN to number — throws if value exceeds MAX_SAFE_INTEGER */
export function bnToNumber(bn: BN): number {
  if (bn.gt(new BN(Number.MAX_SAFE_INTEGER.toString()))) {
    throw new Error(`BN value ${bn.toString()} exceeds MAX_SAFE_INTEGER`);
  }
  return bn.toNumber();
}

/** Compute implied probability from yes price in bps */
export function impliedProbability(yesPriceBps: number): number {
  return yesPriceBps / 100; // returns 0–100 (percentage)
}

// ── PDA derivation ────────────────────────────────────────────────

export function getMarketPDA(
  programId: PublicKey,
  authority: PublicKey,
  questionHash: Uint8Array,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), authority.toBuffer(), Buffer.from(questionHash)],
    programId,
  )[0];
}

export function getBatchOrderPDA(
  programId: PublicKey,
  market: PublicKey,
  user: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), market.toBuffer(), user.toBuffer()],
    programId,
  )[0];
}

// ── Utility Functions ─────────────────────────────────────────────

/** Truncate a base58 pubkey for display */
export function truncatePubkey(pk: string, chars = 4): string {
  if (pk.length <= chars * 2 + 3) return pk;
  return `${pk.slice(0, chars)}…${pk.slice(-chars)}`;
}

/** Format fee basis points to percentage string */
export function formatFeeBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/** Map a YES price (0–100) to a CSS color */
export function priceColor(price: number): string {
  if (price >= 60) return "var(--yes)";
  if (price <= 40) return "var(--no)";
  return "var(--text-muted)";
}
