use anchor_lang::prelude::*;

// ── Market Status ─────────────────────────────────────────────────
// Tracks the lifecycle of a prediction market.
// Status transitions: Active → Locked → Resolved
// Active:   accepting orders, batch engine running
// Locked:   pre-resolution window, no new orders accepted
// Resolved: outcome confirmed, winners can redeem

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum MarketStatus {
    Active,
    Locked,
    Resolved,
}

// ── Outcome ───────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum Outcome {
    Yes,
    No,
}

// ── Market ────────────────────────────────────────────────────────
// The root PDA for a prediction market.
// Seeds: [b"market", authority.key(), question_hash]
// One market per (creator, question) pair.

#[account]
pub struct Market {
    // ── Identity ─────────────────────────────────────────────────
    /// Creator and admin of this market
    pub authority: Pubkey,

    /// SHA-256 hash of the question string (stored off-chain / in event logs)
    /// We store the hash not the string — strings are variable length
    /// and expensive on-chain. Hash is 32 bytes, always.
    pub question_hash: [u8; 32],

    // ── LMSR Parameters ──────────────────────────────────────────
    /// Liquidity parameter — controls market depth and LP risk
    /// Larger b = deeper market, more LP capital needed
    /// Smaller b = volatile prices, cheaper to bootstrap
    pub b_param: u64,

    /// Current YES shares outstanding (LMSR s1)
    pub yes_qty: u64,

    /// Current NO shares outstanding (LMSR s2)
    pub no_qty: u64,

    // ── Batch Engine ─────────────────────────────────────────────
    /// Slot at which the current batch window opened
    pub batch_slot_start: u64,

    /// How many slots per batch window (e.g. 8 slots ≈ 3.2 seconds)
    pub batch_window_slots: u64,

    /// Whether a batch is currently being settled (blocks LP withdrawals)
    pub batch_active: bool,

    // ── Fee Configuration ─────────────────────────────────────────
    /// Total fee in basis points (e.g. 200 = 2%)
    pub fee_bps: u16,

    // ── Token Mints ───────────────────────────────────────────────
    /// SPL mint for YES outcome tokens
    pub yes_mint: Pubkey,

    /// SPL mint for NO outcome tokens
    pub no_mint: Pubkey,

    /// USDC vault holding collateral
    pub collateral_vault: Pubkey,

    // ── Resolution ───────────────────────────────────────────────
    /// Slot after which the market locks and resolution begins
    pub resolution_slot: u64,

    /// Current lifecycle status
    pub status: MarketStatus,

    /// Winning outcome — set when status = Resolved
    pub winning_outcome: Option<Outcome>,

    // ── Bookkeeping ───────────────────────────────────────────────
    /// Canonical PDA bump — stored so we never recompute it
    pub bump: u8,

    /// Total USDC collected in fees (for LP distribution)
    pub total_fees_collected: u64,

    /// Pyth price feed account for this market (zero if event market)
    pub price_feed: Pubkey,

    /// Strike price for resolution (in Pyth's price format, scaled)
    /// e.g. for "BTC > $100k": strike = 100_000 * 10^8
    pub strike_price: i64,

    /// Price exponent from Pyth (negative number, e.g. -8)
    pub strike_exponent: i32,

    /// Direction: true = resolve YES if price >= strike
    ///            false = resolve YES if price < strike
    pub price_above_strike_resolves_yes: bool,
}

impl Market {
    /// Space calculation:
    /// 8        discriminator (Anchor adds automatically)
    /// 32       authority
    /// 32       question_hash
    /// 8        b_param
    /// 8        yes_qty
    /// 8        no_qty
    /// 8        batch_slot_start
    /// 8        batch_window_slots
    /// 1        batch_active
    /// 2        fee_bps
    /// 32       yes_mint
    /// 32       no_mint
    /// 32       collateral_vault
    /// 8        resolution_slot
    /// 1+1      status (enum discriminant)
    /// 1+1+1    winning_outcome (Option<enum>)
    /// 1        bump
    /// 8        total_fees_collected
    /// + 64     padding (future fields — never skip this)
    pub const LEN: usize =
        8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 2 + 32 + 32 + 32 + 8 + 2 + 2 + 1 + 8 +  32 + 8 + 4 + 1 + 19;
}
