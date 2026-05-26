// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  loadWallet,
  loadProgram,
  getOrderPDA,
  getYesMintPDA,
  getNoMintPDA,
  loadState,
  saveState,
  sleep,
  confirmTx,
} from "./setup";

async function main() {
  const state = loadState();
  if (!state.marketPDA) {
    console.error("❌ No market found. Run 1_create_market.ts first.");
    process.exit(1);
  }

  const wallet = loadWallet();
  const { program, connection, provider } = loadProgram(wallet);

  const marketPDA   = new anchor.web3.PublicKey(state.marketPDA);
  const usdcMint    = new anchor.web3.PublicKey(state.usdcMint);
  const yesMintPDA  = new anchor.web3.PublicKey(state.yesMintPDA);
  const noMintPDA   = new anchor.web3.PublicKey(state.noMintPDA);
  const vault       = new anchor.web3.PublicKey(state.collateralVault);

  console.log("\n📝 Submitting Orders to Aegis Market");
  console.log("─────────────────────────────────────");
  console.log(`Market: ${marketPDA.toBase58()}\n`);

  // Create two trader wallets from the main wallet
  // In production these would be different people
  const yesBuyer = anchor.web3.Keypair.generate();
  const noBuyer  = anchor.web3.Keypair.generate();

  // Fund trader wallets with SOL for rent (transfer from main wallet — works on devnet)
  console.log("Funding trader wallets...");
  for (const trader of [yesBuyer, noBuyer]) {
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: trader.publicKey,
        lamports: 0.5 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx, [wallet]);
  }

  // Create USDC accounts for traders
  const yesBuyerUsdc = await getOrCreateAssociatedTokenAccount(
    connection, yesBuyer, usdcMint, yesBuyer.publicKey
  );
  const noBuyerUsdc = await getOrCreateAssociatedTokenAccount(
    connection, noBuyer, usdcMint, noBuyer.publicKey
  );

  // Fund with USDC from main wallet (we are the mint authority on localnet)
  console.log("Funding traders with USDC...");
  const mintAuthority = anchor.web3.Keypair.fromSecretKey(Buffer.from(state.usdcMintAuthority));
  await mintTo(connection, wallet, usdcMint, yesBuyerUsdc.address, mintAuthority, 10_000_000); // 10 USDC
  await mintTo(connection, wallet, usdcMint, noBuyerUsdc.address,  mintAuthority, 10_000_000); // 10 USDC

  // Create outcome token accounts for traders
  const yesBuyerYesAccount = await createAssociatedTokenAccount(
    connection, yesBuyer, yesMintPDA, yesBuyer.publicKey
  );
  const noBuyerNoAccount = await createAssociatedTokenAccount(
    connection, noBuyer, noMintPDA, noBuyer.publicKey
  );

  // Order PDAs
  const yesBuyerOrderPDA = getOrderPDA(marketPDA, yesBuyer.publicKey);
  const noBuyerOrderPDA  = getOrderPDA(marketPDA, noBuyer.publicKey);

  // ── Submit YES order ──────────────────────────────────────────
  console.log("\nSubmitting YES order (200 USDC)...");
  const yesTx = await program.methods
    .submitOrder({ yes: {} }, new anchor.BN(2_000_000)) // 2 USDC
    .accounts({
      user:                   yesBuyer.publicKey,
      market:                 marketPDA,
      batchOrder:             yesBuyerOrderPDA,
      userCollateralAccount:  yesBuyerUsdc.address,
      collateralVault:        vault,
      collateralMint:         usdcMint,
      tokenProgram:           TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram:          anchor.web3.SystemProgram.programId,
    })
    .signers([yesBuyer])
    .rpc();

  console.log(`✅ YES order submitted`);
  console.log(`   TX: https://explorer.solana.com/tx/${yesTx}?cluster=devnet`);

  // ── Submit NO order ───────────────────────────────────────────
  console.log("\nSubmitting NO order (150 USDC)...");
  const noTx = await program.methods
    .submitOrder({ no: {} }, new anchor.BN(2_000_000)) // 2 USDC
    .accounts({
      user:                   noBuyer.publicKey,
      market:                 marketPDA,
      batchOrder:             noBuyerOrderPDA,
      userCollateralAccount:  noBuyerUsdc.address,
      collateralVault:        vault,
      collateralMint:         usdcMint,
      tokenProgram:           TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram:          anchor.web3.SystemProgram.programId,
    })
    .signers([noBuyer])
    .rpc();

  console.log(`✅ NO order submitted`);
  console.log(`   TX: https://explorer.solana.com/tx/${noTx}?cluster=devnet`);

  // Save trader state for settle script
  saveState({
    yesBuyer:             yesBuyer.publicKey.toBase58(),
    yesBuyerSecret:       Array.from(yesBuyer.secretKey),
    yesBuyerOrderPDA:     yesBuyerOrderPDA.toBase58(),
    yesBuyerYesAccount:   yesBuyerYesAccount.toBase58(),
    yesBuyerUsdc:         yesBuyerUsdc.address.toBase58(),
    noBuyer:              noBuyer.publicKey.toBase58(),
    noBuyerSecret:        Array.from(noBuyer.secretKey),
    noBuyerOrderPDA:      noBuyerOrderPDA.toBase58(),
    noBuyerNoAccount:     noBuyerNoAccount.toBase58(),
    noBuyerUsdc:          noBuyerUsdc.address.toBase58(),
  });

  console.log(`\n💾 Trader state saved`);
  console.log(`   Run next: npx ts-node scripts/4_settle_batch.ts`);
}

main();