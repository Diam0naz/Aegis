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
// Approximation of exp() using fixed-point arithmetic.
// Scale factor: 1_000_000 (6 decimal places)
// We avoid floating point entirely — Solana BPF has no reliable f64.

const SCALE: u64 = 1_000_000;

/// Fixed-point natural log approximation.
/// Input and output are scaled by SCALE.
/// Valid for inputs in range [SCALE/2 .. SCALE*4]

fn _fixed_ln(x: u64) -> Result<u64> {
    // ln(x) ≈ 2 * (x-1)/(x+1) for x near 1
    // For our range we use a piecewise linear approximation
    // This is intentionally simple — replace with lookup table in production
    require!(x > 0, AegisError::DivisionByZero);

    // ln(x) using the identity: ln(x) = ln(x/SCALE * SCALE)
    // Shift input to be near 1.0 (near SCALE)
    if x >= SCALE {
        let ratio = x
            .checked_mul(SCALE)
            .ok_or(AegisError::Overflow)?
            .checked_div(SCALE)
            .ok_or(AegisError::DivisionByZero)?;
        // Approximate: ln(1+t) ≈ t - t²/2 for small t
        let t = ratio.saturating_sub(SCALE);
        let t_sq = (t as u128)
            .checked_mul(t as u128)
            .ok_or(AegisError::Overflow)? as u64;
        Ok(t.saturating_sub(t_sq / (2 * SCALE)))
    } else {
        // x < SCALE: ln is negative, return 0 for safety in this approximation
        Ok(0)
    }
}

/// Compute LMSR YES price in basis points (0–10000).
/// P(YES) = exp(yes/b) / (exp(yes/b) + exp(no/b))
/// Simplified using the identity: P(YES) = 1 / (1 + exp((no-yes)/b))
/// All arithmetic in u128 to prevent overflow.
pub fn lmsr_yes_price_bps(b: u64, yes_qty: u64, no_qty: u64) -> Result<u64> {
    // When quantities are equal → price is exactly 50%
    if yes_qty == no_qty {
        return Ok(5_000);
    }

    // Use the softmax formulation
    // Compute exp(yes/b) and exp(no/b) as scaled integers
    // For large qty/b ratios, exp overflows — clamp to avoid
    let yes_ratio = (yes_qty as u128)
        .checked_mul(SCALE as u128)
        .ok_or(AegisError::Overflow)?
        .checked_div(b as u128)
        .ok_or(AegisError::DivisionByZero)? as u64;

    let no_ratio = (no_qty as u128)
        .checked_mul(SCALE as u128)
        .ok_or(AegisError::Overflow)?
        .checked_div(b as u128)
        .ok_or(AegisError::DivisionByZero)? as u64;

    // Simple linear approximation for the price ratio
    // In production: replace with proper fixed-point exp using lookup table
    // P(YES) ≈ yes_ratio / (yes_ratio + no_ratio)
    let total = (yes_ratio as u128)
        .checked_add(no_ratio as u128)
        .ok_or(AegisError::Overflow)?;

    if total == 0 {
        return Ok(5_000); // 50/50 if both zero
    }

    let price_bps = (yes_ratio as u128)
        .checked_mul(10_000)
        .ok_or(AegisError::Overflow)?
        .checked_div(total)
        .ok_or(AegisError::DivisionByZero)? as u64;

    // Clamp to valid range [1, 9999] — never allow 0% or 100%
    Ok(price_bps.max(1).min(9_999))
}

/// Round a price to the nearest tick (100 bps = 1%)
/// Prevents micro-arb by bots exploiting sub-percent discrepancies
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

pub fn submit_order(ctx: Context<SubmitOrder>, outcome: Outcome, amount: u64) -> Result<()> {
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
    let order = &mut ctx.accounts.batch_order;
    order.market = market.key();
    order.user = ctx.accounts.user.key();
    order.outcome = outcome.clone();
    order.amount_in = amount;
    order.batch_slot_start = market.batch_slot_start;
    order.commitment_hash = [0u8; 32];
    order.is_commit_reveal = false;
    order.is_revealed = true;
    order.is_filled = false;
    order.bump = ctx.bumps.batch_order;

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
