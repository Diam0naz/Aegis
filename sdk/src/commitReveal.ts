import { createHash, randomBytes } from "crypto";
import { BN } from "@coral-xyz/anchor";

export type Outcome = { yes: Record<string, never> } | { no: Record<string, never> };

/** Generate a random 32-byte nonce for commit-reveal orders. */
export function generateNonce(): Uint8Array {
  return new Uint8Array(randomBytes(32));
}

/**
 * Compute the commitment hash for a commit-reveal order.
 * Mirrors the on-chain: hashv(&[outcome_byte, amount_le_bytes, nonce])
 * Uses SHA-256 (Solana's hashv is SHA-256).
 */
export function commitmentHash(
  outcome: "yes" | "no",
  amount: BN,
  nonce: Uint8Array
): Uint8Array {
  const outcomeByte = Buffer.from([outcome === "yes" ? 0 : 1]);
  const amountBytes = Buffer.alloc(8);
  // BN to little-endian 8 bytes
  const amountBuf = amount.toArrayLike(Buffer, "le", 8);
  amountBuf.copy(amountBytes);

  const hash = createHash("sha256")
    .update(outcomeByte)
    .update(amountBytes)
    .update(Buffer.from(nonce))
    .digest();

  return new Uint8Array(hash);
}

/** Convenience: generate nonce and hash together. Returns both for storage. */
export function prepareCommitReveal(
  outcome: "yes" | "no",
  amount: BN
): { nonce: Uint8Array; hash: Uint8Array } {
  const nonce = generateNonce();
  const hash = commitmentHash(outcome, amount, nonce);
  return { nonce, hash };
}
