// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import {
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  loadWallet,
  loadProgram,
  getResolutionPDA,
  getYesMintPDA,
  loadState,
  confirmTx,
} from "./setup";

async function main() {
  const state = loadState();
  if (!state.resolutionPDA) {
    console.error("❌ No resolution found. Run 5_resolve_market.ts first.");
    process.exit(1);
  }

  const wallet = loadWallet();
  const { program, connection } = loadProgram(wallet);

  const marketPDA      = new anchor.web3.PublicKey(state.marketPDA);
  const usdcMint       = new anchor.web3.PublicKey(state.usdcMint);
  const vault          = new anchor.web3.PublicKey(state.collateralVault);
  const resolutionPDA  = new anchor.web3.PublicKey(state.resolutionPDA);
  const yesMintPDA     = getYesMintPDA(marketPDA);

  console.log("\n🏁 Finalizing Resolution & Redeeming Winnings");
  console.log("──────────────────────────────────────────────\n");

  // ── Step 1: Finalize ──────────────────────────────────────────
  console.log("Step 1: Finalizing resolution...");
  try {
    const tx = await program.methods
      .finalizeResolution()
      .accounts({
        caller:   wallet.publicKey,
        market:   marketPDA,
        proposal: resolutionPDA,
      })
      .signers([wallet])
      .rpc();

    await confirmTx(connection, tx);

    console.log(`✅ Resolution finalized!`);
    console.log(`   TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    const market = await program.account.market.fetch(marketPDA);
    console.log(`   Status:  ${Object.keys(market.status)[0]}`);
    console.log(`   Winner:  ${Object.keys(market.winningOutcome ?? {})[0]}\n`);

  } catch (err: any) {
    if (err.message.includes("StillInChallengeWindow")) {
      console.log("⚠  Challenge window still open.");
      console.log("   On mainnet: wait 48h");
      console.log("   On Surfpool: use surfnet_warpToSlot");
      process.exit(0);
    }
    throw err;
  }

  // ── Step 2: Redeem YES buyer winnings ─────────────────────────
  console.log("Step 2: Redeeming YES buyer winnings...");

  const yesBuyer = anchor.web3.Keypair.fromSecretKey(
    Buffer.from(state.yesBuyerSecret)
  );

  const yesBuyerYesAccount = new anchor.web3.PublicKey(state.yesBuyerYesAccount);
  const yesBuyerUsdc       = new anchor.web3.PublicKey(state.yesBuyerUsdc);

  // Check YES token balance before redeem
  const beforeBalance = await connection.getTokenAccountBalance(yesBuyerYesAccount);
  const beforeUsdc    = await connection.getTokenAccountBalance(yesBuyerUsdc);

  console.log(`   YES tokens to burn: ${beforeBalance.value.uiAmount}`);
  console.log(`   USDC before:        ${beforeUsdc.value.uiAmount}`);

  try {
    const tx = await program.methods
      .redeemWinnings()
      .accounts({
        user:                  yesBuyer.publicKey,
        market:                marketPDA,
        winningMint:           yesMintPDA,
        userWinningAccount:    yesBuyerYesAccount,
        collateralVault:       vault,
        userCollateralAccount: yesBuyerUsdc,
        collateralMint:        usdcMint,
        tokenProgram:          TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:         anchor.web3.SystemProgram.programId,
      })
      .signers([yesBuyer])
      .rpc();

    const afterUsdc = await connection.getTokenAccountBalance(yesBuyerUsdc);
    const received  = Number(afterUsdc.value.amount) - Number(beforeUsdc.value.amount);

    console.log(`\n✅ Winnings redeemed!`);
    console.log(`   TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log(`   USDC received: ${received / 1_000_000}`);
    console.log(`   YES tokens burned: ${beforeBalance.value.uiAmount}`);

  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    if (err.logs) err.logs.forEach((l: string) => console.error(" ", l));
    process.exit(1);
  }

  // ── Step 3: Verify NO buyer can't redeem ──────────────────────
  console.log("\nStep 3: Verifying NO buyer is correctly rejected...");
  const noBuyer     = anchor.web3.Keypair.fromSecretKey(Buffer.from(state.noBuyerSecret));
  const noMintPDA   = new anchor.web3.PublicKey(state.noMintPDA ?? "");

  try {
    await program.methods
      .redeemWinnings()
      .accounts({
        user:                  noBuyer.publicKey,
        market:                marketPDA,
        winningMint:           noMintPDA,
        userWinningAccount:    new anchor.web3.PublicKey(state.noBuyerNoAccount),
        collateralVault:       vault,
        userCollateralAccount: new anchor.web3.PublicKey(state.noBuyerUsdc),
        collateralMint:        usdcMint,
        tokenProgram:          TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:         anchor.web3.SystemProgram.programId,
      })
      .signers([noBuyer])
      .rpc();

    console.log("❌ ERROR: NO buyer should have been rejected!");

  } catch {
    console.log("✅ NO buyer correctly rejected — losers cannot redeem\n");
  }

  console.log("════════════════════════════════════════════");
  console.log("🎉 FULL DEVNET LIFECYCLE COMPLETE");
  console.log("════════════════════════════════════════════");
  console.log(`Market:   ${state.question}`);
  console.log(`Outcome:  YES wins`);
  console.log(`Protocol: E7gRicDGMsBxtLd93eYT9dJkHwnAQ1EfpmgBuoUFXDsw`);
  console.log(`Network:  Solana Devnet\n`);
}

main();