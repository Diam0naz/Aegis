use anchor_lang::prelude::*;
use crate::{
    error::AegisError,
    state::{Market, MarketStatus, OracleConfig, OracleVote},
};

#[derive(Accounts)]
pub struct SubmitOracleVote<'info> {
    /// Must be a whitelisted oracle for this market
    #[account(mut)]
    pub oracle: Signer<'info>,

    #[account(
        seeds = [
            b"market",
            market.authority.as_ref(),
            market.question_hash.as_ref(),
        ],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        seeds = [b"oracle_config", market.key().as_ref()],
        bump = oracle_config.bump,
    )]
    pub oracle_config: Account<'info, OracleConfig>,

    /// One vote PDA per oracle — prevents double voting
    #[account(
        init,
        payer = oracle,
        space = OracleVote::LEN,
        seeds = [
            b"oracle_vote",
            market.key().as_ref(),
            oracle.key().as_ref(),
        ],
        bump,
    )]
    pub oracle_vote: Account<'info, OracleVote>,

    pub system_program: Program<'info, System>,
}

pub fn submit_oracle_vote(
    ctx: Context<SubmitOracleVote>,
    outcome: bool,
) -> Result<()> {
    let market        = &ctx.accounts.market;
    let oracle_config = &ctx.accounts.oracle_config;
    let clock         = Clock::get()?;

    // Market must be past resolution slot
    require!(
        clock.slot >= market.resolution_slot,
        AegisError::ResolutionSlotNotReached
    );
    require!(
        market.status != MarketStatus::Resolved,
        AegisError::AlreadyResolved
    );

    // Verify the signer is a whitelisted oracle
    let is_whitelisted = oracle_config.oracles[..oracle_config.oracle_count as usize]
        .iter()
        .any(|o| o == &ctx.accounts.oracle.key());

    require!(is_whitelisted, AegisError::Unauthorized);

    let vote = &mut ctx.accounts.oracle_vote;
    vote.market    = market.key();
    vote.authority = ctx.accounts.oracle.key();
    vote.outcome   = outcome;
    vote.voted_at  = clock.slot;
    vote.bump      = ctx.bumps.oracle_vote;

    msg!("Oracle vote submitted: oracle={} outcome={}", vote.authority, outcome);

    Ok(())
}