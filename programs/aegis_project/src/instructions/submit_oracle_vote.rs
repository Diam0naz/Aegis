use crate::{
    error::AegisError,
    state::{Market, MarketStatus, OracleConfig, OracleVote},
};
use anchor_lang::prelude::*;

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
    bond_amount: u64, // ← new parameter
) -> Result<()> {
    let market = &ctx.accounts.market;
    let oracle_config = &ctx.accounts.oracle_config;
    let clock = Clock::get()?;

    require!(
        clock.slot >= market.resolution_slot,
        AegisError::ResolutionSlotNotReached
    );
    require!(
        market.status != MarketStatus::Resolved,
        AegisError::AlreadyResolved
    );

    // ── Whitelist check ───────────────────────────────────────────
    let is_whitelisted = oracle_config.oracles[..oracle_config.oracle_count as usize]
        .iter()
        .any(|o| o == &ctx.accounts.oracle.key());
    require!(is_whitelisted, AegisError::OracleNotWhitelisted);

    // ── Bond check ────────────────────────────────────────────────
    require!(
        bond_amount >= oracle_config.min_oracle_bond,
        AegisError::OracleBondTooLow
    );

    // Transfer bond from oracle → oracle_vote PDA
    // The PDA already exists (init above) — we add lamports on top of rent
    if bond_amount > 0 {
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.oracle.key(),
            &ctx.accounts.oracle_vote.key(),
            bond_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.oracle.to_account_info(),
                ctx.accounts.oracle_vote.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    // ── Write vote ────────────────────────────────────────────────
    let vote = &mut ctx.accounts.oracle_vote;
    vote.market = market.key();
    vote.authority = ctx.accounts.oracle.key();
    vote.outcome = outcome;
    vote.voted_at = clock.slot;
    vote.bond_amount = bond_amount; // ← new
    vote.bump = ctx.bumps.oracle_vote;

    emit!(OracleVoteSubmitted {
        market: market.key(),
        oracle: ctx.accounts.oracle.key(),
        outcome,
        bond_amount,
    });

    msg!(
        "Oracle vote submitted: oracle={} outcome={} bond={}",
        vote.authority,
        outcome,
        bond_amount
    );

    Ok(())
}

#[event]
pub struct OracleVoteSubmitted {
    pub market: Pubkey,
    pub oracle: Pubkey,
    pub outcome: bool,
    pub bond_amount: u64,
}
