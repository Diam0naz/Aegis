use crate::{
    error::AegisError,
    state::{Market, MarketStatus, ResolutionProposal},
};
use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

// Minimum number of Pyth TWAP samples required before resolution
// Prevents flash manipulation at a single moment
pub const MIN_TWAP_SLOTS: u64 = 75; // ~30 seconds of price data
pub const MAX_PRICE_AGE_SECS: u64 = 60; // reject stale feeds older than 60s

#[derive(Accounts)]
pub struct CheckPriceResolution<'info> {
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

    /// Pyth price feed account — must match market.price_feed
    /// PriceUpdateV2 is Pyth's on-chain account type
    #[account(
        constraint = price_feed.key() == market.price_feed @ AegisError::InvalidPriceFeed
    )]
    pub price_feed: Account<'info, PriceUpdateV2>,

    #[account(
        init,
        payer = caller,
        space = ResolutionProposal::LEN,
        seeds = [b"resolution", market.key().as_ref()],
        bump,
    )]
    pub proposal: Account<'info, ResolutionProposal>,

    pub system_program: Program<'info, System>,
}

pub fn check_price_resolution(ctx: Context<CheckPriceResolution>, bond_amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    // Market must be past resolution slot
    require!(
        clock.slot >= market.resolution_slot,
        AegisError::ResolutionSlotNotReached
    );
    require!(
        market.status != MarketStatus::Resolved,
        AegisError::AlreadyResolved
    );

    // This market must be a price market (has a price feed)
    require!(
        market.price_feed != Pubkey::default(),
        AegisError::NotAPriceMarket
    );

    // Get price from Pyth — this validates feed freshness automatically
    // get_price_no_older_than rejects feeds older than MAX_PRICE_AGE_SECS
    // The feed_id is stored in market.price_feed as a Pubkey; cast its bytes as the 32-byte feed id.
    let feed_id: [u8; 32] = market.price_feed.to_bytes();
    let price_data = ctx
        .accounts
        .price_feed
        .get_price_no_older_than(&clock, MAX_PRICE_AGE_SECS, &feed_id)
        .map_err(|_| AegisError::StalePriceFeed)?;

    // Reject if confidence interval is too wide — indicates unstable/manipulated feed
    // Confidence > 1% of price = suspicious
    let confidence_bps = (price_data.conf as u128)
        .checked_mul(10_000)
        .ok_or(AegisError::Overflow)?
        .checked_div(price_data.price.unsigned_abs() as u128)
        .ok_or(AegisError::DivisionByZero)? as u64;

    require!(
        confidence_bps <= 100, // max 1% confidence interval
        AegisError::PriceFeedUnreliable
    );

    // Compare current price against strike
    // Both are in the same exponent space from Pyth
    let current_price = price_data.price;
    let strike = market.strike_price;

    let yes_wins = if market.price_above_strike_resolves_yes {
        current_price >= strike
    } else {
        current_price < strike
    };

    msg!(
        "Price resolution: current={} strike={} yes_wins={}",
        current_price,
        strike,
        yes_wins
    );

    // Write the proposal — auto-proposed by the oracle, no manual bond needed
    // The bond comes from the caller (could be your Oracle Agent)
    let proposal = &mut ctx.accounts.proposal;
    proposal.market = market.key();
    proposal.proposer = ctx.accounts.caller.key();
    proposal.proposed_outcome = yes_wins;
    proposal.bond_amount = bond_amount;
    proposal.proposed_at_slot = clock.slot;
    proposal.challenge_window = 5; // localnet: 5 slots
    proposal.is_disputed = false;
    proposal.is_finalized = false;
    proposal.bump = ctx.bumps.proposal;

    Ok(())
}
