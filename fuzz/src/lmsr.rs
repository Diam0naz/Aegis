use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Debug, Clone, PartialEq, BorshSerialize, BorshDeserialize)]
pub enum AegisError {
    Overflow,
    DivisionByZero,
}

impl From<AegisError> for std::io::Error {
    fn from(err: AegisError) -> Self {
        std::io::Error::new(std::io::ErrorKind::Other, format!("{:?}", err))
    }
}

type Result<T> = std::result::Result<T, AegisError>;

const SCALE: u128 = 1_000_000_000; // 9 decimal fixed-point

/// exp(k) lookup table for k = 0..=20, scaled by SCALE.
const EXP_LOOKUP: [u128; 21] = [
    1_000_000_000,          // exp(0)
    2_718_281_828,          // exp(1)
    7_389_056_099,          // exp(2)
    20_085_536_923,         // exp(3)
    54_598_150_033,         // exp(4)
    148_413_159_103,        // exp(5)
    403_428_793_493,        // exp(6)
    1_096_633_158_428,      // exp(7)
    2_980_957_987_041,      // exp(8)
    8_103_083_927_576,      // exp(9)
    22_026_465_794_806,     // exp(10)
    59_874_141_715_197,     // exp(11)
    162_754_791_419_004,    // exp(12)
    442_413_392_314_966,    // exp(13)
    1_202_604_284_164_776,  // exp(14)
    3_269_446_681_940_005,  // exp(15)
    8_886_110_520_507_872,  // exp(16)
    24_154_952_753_575_298, // exp(17)
    65_659_969_137_330_511, // exp(18)
    u128::MAX / 2,          // exp(19) — sentinel
    u128::MAX / 2,          // exp(20) — sentinel
];

/// Taylor series approximation of exp(r) for |r| < 1, scaled by SCALE.
fn exp_fractional(r: u128) -> Result<u128> {
    let term0 = SCALE;
    let term1 = r;
    let term2 = r
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_div(2)
        .ok_or(AegisError::DivisionByZero)?;
    let term3 = r
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_div(6)
        .ok_or(AegisError::DivisionByZero)?;
    let term4 = r
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_mul(r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)?
        .checked_div(24)
        .ok_or(AegisError::DivisionByZero)?;

    term0
        .checked_add(term1)
        .ok_or(AegisError::Overflow)?
        .checked_add(term2)
        .ok_or(AegisError::Overflow)?
        .checked_add(term3)
        .ok_or(AegisError::Overflow)?
        .checked_add(term4)
        .ok_or(AegisError::Overflow)
}

/// Compute exp(numerator / denominator) using range reduction + Taylor series.
fn exp_ratio(numerator: u64, denominator: u64) -> Result<u128> {
    if denominator == 0 {
        return Err(AegisError::DivisionByZero);
    }

    let k = (numerator / denominator) as usize;

    if k >= 19 {
        return Ok(u128::MAX / 2);
    }

    let remainder = numerator % denominator;
    let r = (remainder as u128)
        .checked_mul(SCALE)
        .ok_or(AegisError::Overflow)?
        .checked_div(denominator as u128)
        .ok_or(AegisError::DivisionByZero)?;

    let exp_k = EXP_LOOKUP[k];
    let exp_r = exp_fractional(r)?;

    exp_k
        .checked_mul(exp_r)
        .ok_or(AegisError::Overflow)?
        .checked_div(SCALE)
        .ok_or(AegisError::DivisionByZero)
}

/// Compute LMSR YES price in basis points (1–9999).
pub fn lmsr_yes_price_bps(b: u64, yes_qty: u64, no_qty: u64) -> Result<u64> {
    if yes_qty == no_qty {
        return Ok(5_000);
    }

    let exp_yes = exp_ratio(yes_qty, b)?;
    let exp_no = exp_ratio(no_qty, b)?;

    let is_yes_extreme = exp_yes == u128::MAX / 2;
    let is_no_extreme = exp_no == u128::MAX / 2;

    if is_yes_extreme && !is_no_extreme {
        return Ok(9_999);
    }
    if is_no_extreme && !is_yes_extreme {
        return Ok(1);
    }
    if is_yes_extreme && is_no_extreme {
        return Ok(if yes_qty >= no_qty { 9_999 } else { 1 });
    }

    let total = exp_yes.checked_add(exp_no).ok_or(AegisError::Overflow)?;

    let price_bps = exp_yes
        .checked_mul(10_000)
        .ok_or(AegisError::Overflow)?
        .checked_div(total)
        .ok_or(AegisError::DivisionByZero)? as u64;

    Ok(price_bps.max(1).min(9_999))
}