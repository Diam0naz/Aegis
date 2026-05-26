use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use error::*;
pub use instructions::{
    add_liquidity, check_price_resolution, create_market, finalize_resolution, propose_resolution,
    redeem_winnings, remove_liquidity, settle_batch, submit_oracle_vote, submit_order,
    tally_oracle_votes, AddLiquidity, CheckPriceResolution, CreateMarket, FinalizeResolution,
    ProposeResolution, RedeemWinnings, RemoveLiquidity, SettleBatch, SubmitOracleVote, SubmitOrder,
    TallyOracleVotes, *,
};
pub use state::*;

declare_id!("E7gRicDGMsBxtLd93eYT9dJkHwnAQ1EfpmgBuoUFXDsw");

#[program]
pub mod aegis_project {
    use super::*;

    pub fn create_market(
        ctx: Context<CreateMarket>,
        question_hash: [u8; 32],
        b_param: u64,
        batch_window_slots: u64,
        resolution_slot: u64,
        fee_bps: u16,
        creator_fee_bps: u16,           // ← pass through
    ) -> Result<()> {
        instructions::create_market::create_market(
            ctx,
            question_hash,
            b_param,
            batch_window_slots,
            resolution_slot,
            fee_bps,
            creator_fee_bps, // ← pass through
        )
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, usdc_amount: u64) -> Result<()> {
        instructions::add_liquidity::add_liquidity(ctx, usdc_amount)
    }

    pub fn submit_order(
        ctx: Context<SubmitOrder>,
        outcome: crate::state::Outcome,
        amount: u64,
    ) -> Result<()> {
        crate::instructions::submit_order::submit_order(ctx, outcome, amount)
    }

    pub fn settle_batch<'info>(
        ctx: Context<'_, '_, 'info, 'info, SettleBatch<'info>>,
    ) -> Result<()> {
        crate::instructions::settle_batch::settle_batch(ctx)
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_token_amount: u64) -> Result<()> {
        crate::instructions::remove_liquidity::remove_liquidity(ctx, lp_token_amount)
    }

    pub fn propose_resolution(
        ctx: Context<ProposeResolution>,
        proposed_outcome: bool,
        bond_amount: u64,
    ) -> Result<()> {
        crate::instructions::propose_resolution::propose_resolution(
            ctx,
            proposed_outcome,
            bond_amount,
        )
    }

    pub fn redeem_winnings(ctx: Context<RedeemWinnings>) -> Result<()> {
        crate::instructions::redeem_winnings::redeem_winnings(ctx)
    }

    pub fn finalize_resolution(ctx: Context<FinalizeResolution>) -> Result<()> {
        crate::instructions::finalize_resolution::finalize_resolution(ctx)
    }

    pub fn check_price_resolution(
        ctx: Context<CheckPriceResolution>,
        bond_amount: u64,
    ) -> Result<()> {
        crate::instructions::check_price_resolution::check_price_resolution(ctx, bond_amount)
    }

    pub fn submit_oracle_vote(ctx: Context<SubmitOracleVote>, outcome: bool) -> Result<()> {
        crate::instructions::submit_oracle_vote::submit_oracle_vote(ctx, outcome)
    }

    pub fn tally_oracle_votes<'info>(
        ctx: Context<'_, '_, 'info, 'info, TallyOracleVotes<'info>>,
        bond_amount: u64,
    ) -> Result<()> {
        crate::instructions::tally_oracle_votes::tally_oracle_votes(ctx, bond_amount)
    }
}
