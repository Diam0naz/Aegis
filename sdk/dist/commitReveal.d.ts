import { BN } from "@coral-xyz/anchor";
export type Outcome = {
    yes: Record<string, never>;
} | {
    no: Record<string, never>;
};
/** Generate a random 32-byte nonce for commit-reveal orders. */
export declare function generateNonce(): Uint8Array;
/**
 * Compute the commitment hash for a commit-reveal order.
 * Mirrors the on-chain: hashv(&[outcome_byte, amount_le_bytes, nonce])
 * Uses SHA-256 (Solana's hashv is SHA-256).
 */
export declare function commitmentHash(outcome: "yes" | "no", amount: BN, nonce: Uint8Array): Uint8Array;
/** Convenience: generate nonce and hash together. Returns both for storage. */
export declare function prepareCommitReveal(outcome: "yes" | "no", amount: BN): {
    nonce: Uint8Array;
    hash: Uint8Array;
};
