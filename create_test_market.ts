// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as crypto from "crypto";
import * as fs from "fs";

// Load IDL and setup
const idl = JSON.parse(fs.readFileSync("target/idl/aegis_project.json", "utf8"));
const connection = new anchor.web3.Connection("http://127.0.0.1:8899", "confirmed");

async function createTestMarket() {
  // Load wallet
  const keypairData = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8"));
  const wallet = Keypair.fromSecretKey(Buffer.from(keypairData));
  
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  
  const program = new anchor.Program(idl, provider);
  
  // Airdrop SOL if needed
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < LAMPORTS_PER_SOL) {
      console.log("Requesting airdrop...");
      await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (e) {
    console.log("Airdrop failed, continuing...");
  }

  // Create USDC mint
  const usdcMint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    6
  );
  
  console.log("USDC Mint:", usdcMint.toBase58());

  // Create market
  const questionText = "Will BTC hit $200k by end of 2025?";
  const questionHash = Array.from(crypto.createHash("sha256").update(questionText).digest());
  
  const [marketPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), wallet.publicKey.toBuffer(), Buffer.from(questionHash)],
    program.programId
  );

  const [lpPoolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("lp_pool"), marketPDA.toBuffer()],
    program.programId
  );

  const [yesMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("yes_mint"), marketPDA.toBuffer()],
    program.programId
  );

  const [noMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("no_mint"), marketPDA.toBuffer()],
    program.programId
  );

  const collateralVault = getAssociatedTokenAddressSync(usdcMint, marketPDA, true);

  // Get current slot and set resolution 100 slots in the future
  const currentSlot = await connection.getSlot();
  const resolutionSlot = currentSlot + 100;

  try {
    const tx = await program.methods
      .createMarket(
        questionHash,
        new BN(5000), // b_param: 50%
        new BN(8),    // batch_window_slots: 8 slots (~3.2 seconds)
        new BN(resolutionSlot),
        200,          // fee_bps: 2%
        50            // creator_fee_bps: 0.5%
      )
      .accounts({
        authority: wallet.publicKey,
        market: marketPDA,
        yesMint: yesMintPDA,
        noMint: noMintPDA,
        collateralMint: usdcMint,
        collateralVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Market created!");
    console.log("Market PDA:", marketPDA.toBase58());
    console.log("Resolution Slot:", resolutionSlot);
    console.log("Current Slot:", currentSlot);
    console.log("TX:", tx);

    // Update markets.json
    const marketsConfig = {
      markets: [marketPDA.toBase58()]
    };
    
    fs.writeFileSync("agents/crank_agent/markets.json", JSON.stringify(marketsConfig, null, 2));
    
    // Update agent .env files
    const oracleEnv = fs.readFileSync("agents/oracle_agent/.env", "utf8");
    const updatedOracleEnv = oracleEnv.replace(
      /WATCH_MARKETS=.*/,
      `WATCH_MARKETS=${marketPDA.toBase58()}`
    );
    fs.writeFileSync("agents/oracle_agent/.env", updatedOracleEnv);
    
    const crankEnv = fs.readFileSync("agents/crank_agent/.env", "utf8");
    const updatedCrankEnv = crankEnv.replace(
      /WATCH_MARKET=.*/,
      `WATCH_MARKET=${marketPDA.toBase58()}`
    );
    fs.writeFileSync("agents/crank_agent/.env", updatedCrankEnv);
    
    console.log("✅ Updated agent configurations");
    
    return marketPDA;
    
  } catch (error) {
    console.error("❌ Failed to create market:", error);
    throw error;
  }
}

createTestMarket().catch(console.error);