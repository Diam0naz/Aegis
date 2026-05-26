// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  loadWallet,
  loadProgram,
  getLpPoolPDA,
  getYesMintPDA,
  getNoMintPDA,
  loadState,
  sleep,
  confirmTx,
} from "./setup";

async function main() {
  const state = loadState();
  if (!state.marketPDA || !state.yesBuyerOrderPDA) {
    console.error("❌ Missing state. Run previous scripts first.");
    process.exit(1);
  }

  const wallet = loadWallet();
  const { program, connection } = loadProgram(wallet);

  const marketPDA  = new anchor.web3.PublicKey(state.marketPDA);
  const usdcMint   = new anchor.web3.PublicKey(state.usdcMint);
  const vault      = new anchor.web3.PublicKey(state.collateralVault);
  const lpPoolPDA  = getLpPoolPDA(marketPDA);
  const yesMintPDA = getYesMintPDA(marketPDA);
  const noMintPDA  = getNoMintPDA(marketPDA);

  console.log("\n⚙  Settling Batch");
  console.log("─────────────────────────────────────");

  // Wait for batch window to close (8 slots = ~3.2s, wait 10s to be safe)
  console.log("Waiting 10s for batch window to close...");
  await sleep(10000);

  // Creator fee account — wallet's own USDC ATA (authority set at market creation)
  const creatorFeeAccount = getAssociatedTokenAddressSync(usdcMint, wallet.publicKey, false);

  // Build remaining accounts (interleaved pairs)
  const remainingAccounts = [
    { pubkey: new anchor.web3.PublicKey(state.yesBuyerOrderPDA),   isSigner: false, isWritable: true },
    { pubkey: new anchor.web3.PublicKey(state.yesBuyerYesAccount), isSigner: false, isWritable: true },
    { pubkey: new anchor.web3.PublicKey(state.noBuyerOrderPDA),    isSigner: false, isWritable: true },
    { pubkey: new anchor.web3.PublicKey(state.noBuyerNoAccount),   isSigner: false, isWritable: true },
  ];

  try {
    const tx = await program.methods
      .settleBatch()
      .accounts({
        cranker:                wallet.publicKey,
        market:                 marketPDA,
        lpPool:                 lpPoolPDA,
        yesMint:                yesMintPDA,
        noMint:                 noMintPDA,
        collateralVault:        vault,
        creatorFeeAccount,
        collateralMint:         usdcMint,
        tokenProgram:           TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:          anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .signers([wallet])
      .rpc();

    console.log(`✅ Batch settled!`);
    console.log(`   TX: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    // Check token balances
    const yesBalance = await connection.getTokenAccountBalance(
      new anchor.web3.PublicKey(state.yesBuyerYesAccount)
    );
    const noBalance = await connection.getTokenAccountBalance(
      new anchor.web3.PublicKey(state.noBuyerNoAccount)
    );

    console.log(`✓ YES tokens minted: ${yesBalance.value.uiAmount}`);
    console.log(`✓ NO tokens minted:  ${noBalance.value.uiAmount}`);
    console.log(`\n   Run next: npx ts-node scripts/5_resolve_market.ts`);

  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    if (err.logs) err.logs.forEach((l: string) => console.error(" ", l));
    process.exit(1);
  }
}

main();