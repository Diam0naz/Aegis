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
    // getProgramAccounts is proxied to mainnet by Surfpool and gets rate-limited.
    // Instead, load known market addresses from the WATCH_MARKETS env var or
    // a markets.json file (same approach as the crank agent).
    const marketAddresses = this.getKnownMarketAddresses();

    if (marketAddresses.length === 0) {
      console.log(
        "  ⚠ No markets to watch. Set WATCH_MARKETS env var or create markets.json",
      );
      return;
    }

    const currentSlot = await this.connection.getSlot();
    console.log(`\n🔍 Oracle check loop - Current slot: ${currentSlot}`);

    let activeMarkets = 0;
    let readyForResolution = 0;

    for (const addrStr of marketAddresses) {
      try {
        const publicKey = new PublicKey(addrStr);
        const account = await (this.program.account as any)["market"].fetch(
          publicKey,
        );
        const status = Object.keys(account.status)[0];
        const resolutionSlot = account.resolutionSlot.toNumber();
        const blocksRemaining = Math.max(0, resolutionSlot - currentSlot);

        // Log market status
        const marketId = publicKey.toBase58().slice(0, 8);
        let statusIndicator = "";
        
        if (status === "resolved") {
          statusIndicator = "✅ [RESOLVED]";
        } else if (currentSlot >= resolutionSlot) {
          statusIndicator = "🔴 [READY_FOR_RESOLUTION]";
          readyForResolution++;
        } else {
          statusIndicator = "🟢 [ACTIVE]";
          activeMarkets++;
        }

        console.log(`  ${statusIndicator} Market ${marketId}... | Resolution slot: ${resolutionSlot} | Blocks remaining: ${blocksRemaining}`);

        const isPastResolution = currentSlot >= resolutionSlot;
        const isNotResolved = status !== "resolved";

        if (
          isPastResolution &&
          isNotResolved &&
          !this.processedMarkets.has(publicKey.toBase58())
        ) {
          console.log(
            `📋 Market ${publicKey.toBase58()} is ready for resolution.`,
          );
          await this.handleResolution(account, publicKey);
        }
      } catch (err: any) {
        console.error(`  ✗ Error checking market ${addrStr}:`, err.message);
      }
    }

    console.log(`📊 Summary: ${activeMarkets} active, ${readyForResolution} ready for resolution`);
  }

  private getKnownMarketAddresses(): string[] {
    const addresses: string[] = [];

    // 1. From WATCH_MARKETS env var (comma-separated)
    const envMarkets = process.env["WATCH_MARKETS"];
    if (envMarkets) {
      addresses.push(...envMarkets.split(",").map((s) => s.trim()));
    }

    // 2. From markets.json file (same format as crank agent)
    try {
      const marketsPath = process.env["MARKETS_FILE"] || "../crank_agent/markets.json";
      const data = JSON.parse(fs.readFileSync(marketsPath, "utf8"));
      if (Array.isArray(data.markets)) {
        addresses.push(...data.markets);
      }
    } catch {
      // File not found — that's fine
    }

    return [...new Set(addresses)]; // deduplicate
  }

  private async handleResolution(market: any, marketPubkey: PublicKey) {
    // Avoid double-processing in the same session
    this.processedMarkets.add(marketPubkey.toBase58());

    console.log(`🎯 Resolving market ${marketPubkey.toBase58().slice(0, 8)}...`);
    
    try {
      const outcome = await this.determineOutcome(
        market.questionHash,
        marketPubkey,
      );
      
      console.log(`📊 Resolution data queried successfully`);
      console.log(`🎲 Decided outcome: ${outcome ? "YES" : "NO"}`);
      
      await this.proposeResolution(marketPubkey, outcome);
    } catch (err: any) {
      console.error(`❌ Failed to resolve market: ${err.message}`);
      // Remove from processed set to allow retry
      this.processedMarkets.delete(marketPubkey.toBase58());
    }
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

    // First try exact match
    let source = MARKET_REGISTRY[hashHex];
    
    // If no exact match, try prefix/truncated matching
    if (!source) {
      for (const [registryHash, registrySource] of Object.entries(MARKET_REGISTRY)) {
        // Check if the registry hash is a prefix of the full hash
        // or if the full hash starts with the registry hash (truncated match)
        if (hashHex.startsWith(registryHash) || registryHash.endsWith("...") && hashHex.startsWith(registryHash.replace("...", ""))) {
          source = registrySource;
          console.log(`  🔍 Found truncated hash match: ${registryHash} -> ${hashHex.slice(0, 8)}...`);
          break;
        }
      }
    }

    if (!source) {
      throw new Error(
        `No data source registered for market ${pubkey.toBase58()} — hash: ${hashHex}`,
      );
    }

    console.log(`  📡 Resolving market: type=${source.type}`);

    switch (source.type) {
      case "pyth":
        console.log(`  📈 Pyth query: feedId=${source.feedId.slice(0, 8)}..., strike=${source.strike}, above=${source.above}`);
        return resolvePythMarket(source.feedId, source.strike, source.above);

      case "sports":
        console.log(`  🏈 Sports query: league=${source.league}, teamId=${source.teamId}`);
        return resolveSportsMarket(source.league, source.teamId);

      case "custom":
        console.log(`  🌐 Custom API query: endpoint=${source.endpoint}, path=${source.jsonPath}, expected=${source.expectedValue}`);
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
