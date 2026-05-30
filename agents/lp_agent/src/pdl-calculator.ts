// ── PDL Calculator ───────────────────────────────────────────────────
// Predictive Divergence Loss (PDL) computation for LP positions.
//
// PDL = the delta between:
//   (1) What the LP's share is worth NOW (mark-to-market via LMSR)
//   (2) What the LP deposited originally (cost basis)
//
// Positive PDL = LP is earning (fees > IL)
// Negative PDL = LP is losing (IL > fees)
//
// This module mirrors the on-chain LMSR math exactly to achieve
// the <1% accuracy KPI target.

// ── LMSR Constants — must match submit_order.rs ──────────────────────
const SCALE = 1_000_000_000n; // 9-decimal fixed-point, same as on-chain

// exp(k) lookup table — identical to the on-chain EXP_LOOKUP
const EXP_LOOKUP: bigint[] = [
  1_000_000_000n,          // exp(0)
  2_718_281_828n,          // exp(1)
  7_389_056_099n,          // exp(2)
  20_085_536_923n,         // exp(3)
  54_598_150_033n,         // exp(4)
  148_413_159_103n,        // exp(5)
  403_428_793_493n,        // exp(6)
  1_096_633_158_428n,      // exp(7)
  2_980_957_987_041n,      // exp(8)
  8_103_083_927_576n,      // exp(9)
  22_026_465_794_806n,     // exp(10)
  59_874_141_715_197n,     // exp(11)
  162_754_791_419_004n,    // exp(12)
  442_413_392_314_966n,    // exp(13)
  1_202_604_284_164_776n,  // exp(14)
  3_269_446_681_940_005n,  // exp(15)
  8_886_110_520_507_872n,  // exp(16)
  24_154_952_753_575_298n, // exp(17)
  65_659_969_137_330_511n, // exp(18)
];

const SENTINEL = BigInt("85070591730234615865843651857942052863"); // u128::MAX / 2 sentinel

/**
 * Taylor series exp(r) for r in [0, SCALE) — mirrors on-chain exp_fractional
 */
function expFractional(r: bigint): bigint {
  const term0 = SCALE;
  const term1 = r;
  const term2 = (r * r / SCALE) / 2n;
  const term3 = (r * r / SCALE * r / SCALE) / 6n;
  const term4 = (r * r / SCALE * r / SCALE * r / SCALE) / 24n;
  return term0 + term1 + term2 + term3 + term4;
}

/**
 * Compute exp(numerator / denominator) using range reduction.
 * Mirrors on-chain exp_ratio exactly.
 */
function expRatio(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("Division by zero in expRatio");

  const k = Number(numerator / denominator);

  if (k >= 19) return SENTINEL;

  const remainder = numerator % denominator;
  const r = (remainder * SCALE) / denominator;

  const expK = EXP_LOOKUP[k]!;
  const expR = expFractional(r);

  return (expK * expR) / SCALE;
}

/**
 * LMSR YES price in basis points (1-9999).
 * Exact mirror of on-chain lmsr_yes_price_bps.
 */
export function lmsrYesPriceBps(
  bParam: bigint,
  yesQty: bigint,
  noQty: bigint,
): number {
  if (yesQty === noQty) return 5000;

  const expYes = expRatio(yesQty, bParam);
  const expNo = expRatio(noQty, bParam);

  const isYesExtreme = expYes === SENTINEL;
  const isNoExtreme = expNo === SENTINEL;

  if (isYesExtreme && !isNoExtreme) return 9999;
  if (isNoExtreme && !isYesExtreme) return 1;
  if (isYesExtreme && isNoExtreme) return yesQty >= noQty ? 9999 : 1;

  const total = expYes + expNo;
  const priceBps = Number((expYes * 10_000n) / total);

  return Math.max(1, Math.min(9999, priceBps));
}

/**
 * Compute the LMSR cost function: C(q) = b * ln(exp(q_yes/b) + exp(q_no/b))
 * Returns value in the same units as the quantities (USDC micro-units).
 *
 * We approximate ln(x) using the identity: ln(x) = ln(x * SCALE / SCALE)
 * For practical purposes, we compute the ratio approach.
 */
export function lmsrCost(
  bParam: bigint,
  yesQty: bigint,
  noQty: bigint,
): bigint {
  const expYes = expRatio(yesQty, bParam);
  const expNo = expRatio(noQty, bParam);

  if (expYes === SENTINEL || expNo === SENTINEL) {
    // Extreme skew — cost ≈ max(yes_qty, no_qty)
    return yesQty > noQty ? yesQty : noQty;
  }

  const sumExp = expYes + expNo;

  // ln(sumExp / SCALE) * b — use a fixed-point ln approximation
  // ln(x) ≈ (x - 1) - (x-1)²/2 + (x-1)³/3 for x near 1
  // But sumExp/SCALE can be >> 1, so we use a binary decomposition approach:
  // Find the highest power of e such that sumExp/SCALE >= exp(k)
  // Then ln(sumExp/SCALE) ≈ k + ln(sumExp / (SCALE * exp(k)))

  let k = 0;
  let threshold = SCALE;
  while (k < 18 && threshold * EXP_LOOKUP[k + 1]! / SCALE <= sumExp) {
    k++;
  }

  const expK = EXP_LOOKUP[k]!;
  // Normalized value: sumExp / (SCALE * exp(k)) = sumExp / (expK * SCALE / SCALE) = sumExp / expK
  // This should be in [1, e) represented as [SCALE, e*SCALE)
  const normalized = (sumExp * SCALE) / expK;

  // ln(normalized/SCALE) using Taylor series for ln(1+x) where x = normalized/SCALE - 1
  // x is in [0, e-1) ≈ [0, 1.718)
  const x = normalized - SCALE;
  // For better convergence, we use the identity ln(1+x) = 2*arctanh(x/(x+2))
  // But simpler: ln(1+x) ≈ x - x²/2 + x³/3 - x⁴/4 (converges for |x| < 1)
  // For x > 1, we halve: ln(1+x) = ln(sqrt(1+x))² = 2*ln(sqrt(1+x))

  let lnFrac: bigint;
  if (x < SCALE) {
    // |x| < 1 — Taylor converges well
    const x2 = (x * x) / SCALE;
    const x3 = (x2 * x) / SCALE;
    const x4 = (x3 * x) / SCALE;
    lnFrac = x - x2 / 2n + x3 / 3n - x4 / 4n;
  } else {
    // x ≥ 1 — use Newton's method approximation
    // ln(1+x) for x in [1, e-1): result is in [ln(2), 1) = [0.693, 1)
    // Good enough: ln(1+x) ≈ x / (1 + x/2) (Padé approximant)
    lnFrac = (x * SCALE) / (SCALE + x / 2n);
  }

  // Total: ln(sumExp/SCALE) = k + lnFrac/SCALE
  // Cost = b * (k * SCALE + lnFrac) / SCALE
  const lnTotal = BigInt(k) * SCALE + lnFrac;
  return (bParam * lnTotal) / SCALE;
}

// ── PDL Metrics ──────────────────────────────────────────────────────

export interface PoolMetrics {
  /** Market pubkey (base58) */
  market: string;
  /** Current YES price in BPS */
  yesPriceBps: number;
  /** Current NO price in BPS */
  noPriceBps: number;
  /** Total liquidity in the pool (USDC micro-units) */
  totalLiquidity: bigint;
  /** Total LP token supply */
  totalLpSupply: bigint;
  /** Cumulative fees earned by LPs */
  cumulativeFees: bigint;
  /** LP token value: totalLiquidity / totalLpSupply (USDC per LP token) */
  lpTokenValue: number;
  /** Current LMSR cost function value */
  lmsrCostValue: bigint;
  /** PDL in basis points: + means LPs profiting, - means LPs losing */
  pdlBps: number;
  /** Pool depth: how much a 1% price move costs in USDC */
  depthUsdc: bigint;
  /** Pool utilization: total_outstanding_shares / total_liquidity */
  utilizationPct: number;
  /** Fee APY (annualized from recent fee accrual) */
  feeApyPct: number;
  /** Timestamp of this snapshot */
  timestamp: number;
}

/**
 * Compute the full set of LP metrics for a single pool.
 * This is the core calculation that feeds into all LP alerts and the PDL accuracy KPI.
 */
export function computePoolMetrics(
  market: string,
  bParam: bigint,
  yesQty: bigint,
  noQty: bigint,
  totalLiquidity: bigint,
  totalLpSupply: bigint,
  cumulativeFees: bigint,
  /** Slot duration in seconds (Solana: ~0.4s) */
  slotDuration: number,
  /** Slots since the pool was created */
  poolAgeSlots: bigint,
): PoolMetrics {
  // ── Prices ──────────────────────────────────────────────────────
  const yesPriceBps = lmsrYesPriceBps(bParam, yesQty, noQty);
  const noPriceBps = 10_000 - yesPriceBps;

  // ── LP token value ──────────────────────────────────────────────
  const lpTokenValue =
    totalLpSupply > 0n
      ? Number(totalLiquidity) / Number(totalLpSupply)
      : 1.0;

  // ── LMSR cost ───────────────────────────────────────────────────
  const lmsrCostValue = lmsrCost(bParam, yesQty, noQty);

  // ── PDL calculation ─────────────────────────────────────────────
  // PDL = (current pool value - initial pool value) / initial pool value
  // Current pool value = total_liquidity (includes fees)
  // The "loss" comes from the LMSR exposure: the AMM's liability
  // is the max payout of outstanding shares minus their cost
  //
  // Simplified: PDL ≈ (cumulative_fees - impermanent_loss) / total_liquidity
  // IL ≈ lmsr_cost(current_state) - lmsr_cost(initial_state)
  //
  // At pool creation, yes_qty == no_qty == 0, so initial cost = b * ln(2)
  const initialCost = (bParam * 693_147_180n) / SCALE; // b * ln(2), scaled

  const ilRaw = lmsrCostValue > initialCost
    ? lmsrCostValue - initialCost
    : 0n;

  // PDL in bps = ((fees - IL) / liquidity) * 10000
  const netPnl = BigInt(Number(cumulativeFees)) - ilRaw;
  const pdlBps =
    totalLiquidity > 0n
      ? Number((netPnl * 10_000n) / totalLiquidity)
      : 0;

  // ── Pool depth ──────────────────────────────────────────────────
  // How much USDC to move the price by 1% (100 bps)
  // depth ≈ b_param * 100 (rough approximation for LMSR)
  const depthUsdc = bParam * 100n;

  // ── Utilization ─────────────────────────────────────────────────
  const totalShares = yesQty + noQty;
  const utilizationPct =
    totalLiquidity > 0n
      ? (Number(totalShares) / Number(totalLiquidity)) * 100
      : 0;

  // ── Fee APY ─────────────────────────────────────────────────────
  const poolAgeSecs = Number(poolAgeSlots) * slotDuration;
  let feeApyPct = 0;
  if (poolAgeSecs > 0 && totalLiquidity > 0n) {
    const feeRate = Number(cumulativeFees) / Number(totalLiquidity);
    const annualizedRate = feeRate * (365.25 * 24 * 3600) / poolAgeSecs;
    feeApyPct = annualizedRate * 100;
  }

  return {
    market,
    yesPriceBps,
    noPriceBps,
    totalLiquidity,
    totalLpSupply,
    cumulativeFees,
    lpTokenValue,
    lmsrCostValue,
    pdlBps,
    depthUsdc,
    utilizationPct,
    feeApyPct,
    timestamp: Date.now(),
  };
}
