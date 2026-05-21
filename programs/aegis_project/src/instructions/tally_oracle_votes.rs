use crate::{
    error::AegisError,
    state::{Market, OracleConfig, OracleVote, ResolutionProposal},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct TallyOracleVotes<'info> {
    #[account(mut)]
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
    pub market: Account<'info, Market>,

    #[account(
        seeds = [b"oracle_config", market.key().as_ref()],
        bump = oracle_config.bump,
    )]
    pub oracle_config: Account<'info, OracleConfig>,

    #[account(
        init,
        payer = caller,
        space = ResolutionProposal::LEN,
        seeds = [b"resolution", market.key().as_ref()],
        bump,
    )]
    pub proposal: Account<'info, ResolutionProposal>,

    pub system_program: Program<'info, System>,
    // remaining_accounts = all OracleVote PDAs for this market
}

pub fn tally_oracle_votes<'info>(
    ctx: anchor_lang::context::Context<
        '_,
        '_,
        'info,
        'info,
        TallyOracleVotes<'info>,
    >,
    bond_amount: u64,
) -> Result<()> {
    let oracle_config = &ctx.accounts.oracle_config;
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    require!(
        clock.slot >= market.resolution_slot,
        AegisError::ResolutionSlotNotReached
    );

    // Tally votes from remaining_accounts (OracleVote PDAs)
    let mut yes_votes: u8 = 0;
    let mut no_votes: u8 = 0;

    for vote_account in ctx.remaining_accounts.iter() {
        // Verify owned by our program
        require!(vote_account.owner == &crate::ID, AegisError::Unauthorized);

        let vote: Account<OracleVote> = Account::try_from(vote_account)?;

        // Verify vote belongs to this market
        require!(vote.market == market.key(), AegisError::Unauthorized);

        // Verify the voter is a whitelisted oracle
        let is_whitelisted = oracle_config.oracles[..oracle_config.oracle_count as usize]
            .iter()
            .any(|o| o == &vote.authority);

        if !is_whitelisted {
            continue;
        }

        if vote.outcome {
            yes_votes += 1;
        } else {
            no_votes += 1;
        }
    }

    let required = oracle_config.votes_required;

    // Need required votes on the SAME side to trigger resolution
    // e.g. 3-of-5 YES or 3-of-5 NO
    require!(
        yes_votes >= required || no_votes >= required,
        AegisError::InsufficientOracleVotes
    );

    let proposed_outcome = yes_votes >= required;

    // Create resolution proposal — same challenge window as manual proposals
    let proposal: &mut Account<'info, ResolutionProposal> = &mut ctx.accounts.proposal;
    proposal.market = market.key();
    proposal.proposer = ctx.accounts.caller.key();
    proposal.proposed_outcome = proposed_outcome;
    proposal.bond_amount = bond_amount;
    proposal.proposed_at_slot = clock.slot;
    proposal.challenge_window = 432_000;
    proposal.is_disputed = false;
    proposal.is_finalized = false;
    proposal.bump = ctx.bumps.proposal;

    msg!(
        "Oracle tally: YES={} NO={} required={} outcome={}",
        yes_votes,
        no_votes,
        required,
        proposed_outcome
    );

    Ok(())
}
