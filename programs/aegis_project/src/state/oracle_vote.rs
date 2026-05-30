use anchor_lang::prelude::*;

// One PDA per oracle source per market
// Seeds: [b"oracle_vote", market.key(), oracle_authority.key()]
#[account]
pub struct OracleVote {
    pub market: Pubkey,
    pub authority: Pubkey, // the oracle's wallet/program
    pub outcome: bool,     // true = YES, false = NO
    pub voted_at: u64,     // slot
    pub bond_amount: u64,  // ← new: lamports bonded with this vote
    pub bump: u8,
}

impl OracleVote {
    pub const LEN: usize = 8    // discriminator
        + 32   // market
        + 32   // authority
        + 1    // outcome
        + 8    // voted_at
        + 8    // bond_amount
        + 1    // bump
        + 16;  // padding
}
