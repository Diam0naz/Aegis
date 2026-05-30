// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import {
  loadWallet,
  loadProgram,
  getResolutionPDA,
  loadState,
  saveState,
  sleep,
  confirmTx,
} from "./setup";

async function main() {
  const state = loadState();
  if (!state.marketPDA) {
    console.error("❌ No market. Run previous scripts first.");
    process.exit(1);
  }

  const wallet = loadWallet();
  const { program, connection } = loadProgram(wallet);

  const marketPDA     = new anchor.web3.PublicKey(state.marketPDA);
  const resolutionPDA = getResolutionPDA(marketPDA);

  console.log("\n🔮 Proposing Market Resolution");
  console.log("─────────────────────────────────────");

  // Wait for resolution slot
  const market = await program.account.market.fetch(marketPDA);
  const currentSlot = await connection.getSlot();
  const slotsRemaining = market.resolutionSlot.toNumber() - currentSlot;

  if (slotsRemaining > 0) {
    console.log(`Resolution slot: ${market.resolutionSlot.toNumber()}`);
    console.log(`Current slot:    ${currentSlot}`);
    console.log(`Slots remaining: ${slotsRemaining}`);
    console.log(`Polling until resolution slot...`);
    const target = market.resolutionSlot.toNumber();
    let last = currentSlot;
    while (true) {
      await sleep(2000);
      const slot = await connection.getSlot();
      if (slot !== last) { process.stdout.write(`\r  Slot: ${slot} / ${target} (${Math.max(0, target - slot)} remaining)  `); last = slot; }
      if (slot >= target) { console.log("\n✓ Resolution slot reached"); break; }
    }
  }

  // Bond is paid in SOL lamports — minimum 0.001 SOL
  const bondAmount = 1_000_000; // 0.001 SOL

  console.log(`\nBond amount:   ${bondAmount / anchor.web3.LAMPORTS_PER_SOL} SOL`);
  console.log(`Proposing:     YES wins\n`);

  try {
    const tx = await program.methods
      .proposeResolution(true, new anchor.BN(bondAmount))
      .accounts({
        proposer:      wallet.publicKey,
        market:        marketPDA,
        proposal:      resolutionPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();

    console.log(`✅ Resolution proposed!`);
    console.log(`   TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log(`   Challenge window: 48 hours (432,000 slots)`);
    console.log(`   After window: run 6_finalize_and_redeem.ts\n`);

    saveState({ resolutionPDA: resolutionPDA.toBase58(), outcome: true });

  } catch (err: any) {
    console.error("❌ Failed:", err.message);
    if (err.logs) err.logs.forEach((l: string) => console.error(" ", l));
    process.exit(1);
  }
}

main();