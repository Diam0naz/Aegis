import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";
import { configDotenv } from "dotenv";
import bs58Encode from "bs58";
import { createRequire } from "module";

// Load this agent's own .env, overriding any parent .env already in the environment
const _require = createRequire(import.meta.url);
const _envPath = new URL("../.env", import.meta.url).pathname;
configDotenv({ path: _envPath, override: true });

// ── Config ────────────────────────────────────────────────────────

const idlPath =
  process.env["IDL_PATH"] || "../../target/idl/aegis_project.json";
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
const RPC_URL = process.env["RPC_URL"] || "http://127.0.0.1:8899";
const KEYPAIR_PATH =
  process.env["KEYPAIR_PATH"] ||
  `${process.env["HOME"]}/.config/solana/id.json`;
const POLL_INTERVAL = Number(process.env["POLL_INTERVAL_MS"]) || 1000; // 1s
const MAX_ORDERS = 50;
const PROGRAM_ID = new PublicKey(idl.address);

// Market size constant — must match programs/aegis_project/src/state/market.rs::Market::LEN
const MARKET_SIZE = 276;

// ── PDA Helpers ───────────────────────────────────────────────────
function getMarketPDA(
  authority: PublicKey,
  questionHash: Buffer,
  programId: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), authority.toBuffer(), questionHash],
    programId,
  )[0];
}

function getLpPoolPDA(market: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lp_pool"), market.toBuffer()],
    programId,
  )[0];
}

function getOrderPDA(
  market: PublicKey,
  user: PublicKey,
  programId: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), market.toBuffer(), user.toBuffer()],
    programId,
  )[0];
}

async function loadAllActiveMarkets(program: anchor.Program<any>) {
  // getProgramAccounts is proxied to mainnet by Surfpool and gets rate-limited (429).
  // Instead, load known market addresses from the WATCH_MARKET env var or markets.json.
  // The crank's loadMarketsFromFile() handles markets.json — this function just returns
  // any addresses from the WATCH_MARKET env var so they get pre-registered.
  const addresses: string[] = [];

  if (process.env["WATCH_MARKET"]) {
    addresses.push(process.env["WATCH_MARKET"]);
  }

  if (addresses.length > 0) {
    console.log(`✓ Loaded ${addresses.length} market(s) from env.`);
  } else {
    console.log("  No WATCH_MARKET env var set — using markets.json only.");
  }

  return addresses;
}

export class CrankAgent {
  private connection: Connection;
  private program: any;
  private wallet: Keypair;
  private running: boolean = false;
  private settled: number = 0;
  private failed: number = 0;
  private settling = new Set<string>();

  constructor(
    connection: Connection,
    // wsConnection param removed as it is unsupported by Surfpool
    program: any,
    wallet: Keypair,
  ) {
    this.connection = connection;
    this.program = program;
    this.wallet = wallet;
  }
  async start() {
    this.running = true;
    console.log(`\n🔧 Aegis Crank Agent (Polling Mode)`);
    console.log(`   RPC:     ${RPC_URL}`);
    console.log(`   Wallet:  ${this.wallet.publicKey.toBase58()}`);
    console.log(`   Poll:    every ${POLL_INTERVAL}ms\n`);

    await this.waitForConnection();

    // Load known markets from file
    await this.loadMarketsFromFile("./markets.json");

    // Note: connection.onLogs (logsSubscribe) is not supported by surfpool.
    // Order tracking is handled via polling in runCrankCycle instead.

    while (this.running) {
      try {
        await this.runCrankCycle();
      } catch (err) {
        console.error("Error in crank cycle:", err);
      }
      await sleep(POLL_INTERVAL);
    }
  }

  /**
   * One iteration of the crank:
   * 1. Get current slot
   * 2. Find all active markets
   * 3. Check which markets have closed batch windows
   */
  private async runCrankCycle() {
    const currentSlot = await this.connection.getSlot();
    const markets = await this.fetchAllActiveMarkets();

    console.log(`\n⚙️  Crank cycle - Current slot: ${currentSlot}`);
    console.log(`📊 Watching ${markets.length} active markets | Pending orders: ${this.settling.size}`);

    let readyForSettlement = 0;
    let activeMarkets = 0;

    for (const { pubkey, market } of markets) {
      const batchEnd =
        market.batchSlotStart.toNumber() + market.batchWindowSlots.toNumber();
      const slotsRemaining = Math.max(0, batchEnd - currentSlot);
      
      const marketId = pubkey.toBase58().slice(0, 8);
      let statusIndicator = "";

      // If the current slot is past the batch window, attempt settlement
      if (currentSlot >= batchEnd) {
        statusIndicator = "🔴 [READY_FOR_SETTLEMENT]";
        readyForSettlement++;
        await this.trySettle(pubkey, market, currentSlot);
      } else {
        statusIndicator = "🟢 [ACTIVE]";
        activeMarkets++;
      }

      console.log(`  ${statusIndicator} Market ${marketId}... | Batch end: ${batchEnd} | Slots remaining: ${slotsRemaining}`);
    }

    console.log(`📈 Summary: ${activeMarkets} active, ${readyForSettlement} ready for settlement | Settled: ${this.settled} | Failed: ${this.failed}`);
  }

  private async waitForConnection() {
    console.log("Waiting for validator connection...");
    while (this.running) {
      try {
        await this.connection.getSlot();
        console.log("✓ Connected to validator\n");
        return;
      } catch {
        process.stdout.write(".");
        await sleep(2000);
      }
    }
  }

  stop() {
    this.running = false;
    console.log(
      `\nCrank Agent stopped. Settled: ${this.settled} Failed: ${this.failed}`,
    );
  }
  // ── Known Markets Registry ─────────────────────────────────────
  // Add market PDAs here manually, or load from a JSON file
  // This replaces getProgramAccounts — works on any RPC free tier

  private knownMarkets: Set<string> = new Set();

  public async watchMarket(pubkey: PublicKey) {
    this.knownMarkets.add(pubkey.toBase58());
    console.log(`👁 Watching market: ${pubkey.toBase58()}`);
  }

  public async loadMarketsFromFile(path: string) {
    try {
      const data = JSON.parse(fs.readFileSync(path, "utf8"));
      for (const addr of data.markets) {
        this.knownMarkets.add(addr);
      }
      console.log(`✓ Loaded ${data.markets.length} markets from ${path}`);
    } catch {
      console.log("  No markets file found — add markets manually");
    }
  }

  // Replaces fetchAllActiveMarkets — fetches only known market addresses
  private async fetchAllActiveMarkets() {
    const markets = [];

    for (const pubkeyStr of this.knownMarkets) {
      try {
        const pubkey = new PublicKey(pubkeyStr);
        const market = await (this.program.account as any).market.fetch(pubkey);

        // Only process Active markets
        if (Object.keys(market.status)[0] !== "active") continue;

        markets.push({ pubkey, market });
      } catch {
        // Market account doesn't exist or decoding failed — remove from registry
        this.knownMarkets.delete(pubkeyStr);
      }
    }

    return markets;
  }

  // Replaces fetchPendingOrders — fetches order PDAs directly from events
  // Order PDAs are deterministic: seeds = ["order", market, user]
  // The crank agent tracks known users from OrderSubmitted events
  private knownOrderUsers: Map<string, Set<string>> = new Map();
  // marketPubkey → Set<userPubkey>

  public trackOrderUser(marketPubkey: PublicKey, userPubkey: PublicKey) {
    const key = marketPubkey.toBase58();
    if (!this.knownOrderUsers.has(key)) {
      this.knownOrderUsers.set(key, new Set());
    }
    this.knownOrderUsers.get(key)!.add(userPubkey.toBase58());
  }

  private async fetchPendingOrders(
    marketPubkey: PublicKey,
    batchSlotStart: number,
  ) {
    // Use getProgramAccounts with a memcmp filter on the market field (offset 8)
    // batchOrder layout: discriminator(8) + market(32) + ...
    const accounts = await this.connection.getProgramAccounts(
      this.program.programId,
      {
        filters: [
          { dataSize: 157 }, // BatchOrder::LEN
          { memcmp: { offset: 8, bytes: marketPubkey.toBase58() } },
        ],
      },
    );

    const orders = [];
    for (const { pubkey, account } of accounts) {
      try {
        const order = await (this.program.account as any).batchOrder.fetch(pubkey);
        if (order.batchSlotStart.toNumber() !== batchSlotStart) continue;
        if (order.isFilled) continue;
        orders.push({ pubkey, order });
      } catch {
        continue;
      }
    }
    return orders;
  }

  private async syncOrderFromTx(signature: string) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) return;

      // Account keys in a submit_order tx follow a known layout
      // [user, market, batchOrder, ...]
      const keys = tx.transaction.message.staticAccountKeys;
      if (keys.length < 3) return;

      const userPubkey: any = keys[0]; // signer = user
      const marketPubkey: any = keys[1]; // market account

      // Verify market is in our watch list
      if (!this.knownMarkets.has(marketPubkey.toBase58())) return;

      this.trackOrderUser(marketPubkey, userPubkey);
      console.log(
        `  📝 Tracked order: user=${userPubkey
          .toBase58()
          .slice(0, 8)}... market=${marketPubkey.toBase58().slice(0, 8)}...`,
      );
    } catch {
      // Transaction parsing failed — skip silently
    }
  }

  // ── Build remaining accounts (interleaved pairs) ───────────────
  private async buildRemainingAccounts(
    orders: Array<{ pubkey: PublicKey; order: any }>,
    yesMint: PublicKey,
    noMint: PublicKey,
  ) {
    const remainingAccounts = [];

    for (const { pubkey: orderPDA, order } of orders) {
      const isYes = Object.keys(order.outcome)[0] === "yes";
      const mint = isYes ? yesMint : noMint;

      // Get the user's associated token account for their outcome token
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        order.user,
        false,
      );

      // Verify the token account exists — skip if not initialised
      const info = await this.connection.getAccountInfo(userTokenAccount);
      if (!info) {
        console.warn(
          `  ⚠ Skipping order ${orderPDA.toBase58()} — token account not initialised`,
        );
        continue;
      }

      // Interleaved: [order_pda, user_token_account]
      remainingAccounts.push(
        { pubkey: orderPDA, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      );
    }

    return remainingAccounts;
  }

  private async trySettle(
    marketPubkey: PublicKey,
    market: any,
    currentSlot: number,
  ) {
    const key = marketPubkey.toBase58();
    if (this.settling.has(key)) return;
    this.settling.add(key);

    try {
      const orders = await this.fetchPendingOrders(
        marketPubkey,
        market.batchSlotStart.toNumber(),
      );
      if (orders.length === 0) {
        console.log(`  ℹ️  No pending orders for market ${key.slice(0, 8)}...`);
        return;
      }

      const ordersToSettle = orders.slice(0, MAX_ORDERS);
      const remainingAccounts = await this.buildRemainingAccounts(
        ordersToSettle,
        market.yesMint,
        market.noMint,
      );

      if (remainingAccounts.length === 0) {
        console.log(`  ⚠️  No valid orders to settle for market ${key.slice(0, 8)}... (token accounts not initialized)`);
        return;
      }

      console.log(
        `⚙️  Settling ${ordersToSettle.length} orders for market ${key.slice(
          0,
          8,
        )}...`,
      );

      const [lpPool] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_pool"), marketPubkey.toBuffer()],
        this.program.programId,
      );
      const [yesMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("yes_mint"), marketPubkey.toBuffer()],
        this.program.programId,
      );
      const [noMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("no_mint"), marketPubkey.toBuffer()],
        this.program.programId,
      );

      const collateralMint = await this.getCollateralMint(market);

      // Creator's USDC ATA — receives creator fee split during settle_batch
      const creatorFeeAccount = getAssociatedTokenAddressSync(
        collateralMint,
        market.authority,
        false,
      );

      // Cranker's USDC ATA — receives crank tip
      const crankerCollateralAccount = getAssociatedTokenAddressSync(
        collateralMint,
        this.wallet.publicKey,
        false,
      );

      const tx = await (this.program.methods as any)
        .settleBatch()
        .accounts({
          cranker: this.wallet.publicKey,
          market: marketPubkey,
          lpPool,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          collateralVault: market.collateralVault,
          crankerCollateralAccount,
          creatorFeeAccount,
          collateralMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
        ])
        .rpc();

      this.settled++;
      console.log(`  ✅ Settlement successful! TX: ${tx}`);
      console.log(`  📊 Orders settled: ${ordersToSettle.length} | Total settled: ${this.settled}`);
    } catch (err: any) {
      this.failed++;
      // Don't log expected race conditions (batch still open or already filled)
      if (
        !err.message.includes("BatchWindowNotClosed") &&
        !err.message.includes("OrderAlreadyFilled")
      ) {
        console.error(`  ❌ Settlement failed for market ${key.slice(0, 8)}...:`);
        console.error(`     Error: ${err.message}`);
        console.error(`     Total failed: ${this.failed}`);
      } else {
        console.log(`  ℹ️  Settlement skipped for market ${key.slice(0, 8)}... (${err.message.includes("BatchWindowNotClosed") ? "batch still open" : "orders already filled"})`);
      }
    } finally {
      this.settling.delete(key);
    }
  }

  // ── Helper: get collateral mint from vault ─────────────────────
  private async getCollateralMint(market: any): Promise<PublicKey> {
    const vaultInfo = await this.connection.getParsedAccountInfo(
      market.collateralVault,
    );
    const parsed = (vaultInfo.value?.data as any)?.parsed;
    const mint = parsed?.info?.mint;
    if (!mint)
      throw new Error(
        `Could not parse mint from vault ${market.collateralVault}`,
      );
    return new PublicKey(mint);
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerIdlWithSurfpool(
  connection: Connection,
  idl: any,
  programId: PublicKey,
) {
  try {
    const slot = await connection.getSlot();
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "surfnet_registerIdl",
        params: [
          { ...idl, address: programId.toBase58() }, // IDL first
          slot, // slot second
        ],
      }),
    });

    const result: any = await response.json();
    if (result.error) {
      console.warn(`⚠ IDL registration skipped: ${result.error.message}`);
      return; // ← warn and continue, never throw
    }
    console.log("✓ IDL registered with Surfpool");
  } catch (err) {
    console.warn("⚠ IDL registration skipped:", err);
    // never rethrow — crank works fine without it
  }
}

// ── Entry Point Update ───────────────────────────────────────────
async function main() {
  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
  const wallet = Keypair.fromSecretKey(Buffer.from(keypairData));

  // Ensure the Connection object handles both HTTP and WebSocket streams natively
  // Don't pass wsEndpoint when running against surfpool — it doesn't support logsSubscribe
  // and the SDK will spam reconnect attempts endlessly.
  const connection = new anchor.web3.Connection(RPC_URL, {
    commitment: "confirmed",
  });
  await registerIdlWithSurfpool(connection, idl, PROGRAM_ID);

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" },
  );
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);

  const agent = new CrankAgent(connection, program, wallet);

  // Load all active markets from chain and register them
  const chainMarkets = await loadAllActiveMarkets(program);
  for (const addr of chainMarkets) {
    await agent.watchMarket(new PublicKey(addr));
  }

  // Add known markets explicitly — no getProgramAccounts needed
  // Get your market PDA from the test output or anchor keys list
  if (process.env["WATCH_MARKET"]) {
    await agent.watchMarket(new PublicKey(process.env["WATCH_MARKET"]));
  }

  process.on("SIGINT", () => {
    agent.stop();
    process.exit(0);
  });
  await agent.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
