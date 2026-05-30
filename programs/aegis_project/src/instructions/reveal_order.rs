use anchor_lang::prelude::*;
use solana_program::hash::hashv;
use crate::{
    error::AegisError,
    state::{BatchOrder, Market, MarketStatus, Outcome},
};



#[derive(Accounts)]
pub struct RevealOrder<'info> {
    /// The user who submitted the original commit-reveal order
    pub user: Signer<'info>,

    #[account(
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
        seeds = [
            b"order",
            market.key().as_ref(),
            user.key().as_ref(),
        ],
        bump = batch_order.bump,
        constraint = batch_order.market == market.key() @ AegisError::Unauthorized,
        constraint = batch_order.user == user.key()   @ AegisError::Unauthorized,
    )]
    pub batch_order: Box<Account<'info, BatchOrder>>,
}

pub fn reveal_order(
    ctx: Context<RevealOrder>,
    outcome: Outcome,
    amount: u64,
    nonce: [u8; 32],
) -> Result<()> {
    let order = &ctx.accounts.batch_order;
    let market = &ctx.accounts.market;

    // ── Guard 1: market must still be active ─────────────────────
    require!(
        market.status == MarketStatus::Active,
        AegisError::MarketNotActive
    );

    // ── Guard 2: order must be a commit-reveal order ──────────────
    require!(order.is_commit_reveal, AegisError::NotACommitRevealOrder);

    // ── Guard 3: order must not already be revealed ───────────────
    require!(!order.is_revealed, AegisError::OrderAlreadyRevealed);

    // ── Guard 4: order must not be filled ────────────────────────
    require!(!order.is_filled, AegisError::OrderAlreadyFilled);

    // ── Guard 5: reveal must happen within the same batch window ──
    require!(
        order.batch_slot_start == market.batch_slot_start,
        AegisError::StaleOrder
    );

    // ── Guard 6: verify hash(outcome || amount || nonce) == commitment_hash
    let outcome_byte = [outcome.to_u8()];
    let amount_bytes = amount.to_le_bytes();
    let hash = hashv(&[
        outcome_byte.as_ref(),
        amount_bytes.as_ref(),
        nonce.as_ref(),
    ]);
    require!(
        hash.to_bytes() == order.commitment_hash,
        AegisError::InvalidReveal
    );

    // ── Write revealed data onto the order ────────────────────────
    let order = &mut ctx.accounts.batch_order;
    order.outcome    = outcome.clone();
    order.amount_in  = amount;
    order.is_revealed = true;

    emit!(OrderRevealed {
        market:           market.key(),
        user:             ctx.accounts.user.key(),
        outcome,
        amount,
        batch_slot_start: market.batch_slot_start,
    });

    msg!(
        "Order revealed: {:?} {} USDC",
        order.outcome,
        amount
    );

    Ok(())
}

#[event]
pub struct OrderRevealed {
    pub market:           Pubkey,
    pub user:             Pubkey,
    pub outcome:          Outcome,
    pub amount:           u64,
    pub batch_slot_start: u64,
}