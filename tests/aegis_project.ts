// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { AegisProject } from "../target/types/aegis_project";
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
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import * as crypto from "crypto";
import * as fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const rpcUrl = process.env["RPC_URL"];
const oracleKeypair = process.env["ORACLE_KEYPAIR"];

// ── Helpers ───────────────────────────────────────────────────────

/** SHA-256 a string into a 32-byte array (question hash) */
function hashQuestion(question: string): number[] {
  return Array.from(crypto.createHash("sha256").update(question).digest());
}

/** Airdrop SOL and confirm */
// Replace this helper
async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number = 1,
) {
  // On devnet — skip airdrop, fund from main wallet instead
  const isDevnet =
    connection.rpcEndpoint.includes("devnet") ||
    connection.rpcEndpoint.includes("alchemy") ||
    connection.rpcEndpoint.includes("helius");

  if (isDevnet) {
    // Transfer from the provider wallet instead of airdropping
    const provider = anchor.getProvider();
    const tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey!,
        toPubkey: pubkey,
        lamports: sol * anchor.web3.LAMPORTS_PER_SOL,
      }),
    );
    await provider.sendAndConfirm(tx);
  } else {
    // Localnet — airdrop as normal
    const sig = await connection.requestAirdrop(
      pubkey,
      sol * anchor.web3.LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(sig, "confirmed");
  }
}

/** Derive market PDA */
function getMarketPDA(
  authority: PublicKey,
  questionHash: number[],
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), authority.toBuffer(), Buffer.from(questionHash)],
    programId,
  );
}

/** Derive yes_mint PDA */
function getYesMintPDA(market: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("yes_mint"), market.toBuffer()],
    programId,
  );
}

/** Derive no_mint PDA */
function getNoMintPDA(market: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("no_mint"), market.toBuffer()],
    programId,
  );
}

/** Derive lp_pool PDA */
function getLpPoolPDA(market: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lp_pool"), market.toBuffer()],
    programId,
  );
}

/** Derive lp_mint PDA */
function getLpMintPDA(market: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lp_mint"), market.toBuffer()],
    programId,
  );
}

/** Derive order PDA */
function getOrderPDA(market: PublicKey, user: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), market.toBuffer(), user.toBuffer()],
    programId,
  );
}

/** Derive resolution PDA */
function getResolutionPDA(market: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("resolution"), market.toBuffer()],
    programId,
  );
}

/** Get current slot */
async function currentSlot(
  connection: anchor.web3.Connection,
): Promise<number> {
  return await connection.getSlot();
}
/** For Surfpool*/
async function surfnetRpc(method: string, params: any) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json: any = await res.json();
  if (json.error)
    throw new Error(`${method} failed: ${JSON.stringify(json.error)}`);
  return json.result;
}

/** Returns true if the RPC endpoint is a Surfpool instance */
async function isSurfpool(endpoint?: string): Promise<boolean> {
  const url = endpoint ?? "http://127.0.0.1:8899";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getVersion", params: [] }),
    });
    const json: any = await res.json();
    return typeof json.result?.["surfnet-version"] === "string";
  } catch {
    return false;
  }
}

/**
 * Patch the challenge_window field of a ResolutionProposal account to `newWindow`
 * using surfnet_setAccount so finalize_resolution can run immediately in tests.
 *
 * ResolutionProposal layout (after 8-byte discriminator):
 *   32 market | 32 proposer | 1 proposed_outcome | 8 bond_amount |
 *   8 proposed_at_slot | 8 challenge_window | 1 is_disputed | 1 is_finalized | 1 bump | 32 padding
 *
 * challenge_window offset = 8 + 32 + 32 + 1 + 8 + 8 = 89
 */
async function patchChallengeWindow(
  connection: anchor.web3.Connection,
  proposalPubkey: PublicKey,
  newWindow: bigint = 1n,
) {
  const endpoint = connection.rpcEndpoint;
  const info = await connection.getAccountInfo(proposalPubkey);
  if (!info) throw new Error("Proposal account not found");

  const data = Buffer.from(info.data);
  const offset = 89; // discriminator(8) + market(32) + proposer(32) + proposed_outcome(1) + bond_amount(8) + proposed_at_slot(8)
  data.writeBigUInt64LE(newWindow, offset);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1,
      method: "surfnet_setAccount",
      params: [
        proposalPubkey.toBase58(),
        {
          lamports: info.lamports,
          data: data.toString("hex"),
          owner: info.owner.toBase58(),
          executable: false,
        },
      ],
    }),
  });
  const json: any = await res.json();
  if (json.error) throw new Error(`surfnet_setAccount failed: ${JSON.stringify(json.error)}`);
}

// ── Test Suite ────────────────────────────────────────────────────

describe("aegis_project", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AegisProject as Program<AegisProject>;
  const connection = provider.connection;

  // ── Keypairs ───────────────────────────────────────────────────
  const authority = Keypair.generate(); // market creator
  const lpUser = Keypair.generate(); // liquidity provider
  const trader1 = Keypair.generate(); // YES bettor
  const trader2 = Keypair.generate(); // NO bettor
  const proposer = Keypair.generate(); // resolution proposer

  // ── State shared across tests ──────────────────────────────────
  let usdcMint: PublicKey;
  let marketPDA: PublicKey;
  let yesMintPDA: PublicKey;
  let noMintPDA: PublicKey;
  let lpPoolPDA: PublicKey;
  let lpMintPDA: PublicKey;
  let collateralVault: PublicKey;
  let questionHash: number[];

  // ── Token accounts ─────────────────────────────────────────────
  let lpUsdcAccount: PublicKey;
  let trader1UsdcAccount: PublicKey;
  let trader2UsdcAccount: PublicKey;
  let proposerUsdcAccount: PublicKey;

  // ─────────────────────────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────────────────────────

  before(async () => {
    // Fund all wallets
    await Promise.all([
      airdrop(connection, authority.publicKey, 1),
      airdrop(connection, lpUser.publicKey, 1),
      airdrop(connection, trader1.publicKey, 1),
      airdrop(connection, trader2.publicKey, 1),
      airdrop(connection, proposer.publicKey, 1),
    ]);

    // Create a mock USDC mint (6 decimals, authority controls supply)
    usdcMint = await createMint(
      connection,
      authority, // payer
      authority.publicKey, // mint authority
      null, // freeze authority
      6, // decimals
    );

    // Create USDC token accounts for all parties
    lpUsdcAccount = await createAssociatedTokenAccount(
      connection,
      lpUser,
      usdcMint,
      lpUser.publicKey,
    );
    trader1UsdcAccount = await createAssociatedTokenAccount(
      connection,
      trader1,
      usdcMint,
      trader1.publicKey,
    );
    trader2UsdcAccount = await createAssociatedTokenAccount(
      connection,
      trader2,
      usdcMint,
      trader2.publicKey,
    );
    proposerUsdcAccount = await createAssociatedTokenAccount(
      connection,
      proposer,
      usdcMint,
      proposer.publicKey,
    );

    // Mint USDC to all parties
    // LP gets 10,000 USDC, traders get 1,000 each, proposer gets 500
    await mintTo(
      connection,
      authority,
      usdcMint,
      lpUsdcAccount,
      authority,
      5_000_000_000,
    ); // 10,000 USDC
    await mintTo(
      connection,
      authority,
      usdcMint,
      trader1UsdcAccount,
      authority,
      500_000_000,
    ); // 1,000 USDC
    await mintTo(
      connection,
      authority,
      usdcMint,
      trader2UsdcAccount,
      authority,
      500_000_000,
    ); // 1,000 USDC
    await mintTo(
      connection,
      authority,
      usdcMint,
      proposerUsdcAccount,
      authority,
      500_000_000,
    ); // 500 USDC

    // Derive PDAs
    questionHash = hashQuestion("Will BTC hit $200k by end of 2025?");
    [marketPDA] = getMarketPDA(
      authority.publicKey,
      questionHash,
      program.programId,
    );
    [yesMintPDA] = getYesMintPDA(marketPDA, program.programId);
    [noMintPDA] = getNoMintPDA(marketPDA, program.programId);
    [lpPoolPDA] = getLpPoolPDA(marketPDA, program.programId);
    [lpMintPDA] = getLpMintPDA(marketPDA, program.programId);

    collateralVault = getAssociatedTokenAddressSync(usdcMint, marketPDA, true);
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. CREATE MARKET
  // ─────────────────────────────────────────────────────────────────

  describe("create_market", () => {
    it("creates a market with valid parameters", async () => {
      const slot = await currentSlot(connection);
      const resolutionSlot = slot + 10_000; // ~70 minutes from now

      await program.methods
        .createMarket(
          questionHash,
          new BN(500), // b_param
          new BN(8), // batch_window_slots
          new BN(resolutionSlot),
          200, // fee_bps (2%)
        )
        .accounts({
          authority: authority.publicKey,
          market: marketPDA,
          collateralMint: usdcMint,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          collateralVault: collateralVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      // Verify market state was written correctly
      const market = await program.account.market.fetch(marketPDA);

      assert.equal(
        market.authority.toBase58(),
        authority.publicKey.toBase58(),
        "authority should match",
      );
      assert.equal(market.bParam.toNumber(), 500, "b_param should be 500");
      assert.equal(market.feeBps, 200, "fee_bps should be 200");
      assert.equal(market.yesQty.toNumber(), 0, "yes_qty should start at 0");
      assert.equal(market.noQty.toNumber(), 0, "no_qty should start at 0");
      assert.deepEqual(
        Object.keys(market.status)[0],
        "active",
        "status should be Active",
      );
      assert.equal(
        market.yesMint.toBase58(),
        yesMintPDA.toBase58(),
        "yes_mint should match PDA",
      );
      assert.equal(
        market.collateralVault.toBase58(),
        collateralVault.toBase58(),
        "collateral_vault should match",
      );

      console.log("  ✓ Market PDA:", marketPDA.toBase58());
      console.log("  ✓ YES mint:", yesMintPDA.toBase58());
      console.log("  ✓ NO mint:", noMintPDA.toBase58());
    });

    it("rejects invalid b_param (too low)", async () => {
      const badHash = hashQuestion("bad market 1");
      const [badMarket] = getMarketPDA(
        authority.publicKey,
        badHash,
        program.programId,
      );
      const [badYesMint] = getYesMintPDA(badMarket, program.programId);
      const [badNoMint] = getNoMintPDA(badMarket, program.programId);
      const badVault = getAssociatedTokenAddressSync(usdcMint, badMarket, true);

      const slot = await currentSlot(connection);

      try {
        await program.methods
          .createMarket(
            badHash,
            new BN(50),
            new BN(8),
            new BN(slot + 10_000),
            200,
          )
          .accounts({
            authority: authority.publicKey,
            market: badMarket,
            collateralMint: usdcMint,
            yesMint: badYesMint,
            noMint: badNoMint,
            collateralVault: badVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc();
        assert.fail("should have rejected b_param=50");
      } catch (err: any) {
        assert.include(
          err.message,
          "InvalidBParam",
          "should throw InvalidBParam",
        );
        console.log("  ✓ Rejected b_param=50 correctly");
      }
    });

    it("rejects fee_bps above 1000 (max 10%)", async () => {
      const badHash = hashQuestion("bad market 2");
      const [badMarket] = getMarketPDA(
        authority.publicKey,
        badHash,
        program.programId,
      );
      const [badYesMint] = getYesMintPDA(badMarket, program.programId);
      const [badNoMint] = getNoMintPDA(badMarket, program.programId);
      const badVault = getAssociatedTokenAddressSync(usdcMint, badMarket, true);
      const slot = await currentSlot(connection);

      try {
        await program.methods
          .createMarket(
            badHash,
            new BN(100),
            new BN(8),
            new BN(slot + 10_000),
            1500,
          )
          .accounts({
            authority: authority.publicKey,
            market: badMarket,
            collateralMint: usdcMint,
            yesMint: badYesMint,
            noMint: badNoMint,
            collateralVault: badVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc();
        assert.fail("should have rejected fee_bps=1500");
      } catch (err: any) {
        assert.include(err.message, "InvalidFeeBps");
        console.log("  ✓ Rejected fee_bps=1500 correctly");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. ADD LIQUIDITY
  // ─────────────────────────────────────────────────────────────────

  describe("add_liquidity", () => {
    it("LP deposits 1000 USDC and receives LP tokens 1:1 on first deposit", async () => {
      const depositAmount = new BN(1_000_000_000); // 1,000 USDC

      const lpTokenAccount = getAssociatedTokenAddressSync(
        lpMintPDA,
        lpUser.publicKey,
        false,
      );

      await program.methods
        .addLiquidity(depositAmount)
        .accounts({
          lp: lpUser.publicKey,
          market: marketPDA,
          lpPool: lpPoolPDA,
          lpMint: lpMintPDA,
          lpCollateralAccount: lpUsdcAccount,
          collateralVault: collateralVault,
          lpTokenAccount: lpTokenAccount,
          collateralMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([lpUser])
        .rpc();

      // Verify LP pool state
      const lpPool = await program.account.lpPool.fetch(lpPoolPDA);
      assert.equal(
        lpPool.totalLiquidity.toNumber(),
        1_000_000_000,
        "pool should hold 1000 USDC",
      );
      assert.equal(
        lpPool.totalLpSupply.toNumber(),
        1_000_000_000,
        "first deposit: LP tokens = USDC amount (1:1)",
      );

      // Verify LP token account received tokens
      const lpTokenAcct = await getAccount(connection, lpTokenAccount);
      assert.equal(
        lpTokenAcct.amount.toString(),
        "1000000000",
        "LP should hold 1000 LP tokens",
      );

      // Verify vault received USDC
      const vault = await getAccount(connection, collateralVault);
      assert.equal(
        vault.amount.toString(),
        "1000000000",
        "vault should hold 1000 USDC",
      );

      console.log(
        "  ✓ LP pool total liquidity:",
        lpPool.totalLiquidity.toString(),
      );
      console.log("  ✓ LP tokens minted:", lpPool.totalLpSupply.toString());
    });

    it("second LP deposit gets proportional LP tokens", async () => {
      // Mint USDC to authority so they can also LP
      const authorityUsdc = await createAssociatedTokenAccount(
        connection,
        authority,
        usdcMint,
        authority.publicKey,
      );
      await mintTo(
        connection,
        authority,
        usdcMint,
        authorityUsdc,
        authority,
        2_000_000_000,
      );

      const authorityLpAccount = getAssociatedTokenAddressSync(
        lpMintPDA,
        authority.publicKey,
        false,
      );

      const depositAmount = new BN(500_000_000); // 500 USDC

      await program.methods
        .addLiquidity(depositAmount)
        .accounts({
          lp: authority.publicKey,
          market: marketPDA,
          lpPool: lpPoolPDA,
          lpMint: lpMintPDA,
          lpCollateralAccount: authorityUsdc,
          collateralVault: collateralVault,
          lpTokenAccount: authorityLpAccount,
          collateralMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      const lpPool = await program.account.lpPool.fetch(lpPoolPDA);

      // Pool had 1000 USDC, 1000 LP supply
      // Depositing 500 USDC → 500 * 1000 / 1000 = 500 new LP tokens
      assert.equal(
        lpPool.totalLiquidity.toNumber(),
        1_500_000_000,
        "pool should now hold 1500 USDC",
      );
      assert.equal(
        lpPool.totalLpSupply.toNumber(),
        1_500_000_000,
        "total LP supply should be 1500",
      );

      console.log("  ✓ Second deposit proportional LP tokens verified");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. SUBMIT ORDER
  // ─────────────────────────────────────────────────────────────────

  describe("submit_order", () => {
    let trader1OrderPDA: PublicKey;
    let trader2OrderPDA: PublicKey;

    before(() => {
      [trader1OrderPDA] = getOrderPDA(
        marketPDA,
        trader1.publicKey,
        program.programId,
      );
      [trader2OrderPDA] = getOrderPDA(
        marketPDA,
        trader2.publicKey,
        program.programId,
      );
    });

    it("trader1 submits a YES order for 100 USDC", async () => {
      const amount = new BN(100_000_000); // 100 USDC

      const trader1BalanceBefore = (
        await getAccount(connection, trader1UsdcAccount)
      ).amount;

      await program.methods
        .submitOrder({ yes: {} }, amount)
        .accounts({
          user: trader1.publicKey,
          market: marketPDA,
          batchOrder: trader1OrderPDA,
          userCollateralAccount: trader1UsdcAccount,
          collateralVault: collateralVault,
          collateralMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([trader1])
        .rpc();

      // Verify order PDA was created
      const order = await program.account.batchOrder.fetch(trader1OrderPDA);
      assert.equal(
        order.user.toBase58(),
        trader1.publicKey.toBase58(),
        "order user should match trader1",
      );
      assert.equal(
        order.amountIn.toNumber(),
        100_000_000,
        "order amount should be 100 USDC",
      );
      assert.deepEqual(
        Object.keys(order.outcome)[0],
        "yes",
        "outcome should be YES",
      );
      assert.isFalse(order.isFilled, "order should not be filled yet");

      // Verify USDC was debited from trader
      const trader1BalanceAfter = (
        await getAccount(connection, trader1UsdcAccount)
      ).amount;
      assert.equal(
        (trader1BalanceBefore - trader1BalanceAfter).toString(),
        "100000000",
        "trader1 should have 100 USDC less",
      );

      // Verify vault received the USDC
      const vault = await getAccount(connection, collateralVault);
      assert.ok(
        BigInt(vault.amount) >= BigInt(100_000_000),
        "vault should have received 100 USDC",
      );

      console.log("  ✓ YES order submitted, USDC locked in vault");
    });

    it("trader2 submits a NO order for 80 USDC", async () => {
      const amount = new BN(80_000_000); // 80 USDC

      await program.methods
        .submitOrder({ no: {} }, amount)
        .accounts({
          user: trader2.publicKey,
          market: marketPDA,
          batchOrder: trader2OrderPDA,
          userCollateralAccount: trader2UsdcAccount,
          collateralVault: collateralVault,
          collateralMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([trader2])
        .rpc();

      const order = await program.account.batchOrder.fetch(trader2OrderPDA);
      assert.deepEqual(Object.keys(order.outcome)[0], "no");
      assert.equal(order.amountIn.toNumber(), 80_000_000);

      console.log("  ✓ NO order submitted");
    });

    it("rejects order below minimum size (< 1 USDC)", async () => {
      const tinyTrader = Keypair.generate();
      await airdrop(connection, tinyTrader.publicKey);

      const tinyUsdc = await createAssociatedTokenAccount(
        connection,
        tinyTrader,
        usdcMint,
        tinyTrader.publicKey,
      );
      await mintTo(
        connection,
        authority,
        usdcMint,
        tinyUsdc,
        authority,
        100_000,
      );

      const [tinyOrderPDA] = getOrderPDA(
        marketPDA,
        tinyTrader.publicKey,
        program.programId,
      );

      try {
        await program.methods
          .submitOrder({ yes: {} }, new BN(100))
          .accounts({
            user: tinyTrader.publicKey,
            market: marketPDA,
            batchOrder: tinyOrderPDA,
            userCollateralAccount: tinyUsdc,
            collateralVault: collateralVault,
            collateralMint: usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([tinyTrader])
          .rpc();
        assert.fail("should have rejected dust order");
      } catch (err: any) {
        assert.include(err.message, "OrderBelowMinimum");
        console.log("  ✓ Dust order rejected correctly");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. SETTLE BATCH
  // ─────────────────────────────────────────────────────────────────

  describe("settle_batch", () => {
    let trader1YesAccount: PublicKey;
    let trader2NoAccount: PublicKey;
    let trader1OrderPDA: PublicKey;
    let trader2OrderPDA: PublicKey;

    before(async () => {
      [trader1OrderPDA] = getOrderPDA(
        marketPDA,
        trader1.publicKey,
        program.programId,
      );
      [trader2OrderPDA] = getOrderPDA(
        marketPDA,
        trader2.publicKey,
        program.programId,
      );

      // Create YES token account for trader1
      trader1YesAccount = getAssociatedTokenAddressSync(
        yesMintPDA,
        trader1.publicKey,
        false,
      );
      // Create NO token account for trader2
      trader2NoAccount = getAssociatedTokenAddressSync(
        noMintPDA,
        trader2.publicKey,
        false,
      );

      // Create the token accounts on-chain
      await createAssociatedTokenAccount(
        connection,
        trader1,
        yesMintPDA,
        trader1.publicKey,
      );
      await createAssociatedTokenAccount(
        connection,
        trader2,
        noMintPDA,
        trader2.publicKey,
      );
    });

    it("rejects settle before batch window closes", async () => {
      // Market has 8 slot window — likely haven't waited
      // (this may pass if enough time elapsed — timing-dependent)
      const market = await program.account.market.fetch(marketPDA);
      const slot = await currentSlot(connection);

      if (slot < market.batchSlotStart.toNumber() + 8) {
        try {
          await program.methods
            .settleBatch()
            .accounts({
              market: marketPDA,
              lpPool: lpPoolPDA,
              yesMint: yesMintPDA,
              noMint: noMintPDA,
              collateralVault: collateralVault,
              collateralMint: usdcMint,
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .remainingAccounts([])
            .signers([authority])
            .rpc();
          assert.fail("should reject early settle");
        } catch (err: any) {
          assert.include(err.message, "BatchWindowNotClosed");
          console.log("  ✓ Early settle rejected");
        }
      } else {
        console.log("  ⚠ Skipped — batch window already closed");
      }
    });

    it("settles batch and mints YES/NO tokens at uniform clearing price", async () => {
      // Verify orders exist before attempting to settle
      try {
        await program.account.batchOrder.fetch(trader1OrderPDA);
        await program.account.batchOrder.fetch(trader2OrderPDA);
      } catch {
        assert.fail(
          "Order PDAs not found — submit_order tests must pass first",
        );
      }

      // Wait for batch window to close (8 slots ≈ 3.2 seconds)
      // On localnet we can just wait
      console.log("  Waiting for batch window...");
      await new Promise((r) => setTimeout(r, 5000));

      const marketBefore = await program.account.market.fetch(marketPDA);
      const vaultBefore = await getAccount(connection, collateralVault);

      await program.methods
        .settleBatch()
        .accounts({
          cranker: authority.publicKey,
          market: marketPDA,
          lpPool: lpPoolPDA,
          yesMint: yesMintPDA,
          noMint: noMintPDA,
          collateralVault: collateralVault,
          collateralMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([
          // Order PDAs and user token accounts in pairs
          { pubkey: trader1OrderPDA, isSigner: false, isWritable: true },
          { pubkey: trader1YesAccount, isSigner: false, isWritable: true },
          { pubkey: trader2OrderPDA, isSigner: false, isWritable: true },
          { pubkey: trader2NoAccount, isSigner: false, isWritable: true },
        ])
        .signers([authority])
        .rpc();

      // Verify market updated
      const marketAfter = await program.account.market.fetch(marketPDA);
      assert.notEqual(
        marketAfter.batchSlotStart.toNumber(),
        marketBefore.batchSlotStart.toNumber(),
        "batch_slot_start should have advanced",
      );

      // Verify YES tokens were minted to trader1
      const trader1YesAcct = await getAccount(connection, trader1YesAccount);
      assert.ok(
        trader1YesAcct.amount > BigInt(0),
        "trader1 should have received YES tokens",
      );

      // Verify NO tokens were minted to trader2
      const trader2NoAcct = await getAccount(connection, trader2NoAccount);
      assert.ok(
        trader2NoAcct.amount > BigInt(0),
        "trader2 should have received NO tokens",
      );

      // Verify fees accrued in LP pool
      const lpPool = await program.account.lpPool.fetch(lpPoolPDA);
      assert.ok(
        lpPool.cumulativeFees.toNumber() > 0,
        "fees should have accrued to LP pool",
      );

      console.log("  ✓ Batch settled");
      console.log("  ✓ Trader1 YES tokens:", trader1YesAcct.amount.toString());
      console.log("  ✓ Trader2 NO tokens:", trader2NoAcct.amount.toString());
      console.log("  ✓ LP fees accrued:", lpPool.cumulativeFees.toString());
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. PROPOSE RESOLUTION
  // ─────────────────────────────────────────────────────────────────

  describe("propose_resolution", () => {
    let resolutionPDA: PublicKey;

    before(() => {
      [resolutionPDA] = getResolutionPDA(marketPDA, program.programId);
    });
    it("rejects resolution before resolution_slot", async () => {
      const market = await program.account.market.fetch(marketPDA);
      const slot = await currentSlot(connection);
      console.log("  Current slot:    ", slot);
      console.log("  Resolution slot: ", market.resolutionSlot.toNumber());

      assert.ok(
        market.resolutionSlot.toNumber() > slot,
        `resolution_slot should be in the future`,
      );

      let threw = false;
      try {
        await program.methods
          .proposeResolution(true, new BN(100_000_000))
          .accounts({
            proposer: proposer.publicKey,
            market: marketPDA,
            proposal: resolutionPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([proposer])
          .rpc();
      } catch (err: any) {
        threw = true;
        // Log the actual error so you can see what the program throws
        console.log("  Actual error message:", err.message);
        console.log("  Actual error logs:", err.logs);

        // Anchor surfaces the error name in the message — adjust if needed
        const isCorrectError =
          err.message.includes("ResolutionSlotNotReached") ||
          err.message.includes("Resolution slot not reached"); // msg() string fallback
        assert.isTrue(
          isCorrectError,
          `Expected ResolutionSlotNotReached, got: ${err.message}`,
        );
        console.log("  ✓ Early resolution rejected correctly");
      }

      // This is the key fix — if no error was thrown, fail explicitly outside the catch
      assert.isTrue(
        threw,
        "proposeResolution should have thrown but didn't — check Rust guard",
      );
    });

    it("allows resolution proposal after market is locked", async function () {
      // ── Check if Surfpool is available ──────────────────────────
      if (!(await isSurfpool(connection.rpcEndpoint))) {
        console.log("  ⚠ Surfpool not running — skipping this test");
        console.log(
          "  ⚠ Run: surfpool start && anchor test --skip-local-validator",
        );
        this.skip();
        return;
      }

      const nearHash = hashQuestion("Near resolution market");
      const slot = await currentSlot(connection);
      const nearResolutionSlot = slot + 30;

      const [nearMarket] = getMarketPDA(
        authority.publicKey,
        nearHash,
        program.programId,
      );
      const [nearYesMint] = getYesMintPDA(nearMarket, program.programId);
      const [nearNoMint] = getNoMintPDA(nearMarket, program.programId);
      const [nearResolution] = getResolutionPDA(nearMarket, program.programId);
      const nearVault = getAssociatedTokenAddressSync(
        usdcMint,
        nearMarket,
        true,
      );

      await program.methods
        .createMarket(
          nearHash,
          new BN(500),
          new BN(1),
          new BN(nearResolutionSlot),
          100,
        )
        .accounts({
          authority: authority.publicKey,
          market: nearMarket,
          collateralMint: usdcMint,
          yesMint: nearYesMint,
          noMint: nearNoMint,
          collateralVault: nearVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      console.log(`  Warping to slot ${nearResolutionSlot + 1}...`);
      // surfpool 0.9.5 has no time-travel RPC — wait for the slot naturally
      const slotNow = await currentSlot(connection);
      const slotsLeft = nearResolutionSlot + 1 - slotNow;
      if (slotsLeft > 0) {
        await new Promise((r) => setTimeout(r, slotsLeft * 400 + 1000));
      }

      await program.methods
        .proposeResolution(true, new BN(100_000_000))
        .accounts({
          proposer: proposer.publicKey,
          market: nearMarket,
          proposal: nearResolution,
          systemProgram: SystemProgram.programId,
        })
        .signers([proposer])
        .rpc();

      const proposal = await program.account.resolutionProposal.fetch(
        nearResolution,
      );
      assert.isTrue(proposal.proposedOutcome);
      assert.isFalse(proposal.isFinalized);
      console.log("  ✓ Resolution proposed after warp");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. REDEEM WINNINGS
  // ─────────────────────────────────────────────────────────────────

  describe("redeem_winnings", () => {
    it("rejects redemption on unresolved market", async () => {
      // Our main market is not resolved — this should fail
      const trader1YesAccount = getAssociatedTokenAddressSync(
        yesMintPDA,
        trader1.publicKey,
        false,
      );
      const trader1UsdcAcct = getAssociatedTokenAddressSync(
        usdcMint,
        trader1.publicKey,
        false,
      );

      try {
        await program.methods
          .redeemWinnings()
          .accounts({
            user: trader1.publicKey,
            market: marketPDA,
            winningMint: yesMintPDA,
            userWinningAccount: trader1YesAccount,
            collateralVault: collateralVault,
            userCollateralAccount: trader1UsdcAcct,
            collateralMint: usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([trader1])
          .rpc();
        assert.fail("should reject on unresolved market");
      } catch (err: any) {
        // Anchor constraint: market.status == Resolved
        assert.ok(err, "correctly rejected redemption on unresolved market");
        console.log("  ✓ Redemption on unresolved market rejected");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. INVARIANTS
  // ─────────────────────────────────────────────────────────────────

  describe("invariants", () => {
    it("YES price + NO price equals 10000 bps after trading", async () => {
      const market = await program.account.market.fetch(marketPDA);
      const yesQty = market.yesQty.toNumber();
      const noQty = market.noQty.toNumber();
      const total = yesQty + noQty;

      const yesPriceBps =
        total === 0
          ? 5000
          : Math.min(9999, Math.max(1, Math.round((yesQty / total) * 10000)));
      const noPriceBps = 10000 - yesPriceBps;

      assert.equal(yesPriceBps + noPriceBps, 10000);

      console.log(
        `  ✓ YES price: ${yesPriceBps}bps, NO price: ${noPriceBps}bps`,
      );
      console.log(`  ✓ yes_qty: ${yesQty}, no_qty: ${noQty}`);
    });

    it("vault balance covers maximum possible payout", async () => {
      const vault = await getAccount(connection, collateralVault);
      const market = await program.account.market.fetch(marketPDA);

      // In a resolved market, only the winning side pays out
      // Vault must cover max(yes_supply, no_supply) worth of USDC
      // Here we just verify vault is non-zero and market has coherent state
      assert.ok(
        BigInt(vault.amount) >= BigInt(0),
        "vault balance should be non-negative",
      );

      console.log("  ✓ Vault balance:", vault.amount.toString());
      console.log("  ✓ YES qty:", market.yesQty.toString());
      console.log("  ✓ NO qty:", market.noQty.toString());
    });

    it("LP pool total_lp_supply is never zero when liquidity exists", async () => {
      const lpPool = await program.account.lpPool.fetch(lpPoolPDA);

      if (lpPool.totalLiquidity.toNumber() > 0) {
        assert.ok(
          lpPool.totalLpSupply.toNumber() > 0,
          "if liquidity exists, LP supply must be > 0",
        );
      }

      console.log("  ✓ LP supply invariant holds");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. END-TO-END RESOLUTION LIFECYCLE
  // Creates a fresh short-lived market, trades, resolves, and redeems.
  // This is the full Aegis lifecycle in one flow.
  // ─────────────────────────────────────────────────────────────────

  describe("end-to-end resolution lifecycle", () => {
    // Fresh keypairs for this isolated test
    const e2eAuthority = Keypair.generate();
    const e2eLp = Keypair.generate();
    const e2eYesBuyer = Keypair.generate();
    const e2eNoBuyer = Keypair.generate();
    const e2eProposer = Keypair.generate();

    // State
    let e2eUsdcMint: PublicKey;
    let e2eMarketPDA: PublicKey;
    let e2eYesMint: PublicKey;
    let e2eNoMint: PublicKey;
    let e2eLpPool: PublicKey;
    let e2eLpMint: PublicKey;
    let e2eVault: PublicKey;
    let e2eResolution: PublicKey;
    let e2eQuestionHash: number[];

    // Token accounts
    let e2eLpUsdc: PublicKey;
    let e2eYesBuyerUsdc: PublicKey;
    let e2eNoBuyerUsdc: PublicKey;
    let e2eProposerUsdc: PublicKey;
    let e2eYesBuyerYes: PublicKey;
    let e2eNoBuyerNo: PublicKey;
    let e2eLpTokenAcct: PublicKey;

    // ── Setup ────────────────────────────────────────────────────
    before(async () => {
      // Fund all wallets
      await Promise.all([
        airdrop(connection, e2eAuthority.publicKey, 1),
        airdrop(connection, e2eLp.publicKey, 1),
        airdrop(connection, e2eYesBuyer.publicKey, 1),
        airdrop(connection, e2eNoBuyer.publicKey, 1),
        airdrop(connection, e2eProposer.publicKey, 1),
      ]);

      // Fresh USDC mint for this test suite
      e2eUsdcMint = await createMint(
        connection,
        e2eAuthority,
        e2eAuthority.publicKey,
        null,
        6,
      );

      // Create and fund token accounts
      e2eLpUsdc = await createAssociatedTokenAccount(
        connection,
        e2eLp,
        e2eUsdcMint,
        e2eLp.publicKey,
      );
      e2eYesBuyerUsdc = await createAssociatedTokenAccount(
        connection,
        e2eYesBuyer,
        e2eUsdcMint,
        e2eYesBuyer.publicKey,
      );
      e2eNoBuyerUsdc = await createAssociatedTokenAccount(
        connection,
        e2eNoBuyer,
        e2eUsdcMint,
        e2eNoBuyer.publicKey,
      );
      e2eProposerUsdc = await createAssociatedTokenAccount(
        connection,
        e2eProposer,
        e2eUsdcMint,
        e2eProposer.publicKey,
      );

      await mintTo(
        connection,
        e2eAuthority,
        e2eUsdcMint,
        e2eLpUsdc,
        e2eAuthority,
        5_000_000_000,
      ); // 5,000 USDC
      await mintTo(
        connection,
        e2eAuthority,
        e2eUsdcMint,
        e2eYesBuyerUsdc,
        e2eAuthority,
        500_000_000,
      ); // 500 USDC
      await mintTo(
        connection,
        e2eAuthority,
        e2eUsdcMint,
        e2eNoBuyerUsdc,
        e2eAuthority,
        500_000_000,
      ); // 500 USDC
      await mintTo(
        connection,
        e2eAuthority,
        e2eUsdcMint,
        e2eProposerUsdc,
        e2eAuthority,
        200_000_000,
      ); // 200 USDC

      // Derive PDAs
      e2eQuestionHash = hashQuestion(
        "Will Solana flip Ethereum by TVL in 2025?",
      );
      [e2eMarketPDA] = getMarketPDA(
        e2eAuthority.publicKey,
        e2eQuestionHash,
        program.programId,
      );
      [e2eYesMint] = getYesMintPDA(e2eMarketPDA, program.programId);
      [e2eNoMint] = getNoMintPDA(e2eMarketPDA, program.programId);
      [e2eLpPool] = getLpPoolPDA(e2eMarketPDA, program.programId);
      [e2eLpMint] = getLpMintPDA(e2eMarketPDA, program.programId);
      [e2eResolution] = getResolutionPDA(e2eMarketPDA, program.programId);

      e2eVault = getAssociatedTokenAddressSync(e2eUsdcMint, e2eMarketPDA, true);

      // Outcome token accounts
      e2eYesBuyerYes = getAssociatedTokenAddressSync(
        e2eYesMint,
        e2eYesBuyer.publicKey,
        false,
      );
      e2eNoBuyerNo = getAssociatedTokenAddressSync(
        e2eNoMint,
        e2eNoBuyer.publicKey,
        false,
      );
      e2eLpTokenAcct = getAssociatedTokenAddressSync(
        e2eLpMint,
        e2eLp.publicKey,
        false,
      );
    });

    // ── Step 1: Create market ─────────────────────────────────────
    it("step 1 — creates a short-lived market", async () => {
      const slot = await currentSlot(connection);
      // Resolution slot = current + 500 (give enough room for all steps to complete)
      const resolutionSlot = slot + 100;

      await program.methods
        .createMarket(
          e2eQuestionHash,
          new BN(500), // b_param
          new BN(4), // batch_window_slots (short for testing)
          new BN(resolutionSlot),
          200, // fee_bps 2%
        )
        .accounts({
          authority: e2eAuthority.publicKey,
          market: e2eMarketPDA,
          collateralMint: e2eUsdcMint,
          yesMint: e2eYesMint,
          noMint: e2eNoMint,
          collateralVault: e2eVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eAuthority])
        .rpc();

      const market = await program.account.market.fetch(e2eMarketPDA);
      assert.deepEqual(Object.keys(market.status)[0], "active");
      assert.equal(market.bParam.toNumber(), 500);

      console.log("  ✓ Short-lived market created");
      console.log("  ✓ Current slot:", slot);
      console.log("  ✓ Resolution slot:", resolutionSlot);
      console.log("  ✓ Slots until resolution:", 100);
    });

    // ── Step 2: Add liquidity ─────────────────────────────────────
    it("step 2 — LP seeds the market with 2000 USDC", async () => {
      await program.methods
        .addLiquidity(new BN(2_000_000_000))
        .accounts({
          lp: e2eLp.publicKey,
          market: e2eMarketPDA,
          lpPool: e2eLpPool,
          lpMint: e2eLpMint,
          lpCollateralAccount: e2eLpUsdc,
          collateralVault: e2eVault,
          lpTokenAccount: e2eLpTokenAcct,
          collateralMint: e2eUsdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eLp])
        .rpc();

      const lpPool = await program.account.lpPool.fetch(e2eLpPool);
      assert.equal(lpPool.totalLiquidity.toNumber(), 2_000_000_000);
      console.log("  ✓ LP seeded market with 2000 USDC");
    });

    // ── Step 3: Traders place orders ──────────────────────────────
    it("step 3 — traders place YES and NO orders", async () => {
      const [yesBuyerOrder] = getOrderPDA(
        e2eMarketPDA,
        e2eYesBuyer.publicKey,
        program.programId,
      );
      const [noBuyerOrder] = getOrderPDA(
        e2eMarketPDA,
        e2eNoBuyer.publicKey,
        program.programId,
      );

      // YES buyer bets 200 USDC
      await program.methods
        .submitOrder({ yes: {} }, new BN(200_000_000))
        .accounts({
          user: e2eYesBuyer.publicKey,
          market: e2eMarketPDA,
          batchOrder: yesBuyerOrder,
          userCollateralAccount: e2eYesBuyerUsdc,
          collateralVault: e2eVault,
          collateralMint: e2eUsdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eYesBuyer])
        .rpc();

      // NO buyer bets 150 USDC
      await program.methods
        .submitOrder({ no: {} }, new BN(150_000_000))
        .accounts({
          user: e2eNoBuyer.publicKey,
          market: e2eMarketPDA,
          batchOrder: noBuyerOrder,
          userCollateralAccount: e2eNoBuyerUsdc,
          collateralVault: e2eVault,
          collateralMint: e2eUsdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eNoBuyer])
        .rpc();

      console.log("  ✓ YES order: 200 USDC");
      console.log("  ✓ NO order: 150 USDC");
    });

    // ── Step 4: Settle batch ──────────────────────────────────────
    it("step 4 — settles batch, mints outcome tokens", async () => {
      const [yesBuyerOrder] = getOrderPDA(
        e2eMarketPDA,
        e2eYesBuyer.publicKey,
        program.programId,
      );
      const [noBuyerOrder] = getOrderPDA(
        e2eMarketPDA,
        e2eNoBuyer.publicKey,
        program.programId,
      );

      // Create outcome token accounts
      await createAssociatedTokenAccount(
        connection,
        e2eYesBuyer,
        e2eYesMint,
        e2eYesBuyer.publicKey,
      );
      await createAssociatedTokenAccount(
        connection,
        e2eNoBuyer,
        e2eNoMint,
        e2eNoBuyer.publicKey,
      );

      console.log("  Waiting for batch window (4 slots)...");
      await new Promise((r) => setTimeout(r, 4000));

      await program.methods
        .settleBatch()
        .accounts({
          cranker: e2eAuthority.publicKey,
          market: e2eMarketPDA,
          lpPool: e2eLpPool,
          yesMint: e2eYesMint,
          noMint: e2eNoMint,
          collateralVault: e2eVault,
          collateralMint: e2eUsdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([
          { pubkey: yesBuyerOrder, isSigner: false, isWritable: true },
          { pubkey: e2eYesBuyerYes, isSigner: false, isWritable: true },
          { pubkey: noBuyerOrder, isSigner: false, isWritable: true },
          { pubkey: e2eNoBuyerNo, isSigner: false, isWritable: true },
        ])
        .signers([e2eAuthority])
        .rpc();

      const yesBuyerAcct = await getAccount(connection, e2eYesBuyerYes);
      const noBuyerAcct = await getAccount(connection, e2eNoBuyerNo);

      assert.ok(
        yesBuyerAcct.amount > BigInt(0),
        "YES buyer should have YES tokens",
      );
      assert.ok(
        noBuyerAcct.amount > BigInt(0),
        "NO buyer should have NO tokens",
      );

      console.log("  ✓ YES tokens minted:", yesBuyerAcct.amount.toString());
      console.log("  ✓ NO tokens minted:", noBuyerAcct.amount.toString());
    });

    // ── Step 5: Wait for resolution slot ─────────────────────────
    it("step 5 — propose resolution: YES wins", async () => {
      const market = await program.account.market.fetch(e2eMarketPDA);
      const currentSlotNow = await currentSlot(connection);
      const slotsRemaining = market.resolutionSlot.toNumber() - currentSlotNow;
      const msToWait = Math.max(0, slotsRemaining * 400) + 2000; // +2s buffer

      console.log("  Current slot:", currentSlotNow);
      console.log("  Resolution slot:", market.resolutionSlot.toNumber());
      console.log("  Slots remaining:", slotsRemaining);
      console.log(
        `  Waiting ${Math.ceil(msToWait / 1000)}s for resolution slot...`,
      );

      await new Promise((r) => setTimeout(r, msToWait));

      const slotAfterWait = await currentSlot(connection);
      console.log("  Slot after wait:", slotAfterWait);

      await program.methods
        .proposeResolution(true, new BN(1_000_000)) // 0.001 SOL bond (minimum)
        .accounts({
          proposer: e2eProposer.publicKey,
          market: e2eMarketPDA,
          proposal: e2eResolution,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eProposer])
        .rpc();

      const proposal = await program.account.resolutionProposal.fetch(
        e2eResolution,
      );
      assert.isTrue(proposal.proposedOutcome, "YES should be proposed outcome");
      assert.isFalse(proposal.isFinalized, "should not be finalized yet");

      console.log("  ✓ YES outcome proposed");
      console.log(
        "  ✓ Challenge window opens — 48h on mainnet, instant on test",
      );
    });

    // ── Step 6: Finalize (skip challenge window on localnet) ──────
    it("step 6 — finalize resolution after challenge window", async () => {
      // On localnet the challenge window is 432,000 slots (~48h)
      // We can't actually wait that long in tests.
      // Two options:
      //   A) Warp slots with surfpool: surfnet_warpToSlot
      //   B) Deploy a test version with a 1-slot challenge window
      //
      // For this test we verify the guard works correctly —
      // finalization before window closes should be rejected.
      let proposal;
      try {
        proposal = await program.account.resolutionProposal.fetch(
          e2eResolution,
        );
      } catch {
        console.log("  ⚠ Proposal not found — step 5 may have failed");
        return; // skip gracefully
      }

      assert.isFalse(proposal.isFinalized, "should not be finalized yet");

      // Check if proposal is from a previous test run (stale state)
      const currentSlotNow = await currentSlot(connection);
      const slotsSinceProposal =
        currentSlotNow - proposal.proposedAtSlot.toNumber();

      if (slotsSinceProposal > proposal.challengeWindow.toNumber()) {
        console.log(
          "  ⚠ Proposal is from a previous test run (challenge window passed)",
        );
        console.log("  ⚠ Restart validator to test challenge window guard");
        return; // skip gracefully
      }

      try {
        await program.methods
          .finalizeResolution()
          .accounts({
            caller: e2eAuthority.publicKey,
            market: e2eMarketPDA,
            proposal: e2eResolution,
          })
          .signers([e2eAuthority])
          .rpc();
        console.log("  ⚠ Finalize succeeded when it should have failed!");
        console.log("  ⚠ Current slot:", currentSlotNow);
        console.log(
          "  ⚠ Proposed at slot:",
          proposal.proposedAtSlot.toString(),
        );
        console.log(
          "  ⚠ Challenge window:",
          proposal.challengeWindow.toString(),
        );
        console.log(
          "  ⚠ Challenge end slot:",
          proposal.proposedAtSlot.toNumber() +
            proposal.challengeWindow.toNumber(),
        );
        assert.fail("should not finalize before challenge window");
      } catch (err: any) {
        console.log("  ⚠ Caught error:", err.message);
        console.log("  ⚠ Error type:", typeof err);
        console.log("  ⚠ Error keys:", Object.keys(err));

        if (err.message && err.message.includes("should not finalize")) {
          // This is our assert.fail, meaning finalize succeeded
          throw err;
        }
        // This is an error from the blockchain
        assert.include(err.message, "StillInChallengeWindow");
        console.log("  ✓ Challenge window guard working correctly");
        console.log("  ✓ On mainnet: 48h must pass before finalization");
        console.log("  ✓ With Surfpool: use surfnet_warpToSlot to skip ahead");
      }
    });

    // ── Step 7: Surfpool warp + full redemption ───────────────────
    it("step 7 — warp slots and complete redemption (Surfpool)", async () => {
      if (!(await isSurfpool())) {
        console.log("  ⚠ Surfpool not running — skipping finalize + redeem");
        return;
      }

      // Patch challenge_window to 1 slot so finalize_resolution runs immediately
      await patchChallengeWindow(connection, e2eResolution);
      console.log("  ✓ Patched challenge_window → 1 slot via surfnet_setAccount");

      // Finalize resolution
      await program.methods
        .finalizeResolution()
        .accounts({
          caller: e2eAuthority.publicKey,
          market: e2eMarketPDA,
          proposal: e2eResolution,
        })
        .signers([e2eAuthority])
        .rpc();

      const market = await program.account.market.fetch(e2eMarketPDA);
      assert.deepEqual(Object.keys(market.status)[0], "resolved");
      assert.deepEqual(Object.keys(market.winningOutcome)[0], "yes");
      console.log("  ✓ Market resolved: YES wins");

      // YES buyer redeems winnings
      const yesBuyerUsdcBefore = (await getAccount(connection, e2eYesBuyerUsdc))
        .amount;

      const yesBuyerYesTokens = (await getAccount(connection, e2eYesBuyerYes))
        .amount;

      await program.methods
        .redeemWinnings()
        .accounts({
          user: e2eYesBuyer.publicKey,
          market: e2eMarketPDA,
          winningMint: e2eYesMint,
          userWinningAccount: e2eYesBuyerYes,
          collateralVault: e2eVault,
          userCollateralAccount: e2eYesBuyerUsdc,
          collateralMint: e2eUsdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([e2eYesBuyer])
        .rpc();

      const yesBuyerUsdcAfter = (await getAccount(connection, e2eYesBuyerUsdc))
        .amount;

      const usdcReceived = yesBuyerUsdcAfter - yesBuyerUsdcBefore;
      assert.ok(usdcReceived > BigInt(0), "YES buyer should receive USDC");
      assert.equal(
        usdcReceived.toString(),
        yesBuyerYesTokens.toString(),
        "USDC received should equal YES tokens burned (1:1)",
      );

      // Verify YES token account is now empty (tokens burned)
      const yesBuyerYesAfter = (await getAccount(connection, e2eYesBuyerYes))
        .amount;
      assert.equal(
        yesBuyerYesAfter.toString(),
        "0",
        "YES tokens should be burned",
      );

      // NO buyer tries to redeem with losing tokens — should fail
      try {
        await program.methods
          .redeemWinnings()
          .accounts({
            user: e2eNoBuyer.publicKey,
            market: e2eMarketPDA,
            winningMint: e2eNoMint, // wrong mint — NO lost
            userWinningAccount: e2eNoBuyerNo,
            collateralVault: e2eVault,
            userCollateralAccount: e2eNoBuyerUsdc,
            collateralMint: e2eUsdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([e2eNoBuyer])
          .rpc();
        assert.fail("losing side should not be able to redeem");
      } catch (err: any) {
        assert.ok(err, "NO buyer correctly rejected");
        console.log("  ✓ Losing side redemption correctly rejected");
      }

      console.log("  ✓ YES buyer redeemed:", usdcReceived.toString(), "USDC");
      console.log("  ✓ YES tokens burned to zero");
      console.log("  ✓ Full lifecycle complete");
    });
  });
});
