# Aegis SDK

TypeScript SDK for the Aegis prediction market protocol.

## Installation

```bash
cd sdk
npm install
npm run build
```

## Testing

### 1. Quick test (dry-run, no transactions)

```bash
npm install tsx
npx tsx test.ts
```

This builds instructions without sending them — verifies the SDK compiles and PDAs derive correctly.

### 2. Integration test with localnet

Start a local validator with the program deployed:

```bash
# In project root
anchor localnet
```

Then run the existing test suite which uses the SDK:

```bash
# In project root
anchor test --skip-local-validator
```

### 3. Use in your own project

```bash
npm install ../sdk  # or publish to npm
```

```typescript
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { getProgram, buildSubmitOrder, prepareCommitReveal, marketPda } from "@aegis/sdk";

const connection = new Connection("https://api.devnet.solana.com");
const wallet = new Wallet(Keypair.fromSecretKey(/* your key */));
const provider = new AnchorProvider(connection, wallet, {});
const program = getProgram(provider);

// Submit a commit-reveal order
const { nonce, hash } = prepareCommitReveal("yes", new BN(1_000_000));
const [market] = marketPda(authority, questionHash);

const ix = await buildSubmitOrder(program, {
  user: wallet.publicKey,
  market,
  collateralMint: USDC_MINT,
  outcome: { yes: {} },
  amount: new BN(1_000_000),
  commitmentHash: hash,
});

// Save nonce for later reveal!
// Then send the transaction...
```

## API Overview

### Instructions
- `buildCreateMarket` — create a new prediction market
- `buildAddLiquidity` — deposit USDC as LP
- `buildRemoveLiquidity` — withdraw LP position
- `buildSubmitOrder` — place a bet (standard or commit-reveal)
- `buildRevealOrder` — reveal a commit-reveal order
- `buildSettleBatch` — crank: settle a batch window
- `buildProposeResolution` — propose market outcome
- `buildFinalizeResolution` — finalize after challenge window
- `buildCheckPriceResolution` — resolve via Pyth price feed
- `buildRedeemWinnings` — redeem winning tokens for USDC
- `buildSubmitOracleVote` — oracle votes on outcome
- `buildTallyOracleVotes` — tally oracle votes
- `buildPauseMarket` / `buildUnpauseMarket` — emergency pause

### Accounts
- `fetchMarket` — get market state
- `fetchLpPool` — get LP pool state
- `fetchBatchOrder` — get user's pending order
- `fetchOpenOrdersForMarket` — all unfilled orders
- `fetchResolutionProposal` — resolution proposal state
- `fetchOracleConfig` / `fetchOracleVote` — oracle data

### Events
- `parseEvents(logs)` — parse Aegis events from transaction logs
- `fetchTransactionEvents(connection, signature)` — fetch and parse events from a tx

### Commit-Reveal
- `generateNonce()` — random 32-byte nonce
- `commitmentHash(outcome, amount, nonce)` — compute hash for commit
- `prepareCommitReveal(outcome, amount)` — generate nonce + hash together

### PDAs
- `marketPda(authority, questionHash)`
- `lpPoolPda(market)` / `lpMintPda(market)`
- `yesMintPda(market)` / `noMintPda(market)`
- `batchOrderPda(market, user)`
- `resolutionPda(market)`
- `oracleConfigPda(market)` / `oracleVotePda(market, oracle)`

## Example: Full order flow

```typescript
// 1. Submit commit-reveal order
const { nonce, hash } = prepareCommitReveal("yes", new BN(5_000_000));
const submitIx = await buildSubmitOrder(program, {
  user: wallet.publicKey,
  market,
  collateralMint: USDC_MINT,
  outcome: { yes: {} },
  amount: new BN(5_000_000),
  commitmentHash: hash,
});
await provider.sendAndConfirm(new Transaction().add(submitIx));

// 2. Reveal before batch settles
const revealIx = await buildRevealOrder(program, {
  user: wallet.publicKey,
  market,
  outcome: { yes: {} },
  amount: new BN(5_000_000),
  nonce,
});
await provider.sendAndConfirm(new Transaction().add(revealIx));

// 3. Crank settles the batch (anyone can call)
const settleTx = await buildSettleBatch(program, {
  cranker: wallet.publicKey,
  market,
  collateralMint: USDC_MINT,
  creatorFeeAccount,
  remainingAccounts: [/* order PDAs + user token accounts */],
});
await provider.sendAndConfirm(new Transaction().add(settleTx));

// 4. After resolution, redeem winnings
const redeemIx = await buildRedeemWinnings(program, {
  user: wallet.publicKey,
  market,
  winningMint: yesMint,
  collateralMint: USDC_MINT,
  collateralVault,
});
await provider.sendAndConfirm(new Transaction().add(redeemIx));
```
