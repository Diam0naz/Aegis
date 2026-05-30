"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleAgent = void 0;
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const market_registry_1 = require("./market-registry");
const pyth_1 = require("./resolvers/pyth");
const sports_1 = require("./resolvers/sports");
const custom_1 = require("./resolvers/custom");
dotenv_1.default.config({ path: path.resolve(__dirname, "../.env"), override: true });
const rpcUrl = process.env["RPC_URL"] || "http://127.0.0.1:8899";
const oracleKeypair = process.env["ORACLE_KEYPAIR"];
// ── Constants ─────────────────────────────────────────────────────────────
const DEFAULT_BOND_LAMPORTS = 10_000_000;
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
class OracleAgent {
    connection;
    program;
    wallet;
    processedMarkets = new Set();
    constructor(connection, program, wallet) {
        this.connection = connection;
        this.program = program;
        this.wallet = wallet;
    }
    /**
     * Replaces watchMarkets().
     * Uses a polling loop instead of WebSocket subscriptions.
     */
    async startPolling() {
        console.log("Oracle Agent started — Polling for resolvable markets every 5s");
        setInterval(async () => {
            try {
                await this.checkMarkets();
            }
            catch (err) {
                console.error("Error during market check loop:", err);
            }
        }, POLL_INTERVAL_MS);
    }
    async checkMarkets() {
        // getProgramAccounts is proxied to mainnet by Surfpool and gets rate-limited.
        // Instead, load known market addresses from the WATCH_MARKETS env var or
        // a markets.json file (same approach as the crank agent).
        const marketAddresses = this.getKnownMarketAddresses();
        if (marketAddresses.length === 0) {
            console.log("  ⚠ No markets to watch. Set WATCH_MARKETS env var or create markets.json");
            return;
        }
        const currentSlot = await this.connection.getSlot();
        console.log(`\n🔍 Oracle check loop - Current slot: ${currentSlot}`);
        let activeMarkets = 0;
        let readyForResolution = 0;
        for (const addrStr of marketAddresses) {
            try {
                const publicKey = new web3_js_1.PublicKey(addrStr);
                const account = await this.program.account["market"].fetch(publicKey);
                const status = Object.keys(account.status)[0];
                const resolutionSlot = account.resolutionSlot.toNumber();
                const blocksRemaining = Math.max(0, resolutionSlot - currentSlot);
                // Log market status
                const marketId = publicKey.toBase58().slice(0, 8);
                let statusIndicator = "";
                if (status === "resolved") {
                    statusIndicator = "✅ [RESOLVED]";
                }
                else if (currentSlot >= resolutionSlot) {
                    statusIndicator = "🔴 [READY_FOR_RESOLUTION]";
                    readyForResolution++;
                }
                else {
                    statusIndicator = "🟢 [ACTIVE]";
                    activeMarkets++;
                }
                console.log(`  ${statusIndicator} Market ${marketId}... | Resolution slot: ${resolutionSlot} | Blocks remaining: ${blocksRemaining}`);
                const isPastResolution = currentSlot >= resolutionSlot;
                const isNotResolved = status !== "resolved";
                if (isPastResolution &&
                    isNotResolved &&
                    !this.processedMarkets.has(publicKey.toBase58())) {
                    console.log(`📋 Market ${publicKey.toBase58()} is ready for resolution.`);
                    await this.handleResolution(account, publicKey);
                }
            }
            catch (err) {
                console.error(`  ✗ Error checking market ${addrStr}:`, err.message);
            }
        }
        console.log(`📊 Summary: ${activeMarkets} active, ${readyForResolution} ready for resolution`);
    }
    getKnownMarketAddresses() {
        const addresses = [];
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
        }
        catch {
            // File not found — that's fine
        }
        return [...new Set(addresses)]; // deduplicate
    }
    async handleResolution(market, marketPubkey) {
        // Avoid double-processing in the same session
        this.processedMarkets.add(marketPubkey.toBase58());
        console.log(`🎯 Resolving market ${marketPubkey.toBase58().slice(0, 8)}...`);
        try {
            const outcome = await this.determineOutcome(market.questionHash, marketPubkey);
            console.log(`📊 Resolution data queried successfully`);
            console.log(`🎲 Decided outcome: ${outcome ? "YES" : "NO"}`);
            await this.proposeResolution(marketPubkey, outcome);
        }
        catch (err) {
            console.error(`❌ Failed to resolve market: ${err.message}`);
            // Remove from processed set to allow retry
            this.processedMarkets.delete(marketPubkey.toBase58());
        }
    }
    async proposeResolution(marketPubkey, outcome, bondLamports = DEFAULT_BOND_LAMPORTS) {
        const [proposalPDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("resolution"), marketPubkey.toBuffer()], this.program.programId);
        try {
            // Use standard getAccountInfo (HTTP) to check existence
            const existing = await this.connection.getAccountInfo(proposalPDA);
            if (existing)
                return;
            const tx = await this.program.methods
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
        }
        catch (err) {
            this.processedMarkets.delete(marketPubkey.toBase58()); // Allow retry on failure
            console.error(`✗ Propose failed for ${marketPubkey.toBase58()}:`, err.message);
        }
    }
    scheduleFinalization(marketPubkey, proposalPDA) {
        // Note: In a real polling agent, you'd store this in a DB and
        // poll for "Ready to Finalize" status instead of using setTimeout.
        console.log(`  Finalization window open for ${marketPubkey.toBase58()}`);
    }
    async determineOutcome(hash, pubkey) {
        // Convert hash array to hex string for registry lookup
        const hashHex = Buffer.from(hash).toString("hex");
        // First try exact match
        let source = market_registry_1.MARKET_REGISTRY[hashHex];
        // If no exact match, try prefix/truncated matching
        if (!source) {
            for (const [registryHash, registrySource] of Object.entries(market_registry_1.MARKET_REGISTRY)) {
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
            throw new Error(`No data source registered for market ${pubkey.toBase58()} — hash: ${hashHex}`);
        }
        console.log(`  📡 Resolving market: type=${source.type}`);
        switch (source.type) {
            case "pyth":
                console.log(`  📈 Pyth query: feedId=${source.feedId.slice(0, 8)}..., strike=${source.strike}, above=${source.above}`);
                return (0, pyth_1.resolvePythMarket)(source.feedId, source.strike, source.above);
            case "sports":
                console.log(`  🏈 Sports query: league=${source.league}, teamId=${source.teamId}`);
                return (0, sports_1.resolveSportsMarket)(source.league, source.teamId);
            case "custom":
                console.log(`  🌐 Custom API query: endpoint=${source.endpoint}, path=${source.jsonPath}, expected=${source.expectedValue}`);
                return (0, custom_1.resolveCustomMarket)(source.endpoint, source.jsonPath, source.expectedValue);
            default:
                throw new Error(`Unknown data source type`);
        }
    }
}
exports.OracleAgent = OracleAgent;
// ── Entry Point ───────────────────────────────────────────────────────────
async function main() {
    if (!oracleKeypair)
        throw new Error("ORACLE_KEYPAIR env var required");
    // HTTP Connection only - no WebSocket endpoint needed
    const connection = new web3_js_1.Connection(process.env["RPC_URL"] ?? "http://127.0.0.1:8899", "confirmed");
    const secretKey = Uint8Array.from(JSON.parse(oracleKeypair));
    const wallet = web3_js_1.Keypair.fromSecretKey(secretKey);
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
    const idlPath = process.env["IDL_PATH"] || "../../target/idl/aegis_project.json";
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const program = new anchor.Program(idl, provider);
    const agent = new OracleAgent(connection, program, wallet);
    // Start the polling loop
    await agent.startPolling();
}
main().catch(console.error);
