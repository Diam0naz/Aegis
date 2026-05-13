use crate::{
    error::AegisError,
    state::{Market, MarketStatus, Outcome},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked},
};

#[derive(Accounts)]
pub struct RedeemWinnings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [
            b"market",
            market.authority.as_ref(),
            market.question_hash.as_ref(),
        ],
        bump = market.bump,
        constraint = market.status == MarketStatus::Resolved @ AegisError::MarketNotResolved,
    )]
    pub market: Box<Account<'info, Market>>,

    /// The winning outcome token mint
    /// Verified against market.winning_outcome in handler
    #[account(mut)]
    pub winning_mint: Box<InterfaceAccount<'info, Mint>>,

    /// User's winning token account — burned here
    #[account(
        mut,
        associated_token::mint = winning_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_winning_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Market USDC vault — pays out winners
    #[account(
        mut,
        constraint = collateral_vault.key() == market.collateral_vault @ AegisError::Unauthorized,
    )]
    pub collateral_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// User's USDC account — receives payout
    #[account(
        mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_collateral_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn redeem_winnings(ctx: Context<RedeemWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;

    // ── Verify winning mint matches resolved outcome ───────────────
    // This is the critical check — only the winning token redeems
    let winning_outcome = market
        .winning_outcome
        .as_ref()
        .ok_or(AegisError::MarketNotResolved)?;

    let expected_mint = match winning_outcome {
        Outcome::Yes => market.yes_mint,
        Outcome::No => market.no_mint,
    };

    require!(
        ctx.accounts.winning_mint.key() == expected_mint,
        AegisError::Unauthorized
    );

    // ── Check user has winning tokens ─────────────────────────────
    let tokens_to_redeem = ctx.accounts.user_winning_account.amount;
    require!(tokens_to_redeem > 0, AegisError::NoWinningTokens);

    // Each winning token redeems for exactly 1 USDC (1_000_000 with 6 decimals)
    // tokens_to_redeem is in 6-decimal units — so it equals the USDC payout
    let usdc_payout = tokens_to_redeem;

    // ── CHECKS-EFFECTS-INTERACTIONS ───────────────────────────────
    // 1. BURN winning tokens first — eliminates reentrancy window
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.winning_mint.to_account_info(),
            from: ctx.accounts.user_winning_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token_interface::burn(burn_ctx, tokens_to_redeem)?;

    // 2. TRANSFER USDC from vault → user
    let authority_key = market.authority;
    let question_hash = market.question_hash;
    let bump = market.bump;

    let signer_seeds: &[&[&[u8]]] = &[&[
        b"market",
        authority_key.as_ref(),
        question_hash.as_ref(),
        &[bump],
    ]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.collateral_vault.to_account_info(),
            mint: ctx.accounts.collateral_mint.to_account_info(),
            to: ctx.accounts.user_collateral_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        },
        signer_seeds,
    );
    token_interface::transfer_checked(
        transfer_ctx,
        usdc_payout,
        ctx.accounts.collateral_mint.decimals,
    )?;

    emit!(WinningsRedeemed {
        market: market.key(),
        user: ctx.accounts.user.key(),
        tokens_burned: tokens_to_redeem,
        usdc_paid: usdc_payout,
        outcome: winning_outcome.clone(),
    });

    msg!(
        "Winnings redeemed: {} tokens → {} USDC",
        tokens_to_redeem,
        usdc_payout
    );

    Ok(())
}

#[event]
pub struct WinningsRedeemed {
    pub market: Pubkey,
    pub user: Pubkey,
    pub tokens_burned: u64,
    pub usdc_paid: u64,
    pub outcome: Outcome,
}
