// ── Utility Functions ─────────────────────────────────────────────

/** Format a raw USDC amount (already whole-dollar mock values) into a readable string */
export function formatUsdc(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

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
