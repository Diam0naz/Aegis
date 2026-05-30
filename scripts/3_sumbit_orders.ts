// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
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
} from "./setup";

// 3 tiers × 2 sides = 6 orders
const ORDERS = [
  { side: { yes: {} }, amount: 100_000_000,       label: "YES 100 USDC"     },
  { side: { no:  {} }, amount: 100_000_000,       label: "NO  100 USDC"     },
  { side: { yes: {} }, amount: 1_000_000_000,     label: "YES 1,000 USDC"   },
  { side: { no:  {} }, amount: 1_000_000_000,     label: "NO  1,000 USDC"   },
  { side: { yes: {} }, amount: 100_000_000_000,   label: "YES 100,000 USDC" },
  { side: { no:  {} }, amount: 100_000_000_000,   label: "NO  100,000 USDC" },
];

async function main() {
  const state = loadState();
  if (!state.marketPDA) { console.error("❌ No market. Run 1_create_market.ts first."); process.exit(1); }

  const wallet = loadWallet();
  const { program, connection, provider } = loadProgram(wallet);

  const marketPDA  = new anchor.web3.PublicKey(state.marketPDA);
  const usdcMint   = new anchor.web3.PublicKey(state.usdcMint);
  const yesMintPDA = new anchor.web3.PublicKey(state.yesMintPDA);
  const noMintPDA  = new anchor.web3.PublicKey(state.noMintPDA);
  const vault      = new anchor.web3.PublicKey(state.collateralVault);
  const mintAuth   = anchor.web3.Keypair.fromSecretKey(Buffer.from(state.usdcMintAuthority));

  console.log("\n📝 Submitting Orders to Aegis Market");
  console.log("─────────────────────────────────────");
  console.log(`Market: ${marketPDA.toBase58()}\n`);

  const savedTraders: Record<string, any> = {};

  for (let i = 0; i < ORDERS.length; i++) {
    const { side, amount, label } = ORDERS[i];
    const trader = anchor.web3.Keypair.generate();

    // Fund with SOL
    const solTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: trader.publicKey,
        lamports: 0.5 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(solTx, [wallet]);

    // Create USDC ATA and mint funds
    const traderUsdc = await getOrCreateAssociatedTokenAccount(connection, trader, usdcMint, trader.publicKey);
    await mintTo(connection, wallet, usdcMint, traderUsdc.address, mintAuth, amount);

    // Create outcome token ATA
    const isYes = Object.keys(side)[0] === "yes";
    const outcomeMint = isYes ? yesMintPDA : noMintPDA;
    const traderOutcomeAccount = await createAssociatedTokenAccount(connection, trader, outcomeMint, trader.publicKey);

    const orderPDA = getOrderPDA(marketPDA, trader.publicKey);

    console.log(`Submitting ${label}...`);
    const tx = await program.methods
      .submitOrder(side, new anchor.BN(amount), null)
      .accounts({
        user:                   trader.publicKey,
        market:                 marketPDA,
        batchOrder:             orderPDA,
        userCollateralAccount:  traderUsdc.address,
        collateralVault:        vault,
        collateralMint:         usdcMint,
        tokenProgram:           TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:          anchor.web3.SystemProgram.programId,
      })
      .signers([trader])
      .rpc();

    console.log(`✅ ${label} submitted — TX: ${tx}`);

    const key = `trader${i}`;
    savedTraders[key]                    = trader.publicKey.toBase58();
    savedTraders[`${key}Secret`]         = Array.from(trader.secretKey);
    savedTraders[`${key}OrderPDA`]       = orderPDA.toBase58();
    savedTraders[`${key}OutcomeAccount`] = traderOutcomeAccount.toBase58();
    savedTraders[`${key}Usdc`]           = traderUsdc.address.toBase58();
    savedTraders[`${key}Side`]           = Object.keys(side)[0];

    // Keep legacy keys for scripts 5/6 compatibility
    if (i === 0) {
      savedTraders.yesBuyer         = trader.publicKey.toBase58();
      savedTraders.yesBuyerSecret   = Array.from(trader.secretKey);
      savedTraders.yesBuyerOrderPDA = orderPDA.toBase58();
      savedTraders.yesBuyerYesAccount = traderOutcomeAccount.toBase58();
      savedTraders.yesBuyerUsdc     = traderUsdc.address.toBase58();
    }
    if (i === 1) {
      savedTraders.noBuyer         = trader.publicKey.toBase58();
      savedTraders.noBuyerSecret   = Array.from(trader.secretKey);
      savedTraders.noBuyerOrderPDA = orderPDA.toBase58();
      savedTraders.noBuyerNoAccount = traderOutcomeAccount.toBase58();
      savedTraders.noBuyerUsdc     = traderUsdc.address.toBase58();
    }
  }

  saveState(savedTraders);
  console.log(`\n💾 Trader state saved`);
  console.log(`   Run next: npx ts-node scripts/4_settle_batch.ts`);
}

main();
