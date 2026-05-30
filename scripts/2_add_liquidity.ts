// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  loadWallet,
  loadProgram,
  getLpPoolPDA,
  getLpMintPDA,
  loadState,
  saveState,
  confirmTx,
} from "./setup";

const LIQUIDITY_AMOUNT = 5_000_000_000_000; // 5,000,000 USDC

async function main() {
  const state = loadState();
  if (!state.marketPDA) {
    console.error("❌ No market found. Run 1_create_market.ts first.");
    process.exit(1);
  }

  const wallet = loadWallet();
  const { program, connection } = loadProgram(wallet);

  const marketPDA  = new anchor.web3.PublicKey(state.marketPDA);
  const usdcMint   = new anchor.web3.PublicKey(state.usdcMint);
  const lpPoolPDA  = getLpPoolPDA(marketPDA);
  const lpMintPDA  = getLpMintPDA(marketPDA);

  console.log("\n💧 Adding Liquidity to Aegis Market");
  console.log("─────────────────────────────────────");
  console.log(`Market:   ${marketPDA.toBase58()}`);
  console.log(`Amount:   ${LIQUIDITY_AMOUNT / 1_000_000} USDC`);
  console.log(`LP:       ${wallet.publicKey.toBase58()}\n`);

  // Get or create LP's USDC account
  const lpUsdcAccount = await getOrCreateAssociatedTokenAccount(
    connection, wallet, usdcMint, wallet.publicKey
  );

  // Mint USDC to wallet if needed (localnet — we are the mint authority)
  if (Number(lpUsdcAccount.amount) < LIQUIDITY_AMOUNT) {
    console.log(`Minting ${LIQUIDITY_AMOUNT / 1_000_000} USDC to wallet...`);
    await mintTo(connection, wallet, usdcMint, lpUsdcAccount.address, wallet, LIQUIDITY_AMOUNT);
  }

  console.log(`LP USDC balance: ${LIQUIDITY_AMOUNT / 1_000_000} USDC (minted)`);

  // Get or create LP token account
  const lpTokenAccount = getAssociatedTokenAddressSync(
    lpMintPDA, wallet.publicKey, false
  );
  const collateralVault = new anchor.web3.PublicKey(state.collateralVault);

  try {
    const tx = await program.methods
      .addLiquidity(new anchor.BN(LIQUIDITY_AMOUNT))
      .accounts({
        lp:                     wallet.publicKey,
        market:                 marketPDA,
        lpPool:                 lpPoolPDA,
        lpMint:                 lpMintPDA,
        lpCollateralAccount:    lpUsdcAccount.address,
        collateralVault,
        lpTokenAccount,
        collateralMint:         usdcMint,
        tokenProgram:           TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:          anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();

    console.log(`✅ Liquidity added!`);
    console.log(`   TX: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    const lpPool = await program.account.lpPool.fetch(lpPoolPDA);
    console.log(`✓ Pool liquidity: ${lpPool.totalLiquidity.toNumber() / 1_000_000} USDC`);
    console.log(`✓ LP supply:      ${lpPool.totalLpSupply.toNumber() / 1_000_000} tokens`);

    saveState({
      lpPoolPDA:      lpPoolPDA.toBase58(),
      lpMintPDA:      lpMintPDA.toBase58(),
      lpTokenAccount: lpTokenAccount.toBase58(),
      lpUsdcAccount:  lpUsdcAccount.address.toBase58(),
    });

    console.log(`\n   Run next: npx ts-node scripts/3_submit_orders.ts`);

  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    if (err.logs) err.logs.forEach((l: string) => console.error(" ", l));
    process.exit(1);
  }
}

main();