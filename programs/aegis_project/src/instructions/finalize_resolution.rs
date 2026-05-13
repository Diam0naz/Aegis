use anchor_lang::prelude::*;
use crate::{
    error::AegisError,
    state::{Market, MarketStatus, Outcome, ResolutionProposal},
};

#[derive(Accounts)]
pub struct FinalizeResolution<'info> {
    /// Anyone can finalize after the challenge window — permissionless
    pub caller: Signer<'info>,

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

    #[account(
        mut,
        seeds = [b"resolution", market.key().as_ref()],
        bump = proposal.bump,
        constraint = proposal.market == market.key() @ AegisError::Unauthorized,
    )]
    pub proposal: Box<Account<'info, ResolutionProposal>>,
}

pub fn finalize_resolution(ctx: Context<FinalizeResolution>) -> Result<()> {
    let proposal = &ctx.accounts.proposal;
    let clock    = Clock::get()?;

    // ── Guards ────────────────────────────────────────────────────
    require!(!proposal.is_finalized,   AegisError::AlreadyResolved);
    require!(!proposal.is_disputed,    AegisError::ProposalDisputed);

    // Challenge window must have passed
    let challenge_end_slot = proposal.proposed_at_slot
        .checked_add(proposal.challenge_window)
        .ok_or(AegisError::Overflow)?;
    
    require!(
        clock.slot >= challenge_end_slot,
        AegisError::StillInChallengeWindow
    );

    // ── Finalize ──────────────────────────────────────────────────
    let winning_outcome = if proposal.proposed_outcome {
        Outcome::Yes
    } else {
        Outcome::No
    };

    let market = &mut ctx.accounts.market;
    market.status          = MarketStatus::Resolved;
    market.winning_outcome = Some(winning_outcome.clone());

    let proposal = &mut ctx.accounts.proposal;
    proposal.is_finalized = true;

    // Note: bond returned to proposer in a separate claim instruction
    // (keeps this instruction simple and avoids extra token accounts)

    emit!(ResolutionFinalized {
        market:          ctx.accounts.market.key(),
        winning_outcome,
        proposer:        proposal.proposer,
    });

    msg!(
        "Resolution finalized: outcome={:?}",
        ctx.accounts.market.winning_outcome
    );

    Ok(())
}

#[event]
pub struct ResolutionFinalized {
    pub market:          Pubkey,
    pub winning_outcome: Outcome,
    pub proposer:        Pubkey,
}