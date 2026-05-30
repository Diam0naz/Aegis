use crate::{
    error::AegisError,
    state::{LpPool, Market, MarketStatus},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

// ── Constants ─────────────────────────────────────────────────────
pub const MIN_LIQUIDITY: u64 = 1_000_000; // 1 USDC minimum deposit (6 decimals)

// ── Accounts ──────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    /// LP depositing liquidity
    #[account(mut)]
    pub lp: Signer<'info>,

    /// Market this liquidity is for
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

    /// LP pool PDA — created on first deposit
    #[account(
        init_if_needed,
        payer = lp,
        space = LpPool::LEN,
        seeds = [b"lp_pool", market.key().as_ref()],
        bump,
    )]
    pub lp_pool: Box<Account<'info, LpPool>>,

    /// LP token mint — program is mint authority
    #[account(
        init_if_needed,
        payer = lp,
        mint::decimals = 6,
        mint::authority = market,
        seeds = [b"lp_mint", market.key().as_ref()],
        bump,
    )]
    pub lp_mint: Box<InterfaceAccount<'info, Mint>>,

    /// LP's USDC account — source of deposit
    #[account(
        mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = lp,
        associated_token::token_program = token_program,
    )]
    pub lp_collateral_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Market's USDC vault — destination of deposit
    #[account(
        mut,
        associated_token::mint = collateral_mint,
        associated_token::authority = market,
        associated_token::token_program = token_program,
        constraint = collateral_vault.key() == market.collateral_vault @ AegisError::InvalidCollateralVault,
    )]
    pub collateral_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// LP's token account for LP receipt tokens
    #[account(
        init_if_needed,
        payer = lp,
        associated_token::mint = lp_mint,
        associated_token::authority = lp,
        associated_token::token_program = token_program,
    )]
    pub lp_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The collateral mint (USDC)
    pub collateral_mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ── Handler ───────────────────────────────────────────────────────

pub fn add_liquidity(ctx: Context<AddLiquidity>, usdc_amount: u64) -> Result<()> {
    // ── Validate ──────────────────────────────────────────────────
    require!(
        ctx.accounts.market.status == MarketStatus::Active,
        AegisError::MarketNotActive
    );
    require!(
        ctx.accounts.market.status != MarketStatus::Paused,
        AegisError::MarketPaused
    );
    require!(usdc_amount >= MIN_LIQUIDITY, AegisError::OrderBelowMinimum);

    // ── Calculate LP tokens to mint ───────────────────────────────
    // First depositor gets 1:1 — 1 USDC = 1 LP token
    // Subsequent depositors get a proportional share:
    //   lp_tokens = usdc_amount * total_lp_supply / total_liquidity
    //
    // This preserves the LP token price regardless of when you deposit.
    // If the pool doubled in value (fees accrued), late depositors
    // get fewer LP tokens but each is worth more — same economics.

    let lp_pool: &Box<Account<'_, LpPool>> = &ctx.accounts.lp_pool;
    if lp_pool.total_lp_supply > 0 {
        require!(
            lp_pool.market == ctx.accounts.market.key(),
            AegisError::Unauthorized
        );
        require!(
            lp_pool.lp_mint == ctx.accounts.lp_mint.key(),
            AegisError::Unauthorized
        );
    }

    let lp_tokens_to_mint: u64 = if lp_pool.total_lp_supply == 0 {
        // Bootstrap: first depositor, 1:1 ratio
        usdc_amount
    } else {
        // Pro-rata share of existing pool
        // Use u128 for intermediate multiplication to avoid overflow
        (usdc_amount as u128)
            .checked_mul(lp_pool.total_lp_supply as u128)
            .ok_or(AegisError::Overflow)?
            .checked_div(lp_pool.total_liquidity as u128)
            .ok_or(AegisError::DivisionByZero)? as u64
    };

    require!(lp_tokens_to_mint > 0, AegisError::OrderBelowMinimum);

    // ── Transfer USDC from LP → vault ─────────────────────────────
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.lp_collateral_account.to_account_info(),
            mint: ctx.accounts.collateral_mint.to_account_info(),
            to: ctx.accounts.collateral_vault.to_account_info(),
            authority: ctx.accounts.lp.to_account_info(),
        },
    );
    token_interface::transfer_checked(
        transfer_ctx,
        usdc_amount,
        ctx.accounts.collateral_mint.decimals,
    )?;

    // ── Mint LP tokens to depositor ───────────────────────────────
    // Market PDA signs — it's the mint authority
    // PDA signing: pass the seeds + bump that derive the market address
    let _market_key = ctx.accounts.market.key();
    let authority_key = ctx.accounts.market.authority;
    let question_hash = ctx.accounts.market.question_hash;
    let bump = ctx.accounts.market.bump;

    let signer_seeds: &[&[&[u8]]] = &[&[
        b"market",
        authority_key.as_ref(),
        question_hash.as_ref(),
        &[bump],
    ]];

    let mint_ctx: CpiContext<'_, '_, '_, '_, MintTo<'_>> = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.lp_mint.to_account_info(),
            to: ctx.accounts.lp_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        },
        signer_seeds,
    );
    token_interface::mint_to(mint_ctx, lp_tokens_to_mint)?;

    // ── Update pool state ─────────────────────────────────────────
    // IMPORTANT: state updates AFTER all CPI calls (checks-effects-interactions)
    let lp_pool: &mut Account<'_, LpPool> = &mut ctx.accounts.lp_pool;

    // Initialise pool fields on first deposit
    if lp_pool.total_lp_supply == 0 {
        lp_pool.market = ctx.accounts.market.key();
        lp_pool.lp_mint = ctx.accounts.lp_mint.key();
        lp_pool.cumulative_fees = 0;
        lp_pool.last_settled_slot = Clock::get()?.slot;
        lp_pool.bump = ctx.bumps.lp_pool;
    }

    lp_pool.total_liquidity = lp_pool
        .total_liquidity
        .checked_add(usdc_amount)
        .ok_or(AegisError::Overflow)?;

    lp_pool.total_lp_supply = lp_pool
        .total_lp_supply
        .checked_add(lp_tokens_to_mint)
        .ok_or(AegisError::Overflow)?;

    // ── Emit event ────────────────────────────────────────────────
    emit!(LiquidityAdded {
        market: ctx.accounts.market.key(),
        lp: ctx.accounts.lp.key(),
        usdc_amount,
        lp_tokens_minted: lp_tokens_to_mint,
        new_total_liquidity: lp_pool.total_liquidity,
    });

    msg!(
        "Liquidity added: {} USDC → {} LP tokens (pool total: {})",
        usdc_amount,
        lp_tokens_to_mint,
        lp_pool.total_liquidity
    );

    Ok(())
}

// ── Events ────────────────────────────────────────────────────────

#[event]
pub struct LiquidityAdded {
    pub market: Pubkey,
    pub lp: Pubkey,
    pub usdc_amount: u64,
    pub lp_tokens_minted: u64,
    pub new_total_liquidity: u64,
}
