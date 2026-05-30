use anchor_lang::prelude::*;

use crate::error::AegisError;
use crate::state::{Market, MarketStatus};

use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

// ── Constants ─────────────────────────────────────────────────────
pub const MIN_B_PARAM: u64 = 100;
pub const MAX_B_PARAM: u64 = 10_000;
pub const MAX_FEE_BPS: u16 = 1_000; // 10% hard cap
pub const MIN_BATCH_WINDOW: u64 = 1;
pub const MAX_BATCH_WINDOW: u64 = 150; // ~60 seconds max
pub const PRE_RESOLUTION_SLOTS: u64 = 50; // lockout window before resolution

// ── Account Validation ────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(question_hash: [u8; 32], b_param: u64)]
pub struct CreateMarket<'info> {
    /// Market creator — pays for account rent, becomes authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Market PDA — derived from authority + question_hash
    /// This means the same creator cannot open two identical markets
    #[account(
        init,
        payer = authority,
        space = Market::LEN,
        seeds = [
            b"market",
            authority.key().as_ref(),
            question_hash.as_ref(),
        ],
        bump,
    )]
    pub market: Box<Account<'info, Market>>,

    /// The USDC mint (or any SPL token used as collateral)
    /// InterfaceAccount supports both Token and Token-2022
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    /// YES outcome token mint
    /// init_if_needed + seeds makes this a deterministic PDA mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,       // program controls minting
        mint::freeze_authority = market,
        seeds = [b"yes_mint", market.key().as_ref()],
        bump,
    )]
    pub yes_mint: Box<InterfaceAccount<'info, Mint>>,

    /// NO outcome token mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = market,
        mint::freeze_authority = market,
        seeds = [b"no_mint", market.key().as_ref()],
        bump,
    )]
    pub no_mint: Box<InterfaceAccount<'info, Mint>>,

    /// USDC vault — holds all collateral for this market
    /// ATA owned by the market PDA — only the program can move funds
    #[account(
        init,
        payer = authority,
        associated_token::mint = collateral_mint,
        associated_token::authority = market,
        associated_token::token_program = token_program,
    )]
    pub collateral_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Authority's USDC token account — receives creator fees
    #[account(mut)]
    pub creator_fee_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ── Instruction Handler ───────────────────────────────────────────

pub fn create_market(
    ctx: Context<CreateMarket>,
    question_hash: [u8; 32], // SHA-256 of the market question
    b_param: u64,            // LMSR liquidity parameter
    batch_window_slots: u64, // slots per batch (e.g. 8)
    resolution_slot: u64,    // slot at which market locks
    fee_bps: u16,            // total fee in basis points
    creator_fee_bps: u16,    // ← new
) -> Result<()> {
    let clock = Clock::get()?;

    // ── Validate inputs ───────────────────────────────────────────
    // creator_fee_bps cannot exceed total fee
    require!(creator_fee_bps <= fee_bps, AegisError::InvalidFeeBps);
    require!(
        b_param >= MIN_B_PARAM && b_param <= MAX_B_PARAM,
        AegisError::InvalidBParam
    );
    require!(fee_bps <= MAX_FEE_BPS, AegisError::InvalidFeeBps);
    require!(
        batch_window_slots >= MIN_BATCH_WINDOW && batch_window_slots <= MAX_BATCH_WINDOW,
        AegisError::InvalidBatchWindow
    );
    // Resolution must be in the future with room for at least one batch
    require!(
        resolution_slot > clock.slot + batch_window_slots,
        AegisError::InvalidResolutionSlot
    );

    // ── Populate Market state ─────────────────────────────────────
    let market: &mut Account<'_, Market> = &mut ctx.accounts.market;

    market.authority = ctx.accounts.authority.key();
    market.question_hash = question_hash;
    market.b_param = b_param;
    market.yes_qty = 0;
    market.no_qty = 0;
    market.batch_slot_start = clock.slot;
    market.batch_window_slots = batch_window_slots;
    market.batch_active = false;
    market.fee_bps = fee_bps;
    market.yes_mint = ctx.accounts.yes_mint.key();
    market.no_mint = ctx.accounts.no_mint.key();
    market.collateral_vault = ctx.accounts.collateral_vault.key();
    market.resolution_slot = resolution_slot;
    market.status = MarketStatus::Active;
    market.winning_outcome = None;
    market.bump = ctx.bumps.market;
    market.total_fees_collected = 0;
    market.creator_fee_vault = ctx.accounts.creator_fee_vault.key();
    market.creator_fee_bps = creator_fee_bps;

    // ── Emit event for off-chain indexing ─────────────────────────
    // Your frontend/indexer listens for this to know a market was created
    emit!(MarketCreated {
        market: market.key(),
        authority: market.authority,
        question_hash: market.question_hash,
        b_param: market.b_param,
        resolution_slot: market.resolution_slot,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Market created: b={} fee={}bps resolution_slot={}",
        b_param,
        fee_bps,
        resolution_slot
    );

    Ok(())
}

// ── Events ────────────────────────────────────────────────────────
// Emitted on-chain, picked up by Anchor's event listener on the frontend

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub authority: Pubkey,
    pub question_hash: [u8; 32],
    pub b_param: u64,
    pub resolution_slot: u64,
    pub timestamp: i64,
}
