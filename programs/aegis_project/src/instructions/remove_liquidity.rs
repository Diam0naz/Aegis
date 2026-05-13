use crate::{
    error::AegisError,
    state::{LpPool, Market},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked},
};

pub const MIN_LP_LOCKUP_SLOTS: u64 = 216_000; // ~24 hours

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub lp: Signer<'info>,

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
        seeds = [b"lp_pool", market.key().as_ref()],
        bump = lp_pool.bump,
        constraint = lp_pool.market == market.key() @ AegisError::Unauthorized,
    )]
    pub lp_pool: Box<Account<'info, LpPool>>,

    /// LP token mint — program burns from here
    #[account(
        mut,
        seeds = [b"lp_mint", market.key().as_ref()],
        bump,
        constraint = lp_mint.key() == lp_pool.lp_mint @ AegisError::Unauthorized,
    )]
    pub lp_mint: Box<InterfaceAccount<'info, Mint>>,

    /// LP's LP token account — tokens burned from here
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = lp,
        associated_token::token_program = token_program,
    )]
    pub lp_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// LP's USDC account — receives withdrawal
    #[account(
        mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = lp,
        associated_token::token_program = token_program,
    )]
    pub lp_collateral_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Market USDC vault — source of withdrawal
    #[account(
        mut,
        constraint = collateral_vault.key() == market.collateral_vault @ AegisError::Unauthorized,
    )]
    pub collateral_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_tokens_to_burn: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    let lp_pool = &ctx.accounts.lp_pool;
    let clock = Clock::get()?;

    // ── Guards ────────────────────────────────────────────────────
    // Cannot withdraw mid-batch — prevents LPs dodging PDL
    require!(!market.batch_active, AegisError::CannotWithdrawDuringBatch);

    // Minimum lockup — prevents flash LP attacks
    require!(
        clock.slot
            >= lp_pool
                .last_settled_slot
                .checked_add(MIN_LP_LOCKUP_SLOTS)
                .ok_or(AegisError::Overflow)?,
        AegisError::LpLockupNotExpired
    );

    require!(lp_tokens_to_burn > 0, AegisError::InsufficientLpTokens);
    require!(
        lp_tokens_to_burn <= lp_pool.total_lp_supply,
        AegisError::InsufficientLpTokens
    );
    require!(
        ctx.accounts.lp_token_account.amount >= lp_tokens_to_burn,
        AegisError::InsufficientLpTokens
    );

    // ── Calculate USDC to return ──────────────────────────────────
    // usdc_out = lp_tokens * total_liquidity / total_lp_supply
    // This includes accrued fees proportionally
    let usdc_out = (lp_tokens_to_burn as u128)
        .checked_mul(lp_pool.total_liquidity as u128)
        .ok_or(AegisError::Overflow)?
        .checked_div(lp_pool.total_lp_supply as u128)
        .ok_or(AegisError::DivisionByZero)? as u64;

    require!(usdc_out > 0, AegisError::InsufficientLpTokens);

    // ── Burn LP tokens ────────────────────────────────────────────
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.lp_mint.to_account_info(),
            from: ctx.accounts.lp_token_account.to_account_info(),
            authority: ctx.accounts.lp.to_account_info(),
        },
    );
    token_interface::burn(burn_ctx, lp_tokens_to_burn)?;

    // ── Transfer USDC from vault → LP ─────────────────────────────
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
            to: ctx.accounts.lp_collateral_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        },
        signer_seeds,
    );
    token_interface::transfer_checked(
        transfer_ctx,
        usdc_out,
        ctx.accounts.collateral_mint.decimals,
    )?;

    // ── Update pool state ─────────────────────────────────────────
    let lp_pool = &mut ctx.accounts.lp_pool;
    lp_pool.total_liquidity = lp_pool
        .total_liquidity
        .checked_sub(usdc_out)
        .ok_or(AegisError::Overflow)?;
    lp_pool.total_lp_supply = lp_pool
        .total_lp_supply
        .checked_sub(lp_tokens_to_burn)
        .ok_or(AegisError::Overflow)?;

    emit!(LiquidityRemoved {
        market: ctx.accounts.market.key(),
        lp: ctx.accounts.lp.key(),
        lp_tokens_burned: lp_tokens_to_burn,
        usdc_returned: usdc_out,
        new_total_liquidity: lp_pool.total_liquidity,
    });

    msg!(
        "Liquidity removed: {} LP tokens → {} USDC",
        lp_tokens_to_burn,
        usdc_out
    );

    Ok(())
}

#[event]
pub struct LiquidityRemoved {
    pub market: Pubkey,
    pub lp: Pubkey,
    pub lp_tokens_burned: u64,
    pub usdc_returned: u64,
    pub new_total_liquidity: u64,
}
