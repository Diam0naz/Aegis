#![no_main]
use libfuzzer_sys::fuzz_target;

// Use the actual program's LMSR implementation
use aegis_project::instructions::submit_order::lmsr_yes_price_bps;

fuzz_target!(|data: &[u8]| {
    if data.len() < 24 {
        return;
    }

    let b = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let yes_qty = u64::from_le_bytes(data[8..16].try_into().unwrap());
    let no_qty = u64::from_le_bytes(data[16..24].try_into().unwrap());

    // Skip degenerate inputs
    if b == 0 || b < 100 {
        return;
    }

    if let Ok(price) = lmsr_yes_price_bps(b, yes_qty, no_qty) {
        // Invariant 1: price always in valid range
        assert!(
            price >= 1 && price <= 9_999,
            "price out of range: {} (b={}, yes={}, no={})",
            price,
            b,
            yes_qty,
            no_qty
        );

        // Invariant 2: symmetry — swap yes/no, price should be complementary
        if let Ok(mirror) = lmsr_yes_price_bps(b, no_qty, yes_qty) {
            let sum = price + mirror;
            // Allow 1 bps rounding error from tick rounding
            assert!(
                sum >= 9_998 && sum <= 10_001,
                "symmetry violated: {}+{}={} (b={}, yes={}, no={})",
                price,
                mirror,
                sum,
                b,
                yes_qty,
                no_qty
            );
        }

        // Invariant 3: monotonicity — more yes qty → higher yes price
        if yes_qty < u64::MAX {
            if let Ok(higher) = lmsr_yes_price_bps(b, yes_qty + 1, no_qty) {
                assert!(
                    higher >= price,
                    "monotonicity violated: price dropped from {} to {} when yes_qty increased",
                    price,
                    higher
                );
            }
        }
    }
    // Errors (overflow, div-by-zero) are acceptable — just must not panic
});
