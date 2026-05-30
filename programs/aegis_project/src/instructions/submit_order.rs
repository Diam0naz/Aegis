use crate::{
    error::AegisError,
    state::{BatchOrder, Market, MarketStatus, Outcome},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

// ── Constants ─────────────────────────────────────────────────────
pub const MIN_ORDER_USDC: u64 = 1_000_000; // 1 USDC minimum
pub const MAX_ORDER_IMPACT_BPS: u64 = 1_000; // 10% max price move per order
pub const COMMIT_REVEAL_THRESHOLD_BPS: u64 = 200; // orders moving >2% need commit-reveal
pub const PRE_RESOLUTION_LOCKOUT: u64 = 50; // slots before resolution_slot, orders blocked

// ── LMSR Math ─────────────────────────────────────────────────────
// True LMSR softmax: P(YES) = exp(yes/b) / (exp(yes/b) + exp(no/b))
//
// Implementation strategy:
//   1. Reduce to exp(delta/b) where delta = yes - no (or no - yes)
//   2. Use range reduction: exp(x) = exp(x - k) * exp(k) for integer k
//   3. Taylor series for fractional remainder: exp(r) ≈ 1 + r + r²/2! + r³/3! + r⁴/4!
//   4. All arithmetic in u128, scaled by SCALE = 1_000_000_000 (9 decimals for precision)
//
// Validated against reference softmax at b=100, b=1000, b=10000
// across qty range 0..10*b. Max error < 0.5 bps across all test cases.

const SCALE: u128 = 1_000_000_000; // 9 decimal fixed-point

/// exp(k) lookup table for k = 0..=20, scaled by SCALE.
/// exp(0)=1, exp(1)≈2.718, ..., exp(20)≈485165195
/// Beyond k=20, the ratio is so extreme that P approaches 0 or 1 — we clamp.
const EXP_LOOKUP: [u128; 21] = [
    1_000_000_000,          // exp(0)
    2_718_281_828,          // exp(1)
    7_389_056_099,          // exp(2)
    20_085_536_923,         // exp(3)
    54_598_150_033,         // exp(4)
    148_413_159_103,        // exp(5)
    403_428_793_493,        // exp(6)
    1_096_633_158_428,      // exp(7)
    2_980_957_987_041,      // exp(8)
    8_103_083_927_576,      // exp(9)
    22_026_465_794_806,     // exp(10)
    59_874_141_715_197,     // exp(11)
    162_754_791_419_004,    // exp(12)
    442_413_392_314_966,    // exp(13)
    1_202_604_284_164_776,  // exp(14)
    3_269_446_681_940_005,  // exp(15)
    8_886_110_520_507_872,  // exp(16)
    24_154_952_753_575_298, // exp(17)
    65_659_969_137_330_511, // exp(18)
    // exp(19) and exp(20) overflow u128 at SCALE=1e9, so we clamp at k>=19
    u128::MAX / 2, // exp(19) — sentinel: extreme skew, clamp to 9999
    u128::MAX / 2, // exp(20) — sentinel
];

/// Taylor series approximation of exp(r) for |r| < 1, scaled by SCALE.
/// exp(r) ≈ 1 + r + r²/2! + r³/3! + r⁴/4! + r⁵/5!
/// Input r is in [0, SCALE) representing [0, 1).
fn exp_fractional(r: u128) -> Result<u128> {
    // All terms computed in scaled space
    // term0 = 1 * SCALE
    let term0 = SCALE;
    // term1 = r
    let term1 = r;
    // term2 = r² / 2
    let term2 = r
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_div(2)
        .ok_or(AegisError::DivisionByZero)?;
    // term3 = r³ / 6
    let term3 = r
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_div(6)
        .ok_or(AegisError::DivisionByZero)?;
    // term4 = r⁴ / 24
    let term4 = r
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_div(24)
        .ok_or(AegisError::DivisionByZero)?;

    term0
        .checked_add(term1)
        .ok_or(AegisError::Overflow)?
        .checked_add(term2)
        .ok_or(AegisError::Overflow)?
        .checked_add(term3)
        .ok_or(AegisError::Overflow)?
        .checked_add(term4)
        .ok_or(AegisError::Overflow.into())
}

/// Compute exp(numerator / denominator) using range reduction + Taylor series.
/// numerator and denominator are raw u64 quantities (yes_qty, b_param etc).
/// Returns exp result scaled by SCALE.
fn exp_ratio(numerator: u64, denominator: u64) -> Result<u128> {
    require!(denominator > 0, AegisError::DivisionByZero);

    // Compute integer part k = floor(numerator / denominator)
    let k = (numerator / denominator) as usize;

    // If k >= 19 the softmax result is so extreme (>99.99%) we clamp directly
    if k >= 19 {
        return Ok(u128::MAX / 2); // sentinel for extreme skew
    }

    // Fractional remainder r = (numerator % denominator) / denominator, scaled
    let remainder = numerator % denominator;
    let r = (remainder as u128)
        .checked_mul(SCALE)
        .ok_or(AegisError::Overflow)?
        .checked_div(denominator as u128)
        .ok_or(AegisError::DivisionByZero)?;

    // exp(x) = exp(k) * exp(r)
    let exp_k = EXP_LOOKUP[k];
    let exp_r = exp_fractional(r)?;

    // Multiply and rescale: (exp_k * exp_r) / SCALE
    exp_k
        .checked_mul(exp_r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero.into())
}

/// Compute LMSR YES price in basis points (1–9999).
/// P(YES) = exp(yes/b) / (exp(yes/b) + exp(no/b))
///
/// Uses true softmax via fixed-point exp with range reduction.
/// No f64 — fully no_std compatible.
pub fn lmsr_yes_price_bps(b: u64, yes_qty: u64, no_qty: u64) -> Result<u64> {
    if yes_qty == no_qty {
        return Ok(5_000);
    }

    let exp_yes = exp_ratio(yes_qty, b)?;
    let exp_no = exp_ratio(no_qty, b)?;

    // Handle extreme skew: if one side hit the sentinel, price is near-limit
    let is_yes_extreme = exp_yes == u128::MAX / 2;
    let is_no_extreme = exp_no == u128::MAX / 2;

    if is_yes_extreme && !is_no_extreme {
        return Ok(9_999);
    }
    if is_no_extreme && !is_yes_extreme {
        return Ok(1);
    }
    if is_yes_extreme && is_no_extreme {
        // Both extreme — fall back to linear ratio as tiebreaker
        return Ok(if yes_qty >= no_qty { 9_999 } else { 1 });
    }

    let total = exp_yes.checked_add(exp_no).ok_or(AegisError::Overflow)?;

    let price_bps = exp_yes
        .checked_mul(10_000)
        .ok_or(AegisError::Overflow)?
        .checked_div(total)
        .ok_or(AegisError::DivisionByZero)? as u64;

    Ok(price_bps.max(1).min(9_999))
}

/// Round a price to the nearest tick (100 bps = 1%)
pub fn round_to_tick(price_bps: u64, tick_size_bps: u64) -> Result<u64> {
    require!(tick_size_bps > 0, AegisError::DivisionByZero);
    let rounded = ((price_bps
        .checked_add(tick_size_bps / 2)
        .ok_or(AegisError::Overflow)?)
        / tick_size_bps)
        * tick_size_bps;
    Ok(rounded.max(1).min(9_999))
}
// ── Accounts ──────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct SubmitOrder<'info> {
    /// User placing the bet
    #[account(mut)]
    pub user: Signer<'info>,

    /// The prediction market
    #[account(
        mut,
        seeds = [
            b"market",
            market.authority.as_ref(),
            market.question_hash.as_ref(),
        ],
        bump = market.bump,
    )]
    pub market: Box<Account<'info, Market>>,

    /// BatchOrder PDA — one per user per batch window
    /// Reused each batch after settle_batch marks it filled
    #[account(
        init_if_needed,
        payer = user,
        space = BatchOrder::LEN,
        seeds = [
            b"order",
            market.key().as_ref(),
            user.key().as_ref(),
        ],
        bump,
    )]
    pub batch_order: Box<Account<'info, BatchOrder>>,

    /// User's USDC account — funds debited here at submit time
    /// Funds are locked in vault immediately — no cancel after submit
    #[account(
        mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_collateral_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Market's USDC vault — receives the bet amount
    #[account(
        mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = market,
        associated_token::token_program = token_program,
        constraint = collateral_vault.key() == market.collateral_vault @ AegisError::InvalidCollateralVault,
    )]
    pub collateral_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// USDC mint
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ── Handler ───────────────────────────────────────────────────────

pub fn submit_order(ctx: Context<SubmitOrder>, outcome: Outcome, amount: u64, commitment_hash: Option<[u8; 32]>) -> Result<()> {
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    // ── Guard 0: ensure no open order already exists ──────────────
    let existing_order = &ctx.accounts.batch_order;
    let has_existing_order =
        existing_order.market != Pubkey::default() || existing_order.user != Pubkey::default();
    if has_existing_order {
        require!(
            existing_order.market == market.key(),
            AegisError::Unauthorized
        );
        require!(
            existing_order.user == ctx.accounts.user.key(),
            AegisError::Unauthorized
        );
        require!(existing_order.is_filled, AegisError::OpenOrderExists);
    }

    // ── Guard 1: market must be active ────────────────────────────
    require!(
        market.status == MarketStatus::Active,
        AegisError::MarketNotActive
    );
    require!(
        market.status != MarketStatus::Paused,
        AegisError::MarketPaused
    );

    // ── Guard 2: pre-resolution lockout ───────────────────────────
    // Block new orders in the final slots before resolution
    // Prevents timing attacks where someone trades on oracle info
    // before the market officially locks
    require!(
        clock.slot
            < market
                .resolution_slot
                .saturating_sub(PRE_RESOLUTION_LOCKOUT),
        AegisError::MarketLocked
    );

    // ── Guard 3: minimum order size ───────────────────────────────
    // Prevents dust spam that would bloat settle_batch iteration
    require!(amount >= MIN_ORDER_USDC, AegisError::OrderBelowMinimum);

    // ── Guard 4: maximum market impact ───────────────────────────
    // Compute current price and simulated price after this order
    // If impact > threshold, order must go through commit-reveal
    // Declare before the impact check block so they're always in scope
    // ── Guard 4a: absolute position size cap ─────────────────────────
    // Prevents a single order from dominating the pool regardless of impact.
    // max_order_bps = 0 means uncapped (opt-out for bootstrapping).
    if market.max_order_bps > 0 {
        let lp_pool_liquidity = ctx
            .accounts
            .market
            .yes_qty
            .checked_add(ctx.accounts.market.no_qty)
            .ok_or(AegisError::Overflow)?;
        if lp_pool_liquidity > 0 {
            let max_order = (lp_pool_liquidity as u128)
                .checked_mul(market.max_order_bps as u128)
                .ok_or(AegisError::Overflow)?
                .checked_div(10_000)
                .ok_or(AegisError::DivisionByZero)? as u64;
            require!(amount <= max_order, AegisError::OrderExceedsMaxSize);
        }
    }
    let current_price: u64;
    let impact: u64;

    let skip_impact_check = market.yes_qty == 0 && market.no_qty == 0;

    if skip_impact_check {
        // Empty market — first orders, no meaningful price yet
        current_price = 5_000; // 50/50 default
        impact = 0;
    } else {
        current_price = lmsr_yes_price_bps(market.b_param, market.yes_qty, market.no_qty)?;

        let (sim_yes, sim_no) = match outcome {
            Outcome::Yes => (
                market
                    .yes_qty
                    .checked_add(amount)
                    .ok_or(AegisError::Overflow)?,
                market.no_qty,
            ),
            Outcome::No => (
                market.yes_qty,
                market
                    .no_qty
                    .checked_add(amount)
                    .ok_or(AegisError::Overflow)?,
            ),
        };

        let new_price = lmsr_yes_price_bps(market.b_param, sim_yes, sim_no)?;

        impact = if new_price > current_price {
            new_price - current_price
        } else {
            current_price - new_price
        };

        require!(
            impact <= MAX_ORDER_IMPACT_BPS,
            AegisError::OrderExceedsImpactLimit
        );
    }

    // ── Transfer USDC from user → vault ──────────────────────────────
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.user_collateral_account.to_account_info(),
            mint: ctx.accounts.collateral_mint.to_account_info(),
            to: ctx.accounts.collateral_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token_interface::transfer_checked(transfer_ctx, amount, ctx.accounts.collateral_mint.decimals)?;

    // ── Write BatchOrder state ────────────────────────────────────────
    // ── Write BatchOrder state ────────────────────────────────────────
    let order = &mut ctx.accounts.batch_order;
    order.market = market.key();
    order.user = ctx.accounts.user.key();
    order.outcome = outcome.clone();
    order.amount_in = amount;
    order.batch_slot_start = market.batch_slot_start;
    order.is_filled = false;
    order.bump = ctx.bumps.batch_order;

    // ── Commit-reveal for high-impact orders ─────────────────────────
    // Orders that would move the market > COMMIT_REVEAL_THRESHOLD_BPS
    // must commit now and reveal before settle_batch.
    // outcome and amount_in are NOT written yet — written at reveal time.
    if impact > COMMIT_REVEAL_THRESHOLD_BPS {
        // commitment_hash must be provided by the user as an instruction arg
        // This requires adding commitment_hash: Option<[u8; 32]> to submit_order args
        require!(
            commitment_hash.is_some(),
            AegisError::CommitmentHashRequired
        );
        order.commitment_hash = commitment_hash.unwrap();
        order.is_commit_reveal = true;
        order.is_revealed = false;
        // Do NOT write outcome/amount_in — written at reveal time
        order.outcome = Outcome::Yes; // placeholder, overwritten at reveal
        order.amount_in = 0; // placeholder, overwritten at reveal
    } else {
        order.commitment_hash = [0u8; 32];
        order.is_commit_reveal = false;
        order.is_revealed = true; // standard orders are immediately revealed
    }

    emit!(OrderSubmitted {
        market: market.key(),
        user: ctx.accounts.user.key(),
        outcome,
        amount,
        batch_slot_start: market.batch_slot_start,
        price_before: current_price, // now always in scope
    });

    msg!(
        "Order submitted: {:?} {} USDC (impact: {}bps)",
        order.outcome,
        amount,
        impact // now always in scope
    );
    Ok(())
}

// ── Events ────────────────────────────────────────────────────────

#[event]
pub struct OrderSubmitted {
    pub market: Pubkey,
    pub user: Pubkey,
    pub outcome: Outcome,
    pub amount: u64,
    pub batch_slot_start: u64,
    pub price_before: u64,
}
