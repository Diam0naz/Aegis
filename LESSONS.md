# Aegis Project — Lessons Learned

## 1. ANCHOR_PROVIDER_URL was pointing to a wrong URL

**Error:** `Attempt to debit an account but found no record of a prior credit`

**Cause:** `.env` had `ANCHOR_PROVIDER_URL=https://api-auth.web3auth.io/.well-known/jwks.json` — a Web3Auth JWKS endpoint, not a Solana RPC. Every test wallet was unfunded because the connection was broken.

**Fix:** Set `ANCHOR_PROVIDER_URL=http://127.0.0.1:8899` for localnet or your actual RPC URL for devnet.

---

## 2. `"type": "module"` in package.json breaks `__dirname`

**Error:** `ReferenceError: __dirname is not defined in ES module scope`

**Cause:** `package.json` had `"type": "module"` which makes Node treat all files as ESM. `__dirname` is CommonJS-only. The `tsconfig.json` compiles to `commonjs` but the `"type": "module"` field overrides Node's loader at runtime.

**Fix:** Remove `"type": "module"` from `package.json`.

---

## 3. Anchor 0.31 typed `.accounts()` rejects explicitly passed PDA accounts

**Error:** `Object literal may only specify known properties, and 'market' does not exist in type 'ResolvedAccounts'`

**Cause:** Anchor 0.31+ introduced a new typed accounts API where PDA accounts are auto-resolved from seeds and excluded from the required accounts object. All scripts and tests were written for the old untyped API.

**Fix:** Add `// @ts-nocheck` to the top of all script and test files, and add `"skipLibCheck": true` to `tsconfig.json`.

---

## 4. `getOrCreateAssociatedTokenAccount` returns an object, not a PublicKey

**Error:** Silent wrong-type bug — `mintTo` and `.accounts({})` received an `Account` object instead of a `PublicKey`.

**Cause:** `getOrCreateAssociatedTokenAccount` returns `{ address: PublicKey, ... }` but the variable was typed as `PublicKey`.

**Fix:** Extract `.address` — `(await getOrCreateAssociatedTokenAccount(...)).address`.

---

## 5. Helius HTTP RPC does not support WebSocket subscriptions

**Error:** `Received JSON-RPC error calling signatureSubscribe: Method 'signatureSubscribe' not found`

**Cause:** Anchor's `.rpc()` internally calls `connection.confirmTransaction()` which uses WebSocket (`signatureSubscribe`) for confirmation. Helius HTTP endpoints don't support WebSocket.

**Fix:** Override `provider.sendAndConfirm` in `setup.ts` to use HTTP polling via `getSignatureStatus` instead of WebSocket.

---

## 6. `AnchorProvider.env()` in a script creates a new provider ignoring custom overrides

**Error:** `Attempt to debit an account but found no record of a prior credit` when funding trader wallets.

**Cause:** Script 3 called `anchor.AnchorProvider.env()` which reads `ANCHOR_PROVIDER_URL` (pointing to localnet `http://127.0.0.1:8899`) instead of using the devnet provider from `loadProgram`. The transfer went to the wrong network.

**Fix:** Use the `provider` returned from `loadProgram(wallet)` instead of `AnchorProvider.env()`.

---

## 7. IDL out of sync with deployed program causes account deserialization failure

**Error:** `RangeError: The value of "offset" is out of range. It must be >= 0 and <= 286. Received 299`

**Cause:** The Rust program was modified (new fields added to `Market` struct: `price_feed`, `strike_price`, `strike_exponent`, `price_above_strike_resolves_yes`) but the program was not redeployed. The on-chain account was 286 bytes (old layout) but the local IDL expected 299+ bytes.

**Fix:** Always `anchor build` then redeploy after changing account structs. Never run scripts against a deployed program that doesn't match the local IDL.

---

## 8. `propose_resolution` script passed wrong accounts

**Error:** Transaction simulation failed with unknown accounts.

**Cause:** Script 5 was passing `proposerCollateral`, `collateralVault`, `collateralMint`, `tokenProgram`, `associatedTokenProgram` — none of which exist in the Rust `ProposeResolution` struct. The bond is paid in SOL lamports via system transfer, not USDC.

**Fix:** Strip accounts down to only `proposer`, `market`, `proposal`, `systemProgram`. Set bond in lamports (SOL), not USDC.

---

## 9. `settle_batch` creatorFeeAccount pointed to wrong account

**Error:** Transaction succeeded but fees went to wrong account.

**Cause:** Script 4 used `state.lpUsdcAccount` (the LP's USDC account) as `creatorFeeAccount`. The Rust program transfers creator fees to the market's `creator_fee_vault` which is set to `authority` at market creation.

**Fix:** Use `getAssociatedTokenAddressSync(usdcMint, wallet.publicKey)` — the wallet's own USDC ATA.

---

## 10. `__dirname` resolves to project root, not script directory, in ts-node

**Error:** `loadState()` always returned `{}` — state file not found.

**Cause:** `ts-node` sets `__dirname` to the project root (where the command is run from), not the directory of the source file. `STATE_FILE = path.join(__dirname, ".devnet-state.json")` resolved to the project root, but the state file was saved to `scripts/`.

**Fix:** Keep the state file at the project root (where `__dirname` resolves to), or use `process.cwd()` explicitly.

---

## 11. Circle devnet USDC faucet limited to 20 USDC per request

**Cause:** The standard devnet USDC mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) is controlled by Circle. You cannot mint from it — you can only request from their faucet at https://faucet.circle.com, limited to 20 USDC at a time.

**Fix:** For testing, use a mock mint you control (created with `createMint` where your wallet is the mint authority). This is what the test suite does and what the localnet scripts now do.

---

## 12. Devnet program upgrade failed due to insufficient SOL

**Error:** `Transfer: insufficient lamports 2178364492, need 4258942320`

**Cause:** Upgrading a 608KB program on devnet requires ~4.26 SOL for buffer allocation. The wallet only had ~2.18 SOL. Devnet airdrop is rate-limited (429 Too Many Requests).

**Fix:** Use https://faucet.solana.com for larger airdrops, or switch to localnet where SOL is free via `solana airdrop`.

---

## 13. Devnet program upgrade failed due to blockhash expiry

**Error:** `Blockhash expired. 0 retries remaining` / `Max retries exceeded`

**Cause:** Uploading a large program (608KB) requires many sequential transactions. On a congested devnet, transactions take too long and the blockhash expires before the upload completes.

**Fix:** Use `--max-sign-attempts 20` flag with `anchor program deploy`, or deploy to localnet where there is no congestion.

---

## 14. Resolution slot too far in future causes long wait in script 5

**Cause:** Script 1 set `resolutionSlot = currentSlot + 50_000` (~5.5 hours). Script 5 waits for this slot before proposing resolution.

**Fix:** On localnet use `currentSlot + 200` (~80 seconds) — enough time to run scripts 2-4 but short enough that script 5 doesn't wait long.

---

## 15. Resolution slot too close causes MarketLocked error in script 3

**Error:** `AnchorError: MarketLocked. market is in pre-resolution lockout — no new orders`

**Cause:** Set resolution slot to `currentSlot + 100` (~40 seconds). By the time scripts 2 and 3 ran, the market had entered its pre-resolution lockout window and rejected new orders.

**Fix:** Balance the resolution slot — `currentSlot + 200` gives ~80 seconds, enough for scripts 2-4 to complete before lockout.

---

## 16. Challenge window blocks script 6 on localnet

**Error:** `⚠ Challenge window still open. On mainnet: wait 48h`

**Cause:** `propose_resolution` sets a 432,000 slot (~48h) challenge window. `finalize_resolution` enforces this guard. On localnet there is no way to skip time without a special validator.

**Fix (testing):** Change `DEFAULT_CHALLENGE_WINDOW` to `1` in `propose_resolution.rs`, rebuild and redeploy.  
**Fix (production flow):** Use Surfpool's `surfnet_warpToSlot` RPC method to fast-forward slots.

---

## 17. dotenv not loaded in scripts — wrong RPC URL used

**Error:** `fetch failed` — connection attempted to wrong endpoint.

**Cause:** Scripts imported from `setup.ts` but `dotenv.config()` was not called before `RPC_URL` was read. `process.env.RPC_URL` was undefined, falling back to the hardcoded Alchemy URL.

**Fix:** Call `dotenv.config()` at the top of `setup.ts` so it runs before any env variable is read, covering all scripts that import from it.
