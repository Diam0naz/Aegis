"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNonce = generateNonce;
exports.commitmentHash = commitmentHash;
exports.prepareCommitReveal = prepareCommitReveal;
const crypto_1 = require("crypto");
/** Generate a random 32-byte nonce for commit-reveal orders. */
function generateNonce() {
    return new Uint8Array((0, crypto_1.randomBytes)(32));
}
/**
 * Compute the commitment hash for a commit-reveal order.
 * Mirrors the on-chain: hashv(&[outcome_byte, amount_le_bytes, nonce])
 * Uses SHA-256 (Solana's hashv is SHA-256).
 */
function commitmentHash(outcome, amount, nonce) {
    const outcomeByte = Buffer.from([outcome === "yes" ? 0 : 1]);
    const amountBytes = Buffer.alloc(8);
    // BN to little-endian 8 bytes
    const amountBuf = amount.toArrayLike(Buffer, "le", 8);
    amountBuf.copy(amountBytes);
    const hash = (0, crypto_1.createHash)("sha256")
        .update(outcomeByte)
        .update(amountBytes)
        .update(Buffer.from(nonce))
        .digest();
    return new Uint8Array(hash);
}
/** Convenience: generate nonce and hash together. Returns both for storage. */
function prepareCommitReveal(outcome, amount) {
    const nonce = generateNonce();
    const hash = commitmentHash(outcome, amount, nonce);
    return { nonce, hash };
}
