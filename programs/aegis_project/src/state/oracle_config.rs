use anchor_lang::prelude::*;

// Stores the whitelisted oracle addresses for a market
// Created at market creation, up to 5 oracles
// Seeds: [b"oracle_config", market.key()]
#[account]
pub struct OracleConfig {
    pub market:         Pubkey,
    pub oracles:        [Pubkey; 5],
    pub oracle_count:   u8,
    pub votes_required: u8,  // e.g. 3 of 5 required to trigger resolution
    pub bump:           u8,
}

impl OracleConfig {
    pub const LEN: usize = 8 + 32 + (32 * 5) + 1 + 1 + 1 + 16;
}