use anchor_lang::prelude::*;

// One PDA per oracle source per market
// Seeds: [b"oracle_vote", market.key(), oracle_authority.key()]
#[account]
pub struct OracleVote {
    pub market:    Pubkey,
    pub authority: Pubkey,  // the oracle's wallet/program
    pub outcome:   bool,    // true = YES, false = NO
    pub voted_at:  u64,     // slot
    pub bump:      u8,
}

impl OracleVote {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 1 + 16;
}