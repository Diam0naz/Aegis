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

configDotenv();

// ── Config ────────────────────────────────────────────────────────

const idlPath =
  process.env["IDL_PATH"] || "../../target/idl/aegis_project.json";
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
const RPC_URL = process.env["RPC_URL"] || "http://127.0.0.1:8899";;
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
export class CrankAgent {
  private connection: Connection;
  private program: anchor.Program;
  private wallet: Keypair;
  private running: boolean = false;
  private settled: number = 0;
  private failed: number = 0;
  private settling = new Set<string>();

  constructor(
    connection: Connection,
    // wsConnection param removed as it is unsupported by Surfpool
    program: anchor.Program,
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

    // Loop indefinitely using a standard timer
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

    for (const { pubkey, market } of markets) {
      const batchEnd =
        market.batchSlotStart.toNumber() + market.batchWindowSlots.toNumber();

      // If the current slot is past the batch window, attempt settlement
      if (currentSlot >= batchEnd) {
        await this.trySettle(pubkey, market, currentSlot);
      }
    }
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

  private async fetchAllActiveMarkets() {
    // Offset 219 matches your MarketStatus enum position
    const STATUS_OFFSET = 219;

    const accounts = await this.connection.getProgramAccounts(
      this.program.programId,
      {
        filters: [
          { dataSize: MARKET_SIZE },
          // "1" = base58 for 0x00 (MarketStatus::Active)
          { memcmp: { offset: STATUS_OFFSET, bytes: "1" } },
        ],
      },
    );

    const markets = [];
    for (const { pubkey, account } of accounts) {
      try {
        const market = this.program.coder.accounts.decode(
          "market",
          account.data,
        );
        markets.push({ pubkey, market });
      } catch {
        continue;
      }
    }
    return markets;
  }

  // ── Fetch pending orders for a market ─────────────────────────
  private async fetchPendingOrders(
    marketPubkey: PublicKey,
    batchSlotStart: number,
  ) {
    // BatchOrder layout: 8+32+32+1+8+8 = 89 bytes to batch_slot_start
    // is_filled is at offset: 8+32+32+1+8+8+32+1+1 = 123
    const BATCH_SLOT_OFFSET = 89;
    const IS_FILLED_OFFSET = 123;

    const accounts = await this.connection.getProgramAccounts(
      this.program.programId,
      {
        filters: [
          // Filter by market pubkey at offset 8
          {
            memcmp: {
              offset: 8,
              bytes: marketPubkey.toBase58(),
            },
          },
          // Filter for current batch_slot_start
          {
            memcmp: {
              offset: BATCH_SLOT_OFFSET,
              bytes: bs58Encode.encode(
                new anchor.BN(batchSlotStart).toArrayLike(Buffer, "le", 8),
              ),
            },
          },
        ],
      },
    );

    console.log(`Raw accounts: ${accounts.length}`);

    // Decode and filter unfilled, revealed orders
    const orders = [];
    for (const { pubkey, account } of accounts) {
      try {
        const order = this.program.coder.accounts.decode(
          "batchOrder",
          account.data,
        );

        // Skip filled or unrevealed orders
        if (order.isFilled) continue;

        orders.push({ pubkey, order });
      } catch {
        continue;
      }
    }

    return orders;
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
      if (orders.length === 0) return;

      const ordersToSettle = orders.slice(0, MAX_ORDERS);
      const remainingAccounts = await this.buildRemainingAccounts(
        ordersToSettle,
        market.yesMint,
        market.noMint,
      );

      if (remainingAccounts.length === 0) return;

      console.log(
        `⚙ Settling ${ordersToSettle.length} orders for market ${key.slice(
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

      const tx = await (this.program.methods as any)
        .settleBatch()
        .accounts({
          cranker: this.wallet.publicKey,
          market: marketPubkey,
          lpPool,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          collateralVault: market.collateralVault,
          collateralMint: await this.getCollateralMint(market),
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
      console.log(`  ✓ Settled! TX: ${tx.slice(0, 10)}...`);
    } catch (err: any) {
      this.failed++;
      // Don't log expected race conditions (batch still open or already filled)
      if (
        !err.message.includes("BatchWindowNotClosed") &&
        !err.message.includes("OrderAlreadyFilled")
      ) {
        console.error(`  ✗ Settle failed: ${err.message}`);
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

  // Connect via HTTP only
  const connection = new Connection(RPC_URL, "confirmed");
  

  await registerIdlWithSurfpool(connection, idl, PROGRAM_ID);

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" },
  );
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  // No wsConnection passed anymore
  const agent = new CrankAgent(connection, program, wallet);

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


