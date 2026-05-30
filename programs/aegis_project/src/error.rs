use anchor_lang::prelude::*;

#[error_code]
pub enum AegisError {
    // Market creation
    #[msg("b_param must be between 100 and 10,000")]
    InvalidBParam,

    #[msg("fee_bps must be between 0 and 1,000 (max 10%)")]
    InvalidFeeBps,

    #[msg("batch_window_slots must be between 1 and 150")]
    InvalidBatchWindow,

    #[msg("resolution_slot must be in the future")]
    InvalidResolutionSlot,

    // Market state
    #[msg("market is not active")]
    MarketNotActive,

    #[msg("batch window has not closed yet")]
    BatchWindowNotClosed,

    #[msg("cannot withdraw liquidity during an active batch")]
    CannotWithdrawDuringBatch,

    #[msg("market is in pre-resolution lockout — no new orders")]
    MarketLocked,

    #[msg("market is not resolved")]
    MarketNotResolved,

    #[msg("winning outcome is not set")]
    MissingWinningOutcome,

    #[msg("market must be locked before resolution can be proposed")]
    MarketNotLocked,

    #[msg("market is paused by authority")]
    MarketPaused,

    #[msg("market is not paused")]
    MarketNotPaused,

    #[msg("market is already paused")]
    MarketAlreadyPaused,

    // Orders
    #[msg("order amount is below the minimum (1 USDC)")]
    OrderBelowMinimum,

    #[msg("order would exceed maximum single-order market impact")]
    OrderExceedsImpactLimit,

    #[msg("order belongs to a different batch window")]
    StaleOrder,

    #[msg("order has already been filled")]
    OrderAlreadyFilled,

    #[msg("an open order already exists for this user")]
    OpenOrderExists,

    #[msg("too many orders provided for a single batch")]
    TooManyOrders,

    #[msg("invalid remaining accounts layout")]
    InvalidRemainingAccounts,

    #[msg("duplicate order account supplied")]
    DuplicateOrderAccount,

    #[msg("order is not yet revealed")]
    OrderNotRevealed,

    #[msg("oracle bond amount is below the required minimum")]
    OracleBondTooLow,

    #[msg("order exceeds maximum allowed size for this market")]
    OrderExceedsMaxSize,

    #[msg("order is not a commit-reveal order")]
    NotACommitRevealOrder,

    #[msg("order has already been revealed")]
    OrderAlreadyRevealed,

    #[msg("reveal does not match the original commitment hash")]
    InvalidReveal,

    #[msg("high-impact order requires a commitment hash")]
    CommitmentHashRequired, 

    // Math
    #[msg("arithmetic overflow")]
    Overflow,

    #[msg("division by zero")]
    DivisionByZero,

    // Auth
    #[msg("signer is not the market authority")]
    Unauthorized,

    // Accounts
    #[msg("invalid collateral vault account")]
    InvalidCollateralVault,

    #[msg("invalid user token account for order settlement")]
    InvalidUserTokenAccount,

    #[msg("invalid outcome mint for this operation")]
    InvalidOutcomeMint,

    #[msg("creator fee account does not match market.creator_fee_vault")]
    InvalidCreatorFeeAccount,

    // Liquidity & Redemption
    #[msg("invalid liquidity amount")]
    InvalidLiquidityAmount,

    #[msg("invalid redeem amount")]
    InvalidRedeemAmount,

    #[msg("insufficient vault collateral")]
    InsufficientVaultCollateral,

    #[msg("insufficient LP tokens to withdraw")]
    InsufficientLpTokens,

    #[msg("no winning tokens to redeem")]
    NoWinningTokens,

    #[msg("minimum LP lockup period has not passed")]
    LpLockupNotExpired,

    // Resolution
    #[msg("market has not reached the resolution slot yet")]
    ResolutionSlotNotReached,

    #[msg("market is already resolved")]
    AlreadyResolved,

    #[msg("proposal has been disputed and cannot be auto-finalized")]
    ProposalDisputed,

    #[msg("proposal is still within the challenge window")]
    StillInChallengeWindow,

    #[msg("bond amount is below the required minimum")]
    BondTooLow,

    #[msg("price feed account does not match market")]
    InvalidPriceFeed,

    #[msg("price feed is stale — data too old")]
    StalePriceFeed,

    #[msg("price feed confidence interval too wide — possible manipulation")]
    PriceFeedUnreliable,

    #[msg("this market uses event-based resolution, not price feeds")]
    NotAPriceMarket,

    #[msg("insufficient oracle votes to trigger resolution")]
    InsufficientOracleVotes,

    #[msg("oracle is not whitelisted for this market")]
    OracleNotWhitelisted,
}
