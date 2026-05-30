import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";
import { AegisProject } from "../target/types/aegis_project";
import * as dotenv from "dotenv";
dotenv.config();

// ── Config ────────────────────────────────────────────────────────
export const RPC_URL =
  process.env.RPC_URL ||
  "https://solana-devnet.g.alchemy.com/v2/ZWjQI44Zts9k4I3GHXPrj";

export const WALLET_PATH =
  process.env.WALLET_PATH ||
  `${process.env.HOME}/.config/solana/devnet-wallet.json`;

export const PROGRAM_ID = new PublicKey(
  "FsG83myaVACEpxdy96ieCpVUAGgxVT5wq3T6nQxqPm9Y"
);

export const IDL_PATH = path.join(
  __dirname,
  "../target/idl/aegis_project.json"
);

// ── Helpers ───────────────────────────────────────────────────────
export function loadWallet(walletPath: string = WALLET_PATH): Keypair {
  const raw = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  return Keypair.fromSecretKey(Buffer.from(raw));
}

export function loadProgram(wallet: Keypair): {
  program: anchor.Program<AegisProject>;
  provider: anchor.AnchorProvider;
  connection: Connection;
} {
  const connection = new Connection(RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 120000,
  });
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed", skipPreflight: false, preflightCommitment: "confirmed" }
  );

  // Override sendAndConfirm to use HTTP polling instead of WebSocket
  // Helius HTTP endpoints don't support signatureSubscribe
  provider.sendAndConfirm = async (tx, signers, opts) => {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = wallet.publicKey;
    const allSigners = [wallet, ...(signers ?? [])];
    tx.sign(...allSigners);
    const raw = tx.serialize();
    const sig = await connection.sendRawTransaction(raw, { skipPreflight: opts?.skipPreflight ?? false });
    for (let i = 0; i < 30; i++) {
      const status = await connection.getSignatureStatus(sig);
      const conf = status?.value?.confirmationStatus;
      if (conf === "confirmed" || conf === "finalized") return sig;
      if (status?.value?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error(`Transaction ${sig} not confirmed after 60s`);
  };

  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  const program = new anchor.Program<AegisProject>(idl, provider);
  return { program, provider, connection };
}

export function hashQuestion(question: string): number[] {
  return Array.from(
    crypto.createHash("sha256").update(question).digest()
  );
}

// ── PDA Derivation ────────────────────────────────────────────────
export function getMarketPDA(
  authority: PublicKey,
  questionHash: number[]
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("market"),
      authority.toBuffer(),
      Buffer.from(questionHash),
    ],
    PROGRAM_ID
  )[0];
}

export function getYesMintPDA(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("yes_mint"), market.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getNoMintPDA(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("no_mint"), market.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getLpPoolPDA(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lp_pool"), market.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getLpMintPDA(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lp_mint"), market.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getOrderPDA(market: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), market.toBuffer(), user.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getResolutionPDA(market: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("resolution"), market.toBuffer()],
    PROGRAM_ID
  )[0];
}

// ── State file helpers ────────────────────────────────────────────
// Scripts save state between runs so each step knows the market PDA
const STATE_FILE = path.join(__dirname, ".devnet-state.json");

export function saveState(state: Record<string, any>) {
  const existing = loadState();
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ ...existing, ...state }, null, 2)
  );
}

// Appends a market PDA to the agents' markets.json watch files
export function registerMarketWithAgents(marketPDA: string) {
  const watchFiles = [
    path.join(__dirname, "../agents/crank_agent/markets.json"),
    path.join(__dirname, "../agents/oracle_agent/markets.json"),
  ];
  for (const file of watchFiles) {
    let data: { markets: string[] } = { markets: [] };
    try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
    if (!data.markets.includes(marketPDA)) {
      data.markets.push(marketPDA);
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log(`  📋 Registered in ${path.basename(path.dirname(file))}/markets.json`);
    }
  }
}

export function loadState(): Record<string, any> {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Polls via HTTP instead of WebSocket — works with HTTP-only RPC endpoints
export async function confirmTx(connection: Connection, sig: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    const status = await connection.getSignatureStatus(sig);
    const conf = status?.value?.confirmationStatus;
    if (conf === "confirmed" || conf === "finalized") return;
    if (status?.value?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    await sleep(2000);
  }
  throw new Error(`Transaction ${sig} not confirmed after 60s`);
}

// Sends a built transaction and confirms via HTTP polling (no WebSocket)
export async function sendTx(
  connection: Connection,
  tx: anchor.web3.Transaction,
  signers: Keypair[]
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = signers[0].publicKey;
  tx.sign(...signers);
  const raw = tx.serialize();
  const sig = await connection.sendRawTransaction(raw, { skipPreflight: false });
  await confirmTx(connection, sig);
  return sig;
}


// cp .env.devnet .env