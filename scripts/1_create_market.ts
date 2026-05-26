// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  createMint,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  loadWallet,
  loadProgram,
  hashQuestion,
  getMarketPDA,
  getYesMintPDA,
  getNoMintPDA,
  saveState,
} from "./setup";

// ── Market Config ─────────────────────────────────────────────────
const QUESTION    = "Will SOL hit $500 by end of 2022?";
const B_PARAM     = 500;
const BATCH_SLOTS = 8;
const FEE_BPS     = 200;
const CREATOR_FEE = 40;

async function main() {
  const wallet  = loadWallet();
  const { program, connection } = loadProgram(wallet);

  // Create a fresh mock USDC mint (localnet — we control the mint authority)
  console.log("\n🏗  Creating Aegis Market on Localnet");
  console.log("─────────────────────────────────────");
  console.log("Creating mock USDC mint...");
  const usdcMintKeypair = anchor.web3.Keypair.generate();
  const usdcMintPubkey = await createMint(
    connection, wallet, wallet.publicKey, null, 6, usdcMintKeypair
  );
  console.log(`Mock USDC mint: ${usdcMintPubkey.toBase58()}`);
  console.log(`Question:    ${QUESTION}`);
  console.log(`b_param:     ${B_PARAM}`);
  console.log(`fee_bps:     ${FEE_BPS} (${FEE_BPS / 100}%)`);
  console.log(`creator_fee: ${CREATOR_FEE} (${CREATOR_FEE / 100}%)`);
  console.log(`Authority:   ${wallet.publicKey.toBase58()}\n`);

  const questionHash    = hashQuestion(QUESTION);
  const marketPDA       = getMarketPDA(wallet.publicKey, questionHash);
  const yesMintPDA      = getYesMintPDA(marketPDA);
  const noMintPDA       = getNoMintPDA(marketPDA);
  const collateralVault = getAssociatedTokenAddressSync(usdcMintPubkey, marketPDA, true);

  // Resolution slot — 50,000 slots from now (~5.5 hours on devnet)
  const currentSlot    = await connection.getSlot();
  const resolutionSlot = currentSlot + 200; // ~80s — enough for scripts 2-4, short wait for 5

  console.log(`Current slot:    ${currentSlot}`);
  console.log(`Resolution slot: ${resolutionSlot}`);
  console.log(`Market PDA:      ${marketPDA.toBase58()}`);
  console.log(`YES mint:        ${yesMintPDA.toBase58()}`);
  console.log(`NO mint:         ${noMintPDA.toBase58()}\n`);

  try {
    const tx = await program.methods
      .createMarket(
        questionHash,
        new anchor.BN(B_PARAM),
        new anchor.BN(BATCH_SLOTS),
        new anchor.BN(resolutionSlot),
        FEE_BPS,
        CREATOR_FEE
      )
      .accounts({
        authority:              wallet.publicKey,
        market:                 marketPDA,
        collateralMint:         usdcMintPubkey,
        yesMint:                yesMintPDA,
        noMint:                 noMintPDA,
        collateralVault:        collateralVault,
        tokenProgram:           TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:          anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();

    console.log(`✅ Market created!`);
    console.log(`   TX: ${tx}`);
    console.log(`   https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    // Save state for subsequent scripts
    saveState({
      question:        QUESTION,
      questionHash:    Buffer.from(questionHash).toString("hex"),
      marketPDA:       marketPDA.toBase58(),
      yesMintPDA:      yesMintPDA.toBase58(),
      noMintPDA:       noMintPDA.toBase58(),
      collateralVault: collateralVault.toBase58(),
      usdcMint:        usdcMintPubkey.toBase58(),
      usdcMintAuthority: Array.from(wallet.secretKey), // wallet is mint authority
      resolutionSlot,
      createdAt:       new Date().toISOString(),
    });

    console.log(`\n💾 State saved to scripts/.devnet-state.json`);
    console.log(`   Run next: npx ts-node scripts/2_add_liquidity.ts`);

  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    if (err.logs) {
      console.error("Program logs:");
      err.logs.forEach((l: string) => console.error(" ", l));
    }
    process.exit(1);
  }
}

main();