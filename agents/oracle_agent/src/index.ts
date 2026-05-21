import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { MARKET_REGISTRY, type DataSource } from "./market-registry";
import { resolvePythMarket } from "./resolvers/pyth";
import { resolveSportsMarket } from "./resolvers/sports";
import { resolveCustomMarket } from "./resolvers/custom";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const rpcUrl = process.env["RPC_URL"] || "http://127.0.0.1:8899";
const oracleKeypair = process.env["ORACLE_KEYPAIR"];

// ── Constants ─────────────────────────────────────────────────────────────
const DEFAULT_BOND_LAMPORTS = 10_000_000;
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

export class OracleAgent {
  private connection: Connection;
  private program: Program;
  private wallet: Keypair;
  private processedMarkets: Set<string> = new Set();

  constructor(connection: Connection, program: Program, wallet: Keypair) {
    this.connection = connection;
    this.program = program;
    this.wallet = wallet;
  }

  /**
   * Replaces watchMarkets().
   * Uses a polling loop instead of WebSocket subscriptions.
   */
  async startPolling() {
    console.log(
      "Oracle Agent started — Polling for resolvable markets every 5s",
    );

    setInterval(async () => {
      try {
        await this.checkMarkets();
      } catch (err) {
        console.error("Error during market check loop:", err);
      }
    }, POLL_INTERVAL_MS);
  }

  private async checkMarkets() {
    // 1. Fetch all market accounts for this program
    const markets = await (this.program.account as any)["market"].all();
    const currentSlot = await this.connection.getSlot();

    for (const { publicKey, account } of markets) {
      const status = Object.keys(account.status)[0];

      // 2. Logic: Needs resolution?
      const isPastResolution = currentSlot >= account.resolutionSlot.toNumber();
      const isNotResolved = status !== "resolved";

      if (
        isPastResolution &&
        isNotResolved &&
        !this.processedMarkets.has(publicKey.toBase58())
      ) {
        console.log(`Market ${publicKey.toBase58()} is ready for resolution.`);
        await this.handleResolution(account, publicKey);
      }
    }
  }

  private async handleResolution(market: any, marketPubkey: PublicKey) {
    // Avoid double-processing in the same session
    this.processedMarkets.add(marketPubkey.toBase58());

    const outcome = await this.determineOutcome(
      market.questionHash,
      marketPubkey,
    );
    await this.proposeResolution(marketPubkey, outcome);
  }

  async proposeResolution(
    marketPubkey: PublicKey,
    outcome: boolean,
    bondLamports: number = DEFAULT_BOND_LAMPORTS,
  ) {
    const [proposalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("resolution"), marketPubkey.toBuffer()],
      this.program.programId,
    );

    try {
      // Use standard getAccountInfo (HTTP) to check existence
      const existing = await this.connection.getAccountInfo(proposalPDA);
      if (existing) return;

      const tx = await (this.program.methods as any)
        .proposeResolution(outcome, new anchor.BN(bondLamports))
        .accounts({
          proposer: this.wallet.publicKey,
          market: marketPubkey,
          proposal: proposalPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([this.wallet])
        .rpc();

      console.log(`✓ Resolution proposed: ${tx.slice(0, 8)}...`);

      // For local testing on Surfnet, we don't wait 48h.
      // We just log it. You can manually warp slots via RPC if needed.
      this.scheduleFinalization(marketPubkey, proposalPDA);
    } catch (err: any) {
      this.processedMarkets.delete(marketPubkey.toBase58()); // Allow retry on failure
      console.error(
        `✗ Propose failed for ${marketPubkey.toBase58()}:`,
        err.message,
      );
    }
  }

  private scheduleFinalization(
    marketPubkey: PublicKey,
    proposalPDA: PublicKey,
  ) {
    // Note: In a real polling agent, you'd store this in a DB and
    // poll for "Ready to Finalize" status instead of using setTimeout.
    console.log(`  Finalization window open for ${marketPubkey.toBase58()}`);
  }

  protected async determineOutcome(
    hash: number[],
    pubkey: PublicKey,
  ): Promise<boolean> {
    // Convert hash array to hex string for registry lookup
    const hashHex = Buffer.from(hash).toString("hex");

    const source = MARKET_REGISTRY[hashHex];

    if (!source) {
      throw new Error(
        `No data source registered for market ${pubkey.toBase58()} — hash: ${hashHex}`,
      );
    }

    console.log(`  Resolving market: type=${source.type}`);

    switch (source.type) {
      case "pyth":
        return resolvePythMarket(source.feedId, source.strike, source.above);

      case "sports":
        return resolveSportsMarket(source.league, source.teamId);

      case "custom":
        return resolveCustomMarket(
          source.endpoint,
          source.jsonPath,
          source.expectedValue,
        );

      default:
        throw new Error(`Unknown data source type`);
    }
  }
}

// ── Entry Point ───────────────────────────────────────────────────────────

async function main() {
  if (!oracleKeypair) throw new Error("ORACLE_KEYPAIR env var required");

  // HTTP Connection only - no WebSocket endpoint needed
  const connection = new Connection(
    process.env["RPC_URL"] ?? "http://127.0.0.1:8899",
    "confirmed",
  );

  const secretKey = Uint8Array.from(JSON.parse(oracleKeypair));
  const wallet = Keypair.fromSecretKey(secretKey);

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" },
  );

  const idlPath =
    process.env["IDL_PATH"] || "../../target/idl/aegis_project.json";
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl, provider);

  const agent = new OracleAgent(connection, program, wallet);

  // Start the polling loop
  await agent.startPolling();
}

main().catch(console.error);
