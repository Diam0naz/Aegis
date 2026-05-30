use anchor_lang::prelude::*;

// Stores the whitelisted oracle addresses for a market
// Created at market creation, up to 5 oracles
// Seeds: [b"oracle_config", market.key()]
#[account]
pub struct OracleConfig {
    pub market: Pubkey,
    pub oracles: [Pubkey; 5],
    pub oracle_count: u8,
    pub votes_required: u8,   // e.g. 3 of 5 required to trigger resolution
    pub min_oracle_bond: u64, // ← new: minimum SOL bond in lamports
    pub quorum_threshold: u8, // ← new: min votes before tally is valid (same as votes_required but explicit)
    pub bump: u8,
}

impl OracleConfig {
    pub const LEN: usize = 8      // discriminator
        + 32     // market
        + (32 * 5) // oracles array
        + 1      // oracle_count
        + 1      // votes_required
        + 8      // min_oracle_bond
        + 1      // quorum_threshold
        + 1      // bump
        + 16;    // padding
}
