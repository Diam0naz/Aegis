use crate::{
    error::AegisError,
    state::{Market, MarketStatus},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PauseMarket<'info> {
    /// Only the market authority can pause
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"market",
            market.authority.as_ref(),
            market.question_hash.as_ref(),
        ],
        bump = market.bump,
        constraint = market.authority == authority.key() @ AegisError::Unauthorized,
    )]
    pub market: Box<Account<'info, Market>>,
}

pub fn pause_market(ctx: Context<PauseMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.status != MarketStatus::Resolved,
        AegisError::AlreadyResolved
    );
    require!(
        market.status != MarketStatus::Paused,
        AegisError::MarketAlreadyPaused
    );

    market.status = MarketStatus::Paused;

    emit!(MarketPaused {
        market: market.key(),
        paused_by: ctx.accounts.authority.key(),
    });

    msg!("Market paused: {}", market.key());
    Ok(())
}

pub fn unpause_market(ctx: Context<PauseMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.status == MarketStatus::Paused,
        AegisError::MarketNotPaused
    );

    market.status = MarketStatus::Active;

    emit!(MarketUnpaused {
        market: market.key(),
        unpaused_by: ctx.accounts.authority.key(),
    });

    msg!("Market unpaused: {}", market.key());
    Ok(())
}

#[event]
pub struct MarketPaused {
    pub market: Pubkey,
    pub paused_by: Pubkey,
}

#[event]
pub struct MarketUnpaused {
    pub market: Pubkey,
    pub unpaused_by: Pubkey,
}
