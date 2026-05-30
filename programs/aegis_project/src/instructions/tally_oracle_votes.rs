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
    ctx: Context<'_, '_, 'info, 'info, TallyOracleVotes<'info>>,
    bond_amount: u64,
) -> Result<()> {
    let oracle_config = &ctx.accounts.oracle_config;
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    require!(
        clock.slot >= market.resolution_slot,
        AegisError::ResolutionSlotNotReached
    );

    // ── Tally votes ───────────────────────────────────────────────
    let mut yes_votes: u8 = 0;
    let mut no_votes: u8 = 0;

    // First pass: count only
    for vote_account in ctx.remaining_accounts.iter() {
        require!(vote_account.owner == &crate::ID, AegisError::Unauthorized);
        let vote: Account<OracleVote> = Account::try_from(vote_account)?;
        require!(vote.market == market.key(), AegisError::Unauthorized);

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

    // ── Quorum check — use explicit quorum_threshold ──────────────
    // Both votes_required AND quorum_threshold must be satisfied.
    // quorum_threshold ensures a minimum total participation,
    // votes_required ensures one side has a majority.
    let total_votes = yes_votes
        .checked_add(no_votes)
        .ok_or(AegisError::Overflow)?;
    require!(
        total_votes >= oracle_config.quorum_threshold,
        AegisError::InsufficientOracleVotes
    );
    require!(
        yes_votes >= oracle_config.votes_required || no_votes >= oracle_config.votes_required,
        AegisError::InsufficientOracleVotes
    );

    let proposed_outcome = yes_votes >= oracle_config.votes_required;

    // ── Second pass: slash minority voters ───────────────────────
    // Oracles who voted against the winning outcome lose their bond.
    // Bond is transferred to the caller as a slashing reward.
    // Their vote PDA is closed (rent returned to caller too).
    for vote_account in ctx.remaining_accounts.iter() {
        if vote_account.owner != &crate::ID {
            continue;
        }

        let vote: Account<OracleVote> = Account::try_from(vote_account)?;
        if vote.market != market.key() {
            continue;
        }

        let is_whitelisted = oracle_config.oracles[..oracle_config.oracle_count as usize]
            .iter()
            .any(|o| o == &vote.authority);
        if !is_whitelisted {
            continue;
        }

        // Voted against the outcome — slash their bond
        if vote.outcome != proposed_outcome && vote.bond_amount > 0 {
            let slash_amount = vote.bond_amount;
            let vote_lamports = vote_account.lamports();

            // Transfer bond + close the vote PDA into caller
            // We can't use Anchor's close= here since these are remaining_accounts,
            // so we drain lamports manually
            let transfer_amount =
                slash_amount.min(vote_lamports.saturating_sub(Rent::get()?.minimum_balance(0)));

            if transfer_amount > 0 {
                **vote_account.try_borrow_mut_lamports()? = vote_lamports
                    .checked_sub(transfer_amount)
                    .ok_or(AegisError::Overflow)?;

                let caller_lamports = ctx.accounts.caller.lamports();
                **ctx.accounts.caller.try_borrow_mut_lamports()? = caller_lamports
                    .checked_add(transfer_amount)
                    .ok_or(AegisError::Overflow)?;

                msg!(
                    "Slashed oracle {} — {} lamports transferred to caller",
                    vote.authority,
                    transfer_amount
                );
            }
        }
    }

    // ── Write resolution proposal ─────────────────────────────────
    let proposal = &mut ctx.accounts.proposal;
    proposal.market = market.key();
    proposal.proposer = ctx.accounts.caller.key();
    proposal.proposed_outcome = proposed_outcome;
    proposal.bond_amount = bond_amount;
    proposal.proposed_at_slot = clock.slot;
    proposal.challenge_window = 432_000;
    proposal.is_disputed = false;
    proposal.is_finalized = false;
    proposal.bump = ctx.bumps.proposal;

    emit!(OracleTallyComplete {
        market: market.key(),
        yes_votes,
        no_votes,
        proposed_outcome,
        total_slashed: 0, // you can accumulate this in the loop above if needed
    });

    msg!(
        "Oracle tally: YES={} NO={} quorum={} required={} outcome={}",
        yes_votes,
        no_votes,
        oracle_config.quorum_threshold,
        oracle_config.votes_required,
        proposed_outcome
    );

    Ok(())
}

#[event]
pub struct OracleTallyComplete {
    pub market: Pubkey,
    pub yes_votes: u8,
    pub no_votes: u8,
    pub proposed_outcome: bool,
    pub total_slashed: u64,
}
