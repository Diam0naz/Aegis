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
const SCALE = 1000000000n; // 9-decimal fixed-point, same as on-chain
// exp(k) lookup table — identical to the on-chain EXP_LOOKUP
const EXP_LOOKUP = [
    1000000000n, // exp(0)
    2718281828n, // exp(1)
    7389056099n, // exp(2)
    20085536923n, // exp(3)
    54598150033n, // exp(4)
    148413159103n, // exp(5)
    403428793493n, // exp(6)
    1096633158428n, // exp(7)
    2980957987041n, // exp(8)
    8103083927576n, // exp(9)
    22026465794806n, // exp(10)
    59874141715197n, // exp(11)
    162754791419004n, // exp(12)
    442413392314966n, // exp(13)
    1202604284164776n, // exp(14)
    3269446681940005n, // exp(15)
    8886110520507872n, // exp(16)
    24154952753575298n, // exp(17)
    65659969137330511n, // exp(18)
];
const SENTINEL = BigInt("85070591730234615865843651857942052863"); // u128::MAX / 2 sentinel
/**
 * Taylor series exp(r) for r in [0, SCALE) — mirrors on-chain exp_fractional
 */
function expFractional(r) {
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
function expRatio(numerator, denominator) {
    if (denominator === 0n)
        throw new Error("Division by zero in expRatio");
    const k = Number(numerator / denominator);
    if (k >= 19)
        return SENTINEL;
    const remainder = numerator % denominator;
    const r = (remainder * SCALE) / denominator;
    const expK = EXP_LOOKUP[k];
    const expR = expFractional(r);
    return (expK * expR) / SCALE;
}
/**
 * LMSR YES price in basis points (1-9999).
 * Exact mirror of on-chain lmsr_yes_price_bps.
 */
export function lmsrYesPriceBps(bParam, yesQty, noQty) {
    if (yesQty === noQty)
        return 5000;
    const expYes = expRatio(yesQty, bParam);
    const expNo = expRatio(noQty, bParam);
    const isYesExtreme = expYes === SENTINEL;
    const isNoExtreme = expNo === SENTINEL;
    if (isYesExtreme && !isNoExtreme)
        return 9999;
    if (isNoExtreme && !isYesExtreme)
        return 1;
    if (isYesExtreme && isNoExtreme)
        return yesQty >= noQty ? 9999 : 1;
    const total = expYes + expNo;
    const priceBps = Number((expYes * 10000n) / total);
    return Math.max(1, Math.min(9999, priceBps));
}
/**
 * Compute the LMSR cost function: C(q) = b * ln(exp(q_yes/b) + exp(q_no/b))
 * Returns value in the same units as the quantities (USDC micro-units).
 *
 * We approximate ln(x) using the identity: ln(x) = ln(x * SCALE / SCALE)
 * For practical purposes, we compute the ratio approach.
 */
export function lmsrCost(bParam, yesQty, noQty) {
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
    while (k < 18 && threshold * EXP_LOOKUP[k + 1] / SCALE <= sumExp) {
        k++;
    }
    const expK = EXP_LOOKUP[k];
    // Normalized value: sumExp / (SCALE * exp(k)) = sumExp / (expK * SCALE / SCALE) = sumExp / expK
    // This should be in [1, e) represented as [SCALE, e*SCALE)
    const normalized = (sumExp * SCALE) / expK;
    // ln(normalized/SCALE) using Taylor series for ln(1+x) where x = normalized/SCALE - 1
    // x is in [0, e-1) ≈ [0, 1.718)
    const x = normalized - SCALE;
    // For better convergence, we use the identity ln(1+x) = 2*arctanh(x/(x+2))
    // But simpler: ln(1+x) ≈ x - x²/2 + x³/3 - x⁴/4 (converges for |x| < 1)
    // For x > 1, we halve: ln(1+x) = ln(sqrt(1+x))² = 2*ln(sqrt(1+x))
    let lnFrac;
    if (x < SCALE) {
        // |x| < 1 — Taylor converges well
        const x2 = (x * x) / SCALE;
        const x3 = (x2 * x) / SCALE;
        const x4 = (x3 * x) / SCALE;
        lnFrac = x - x2 / 2n + x3 / 3n - x4 / 4n;
    }
    else {
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
/**
 * Compute the full set of LP metrics for a single pool.
 * This is the core calculation that feeds into all LP alerts and the PDL accuracy KPI.
 */
export function computePoolMetrics(market, bParam, yesQty, noQty, totalLiquidity, totalLpSupply, cumulativeFees, 
/** Slot duration in seconds (Solana: ~0.4s) */
slotDuration, 
/** Slots since the pool was created */
poolAgeSlots) {
    // ── Prices ──────────────────────────────────────────────────────
    const yesPriceBps = lmsrYesPriceBps(bParam, yesQty, noQty);
    const noPriceBps = 10_000 - yesPriceBps;
    // ── LP token value ──────────────────────────────────────────────
    const lpTokenValue = totalLpSupply > 0n
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
    const initialCost = (bParam * 693147180n) / SCALE; // b * ln(2), scaled
    const ilRaw = lmsrCostValue > initialCost
        ? lmsrCostValue - initialCost
        : 0n;
    // PDL in bps = ((fees - IL) / liquidity) * 10000
    const netPnl = BigInt(Number(cumulativeFees)) - ilRaw;
    const pdlBps = totalLiquidity > 0n
        ? Number((netPnl * 10000n) / totalLiquidity)
        : 0;
    // ── Pool depth ──────────────────────────────────────────────────
    // How much USDC to move the price by 1% (100 bps)
    // depth ≈ b_param * 100 (rough approximation for LMSR)
    const depthUsdc = bParam * 100n;
    // ── Utilization ─────────────────────────────────────────────────
    const totalShares = yesQty + noQty;
    const utilizationPct = totalLiquidity > 0n
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
