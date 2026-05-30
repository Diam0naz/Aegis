/**
 * SDK smoke test — runs the full lifecycle against a local validator.
 *
 * Prerequisites:
 *   solana-test-validator running  (or anchor test --skip-local-validator)
 *
 * Run:
 *   npx tsx test.ts
 */

import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as crypto from "crypto";
import {
  getProgram,
  buildCreateMarket,
  buildAddLiquidity,
  buildSubmitOrder,
  buildSettleBatch,
  fetchMarket,
  marketPda,
  batchOrderPda,
  yesMintPda,
  noMintPda,
} from "./src";

// ── helpers ───────────────────────────────────────────────────────

function loadLocalKeypair(): Keypair {
  const raw = JSON.parse(
    fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`, "utf8")
  );
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function send(
  connection: Connection,
  payer: Keypair,
  ...ixs: Parameters<typeof Transaction.prototype.add>
): Promise<string> {
  const tx = new Transaction().add(...ixs);
  return sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
  });
}

function hashQuestion(q: string): Uint8Array {
  return crypto.createHash("sha256").update(q).digest();
}

// ── main ──────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const payer = loadLocalKeypair();
  const provider = new AnchorProvider(
    connection,
    new Wallet(payer),
    { commitment: "confirmed" }
  );
  const program = getProgram(provider);

  console.log("Program ID:", program.programId.toBase58());
  console.log("Wallet:    ", payer.publicKey.toBase58());

  // ── 1. Create a mock USDC mint ────────────────────────────────
  console.log("\n[1] Creating USDC mint...");
  const usdcMint = await createMint(
    connection, payer, payer.publicKey, null, 6
  );
  console.log("    USDC mint:", usdcMint.toBase58());

  // Fund payer's USDC account
  const payerUsdc = await createAssociatedTokenAccount(
    connection, payer, usdcMint, payer.publicKey
  );
  await mintTo(connection, payer, usdcMint, payerUsdc, payer, 10_000_000_000); // 10,000 USDC
  console.log("    Minted 10,000 USDC to payer");

  // ── 2. Create market ──────────────────────────────────────────
  console.log("\n[2] Creating market...");
  const questionHash = hashQuestion(`Will BTC hit $200k? run=${Date.now()}`);
  const slot = await connection.getSlot();
  const resolutionSlot = slot + 500;

  const createIx = await buildCreateMarket(program, {
    authority: payer.publicKey,
    collateralMint: usdcMint,
    questionHash,
    bParam: new BN(1000),
    batchWindowSlots: new BN(4),
    resolutionSlot: new BN(resolutionSlot),
    feeBps: 200,
    creatorFeeBps: 50,
  });

  await send(connection, payer, createIx);
  const [market] = marketPda(payer.publicKey, questionHash);
  const marketData = await fetchMarket(program, market);
  console.log("    Market PDA:", market.toBase58());
  console.log("    Status:    ", Object.keys(marketData.status)[0]);
  console.log("    b_param:   ", marketData.bParam.toString());

  // ── 3. Add liquidity ──────────────────────────────────────────
  console.log("\n[3] Adding 2,000 USDC liquidity...");
  const addLiqIx = await buildAddLiquidity(program, {
    lp: payer.publicKey,
    market,
    collateralMint: usdcMint,
    usdcAmount: new BN(2_000_000_000),
  });
  await send(connection, payer, addLiqIx);
  console.log("    Liquidity added");

  // ── 4. Submit a YES order ─────────────────────────────────────
  console.log("\n[4] Submitting YES order (100 USDC)...");
  const submitIx = await buildSubmitOrder(program, {
    user: payer.publicKey,
    market,
    collateralMint: usdcMint,
    outcome: { yes: {} },
    amount: new BN(100_000_000),
  });
  await send(connection, payer, submitIx);
  const [orderPda] = batchOrderPda(market, payer.publicKey);
  console.log("    Order PDA:", orderPda.toBase58());

  // ── 5. Wait for batch window, then settle ─────────────────────
  console.log("\n[5] Waiting for batch window (4 slots ≈ 2s)...");
  await new Promise((r) => setTimeout(r, 3000));

  const [yesMint] = yesMintPda(market);
  const [noMint] = noMintPda(market);

  // Create payer's YES token account to receive minted tokens
  const payerYes = await createAssociatedTokenAccount(
    connection, payer, yesMint, payer.publicKey
  );

  console.log("    Settling batch...");
  const settleIx = await buildSettleBatch(program, {
    cranker: payer.publicKey,
    market,
    collateralMint: usdcMint,
    creatorFeeAccount: payerUsdc, // creator_fee_vault = payer's USDC ATA
    remainingAccounts: [
      { pubkey: orderPda, isWritable: true, isSigner: false },
      { pubkey: payerYes, isWritable: true, isSigner: false },
    ],
  });
  await send(connection, payer, settleIx);

  // ── 6. Final state ────────────────────────────────────────────
  console.log("\n[6] Final market state:");
  const final = await fetchMarket(program, market);
  console.log("    yes_qty:", final.yesQty.toString());
  console.log("    no_qty: ", final.noQty.toString());
  console.log("    status: ", Object.keys(final.status)[0]);
  console.log("\n✓ SDK smoke test complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
