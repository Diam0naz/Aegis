use anchor_lang::prelude::*;
use crate::{
    error::AegisError,
    state::{Market, MarketStatus, ResolutionProposal},
};

// ── Constants ─────────────────────────────────────────────────────────────
/// Default challenge window: ~2 days at 400ms/slot  (432,000 slots)
const DEFAULT_CHALLENGE_WINDOW: u64 = 432_000;

/// Minimum bond a proposer must post with the proposal (0.001 SOL)
const MIN_BOND_LAMPORTS: u64 = 1_000_000;

// ── Accounts ──────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ProposeResolution<'info> {
    /// The proposer submitting this resolution — pays rent for the PDA.
    /// Anyone may propose as long as they post the minimum bond.
    #[account(mut)]
    pub proposer: Signer<'info>,

    /// The market being resolved.
    /// Verified via PDA seeds — authority + question_hash must match.
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

    /// The shared resolution proposal PDA — one per market, created here.
    ///
    /// Seeds: ["resolution", market]
    ///
    /// 
    /// Using `init` means only the *first* valid proposer can open this
    /// account. Subsequent challengers use a separate challenge instruction.
    /// Anchor's `init` constraint will automatically reject a second call
    /// that targets the same PDA address (account already initialised).
    #[account(
        init,
        payer = proposer,
        space = ResolutionProposal::LEN,
        seeds = [b"resolution", market.key().as_ref()],
        bump,
    )]
    pub proposal: Box<Account<'info, ResolutionProposal>>,

    pub system_program: Program<'info, System>,
}

// ── Instruction ───────────────────────────────────────────────────────────

/// `propose_resolution`
///
/// Called by anyone willing to post a bond to propose the outcome of a
/// market that has passed its `resolution_slot`.
///
/// The bond is held in the proposal PDA's lamport balance and is forfeited
/// via a separate slash instruction if the outcome is successfully challenged.
///
/// # Parameters
/// * `proposed_outcome` – `true` = YES won, `false` = NO won.
/// * `bond_amount`      – Lamports the proposer is staking.
///                        Must be ≥ `MIN_BOND_LAMPORTS`.
///
/// # Guards
/// 1. Market has reached `resolution_slot`.
/// 2. Market is not already `Resolved`.
/// 3. `bond_amount` meets the minimum.
///
/// # On-chain state written
/// A new `ResolutionProposal` PDA is initialised at address:
///   `PDA(["resolution", market_pubkey])`
pub fn propose_resolution(
    ctx: Context<ProposeResolution>,
    proposed_outcome: bool,
    bond_amount: u64,
) -> Result<()> {
    let market = &ctx.accounts.market;
    let clock  = Clock::get()?;

    // ── Guard 1: resolution slot reached ──────────────────────────
    require!(
        clock.slot >= market.resolution_slot,
        AegisError::ResolutionSlotNotReached
    );

    // ── Guard 2: market not already resolved ──────────────────────
    require!(
        market.status != MarketStatus::Resolved,
        AegisError::AlreadyResolved
    );

    // ── Guard 3: bond meets minimum ───────────────────────────────
    require!(
        bond_amount >= MIN_BOND_LAMPORTS,
        AegisError::BondTooLow
    );

    // ── Transfer bond from proposer to proposal PDA ──────────────
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.proposer.key(),
        &ctx.accounts.proposal.key(),
        bond_amount,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_ix,
        &[
            ctx.accounts.proposer.to_account_info(),
            ctx.accounts.proposal.to_account_info(),
        ],
    )?;

    // ── Write proposal ────────────────────────────────────────────
    let proposer_key = ctx.accounts.proposer.key();
    let proposal     = &mut ctx.accounts.proposal;

    proposal.market           = market.key();
    proposal.proposer         = proposer_key;
    proposal.proposed_outcome = proposed_outcome;
    proposal.bond_amount      = bond_amount;
    proposal.proposed_at_slot = clock.slot;
    proposal.challenge_window = DEFAULT_CHALLENGE_WINDOW;
    proposal.is_disputed      = false;
    proposal.is_finalized     = false;
    proposal.bump             = ctx.bumps.proposal;

    emit!(ResolutionProposed {
        market:           market.key(),
        proposer:         proposer_key,
        proposed_outcome,
        bond_amount,
        proposed_at_slot: clock.slot,
        challenge_window: DEFAULT_CHALLENGE_WINDOW,
    });

    msg!(
        "Resolution proposed: market={} proposer={} outcome={} bond={}",
        market.key(),
        proposer_key,
        proposed_outcome,
        bond_amount,
    );

    Ok(())
}

// ── Event ─────────────────────────────────────────────────────────────────

#[event]
pub struct ResolutionProposed {
    pub market:           Pubkey,
    pub proposer:         Pubkey,
    pub proposed_outcome: bool,
    pub bond_amount:      u64,
    pub proposed_at_slot: u64,
    pub challenge_window: u64,
}
