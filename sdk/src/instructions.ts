import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { IDL } from "./idl";
import {
  marketPda,
  lpPoolPda,
  lpMintPda,
  yesMintPda,
  noMintPda,
  batchOrderPda,
  resolutionPda,
  oracleConfigPda,
  oracleVotePda,
} from "./pda";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AegisProgram = Program<any>;

export function getProgram(provider: AnchorProvider): AegisProgram {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program(IDL as any, provider);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const m = (p: AegisProgram): any => p.methods;

// ── create_market ─────────────────────────────────────────────────

export async function buildCreateMarket(
  program: AegisProgram,
  params: {
    authority: PublicKey;
    collateralMint: PublicKey;
    questionHash: Uint8Array;
    bParam: BN;
    batchWindowSlots: BN;
    resolutionSlot: BN;
    feeBps: number;
    creatorFeeBps: number;
    tokenProgram?: PublicKey;
  }
): Promise<TransactionInstruction> {
  const tp = params.tokenProgram ?? TOKEN_PROGRAM_ID;
  const [market] = marketPda(params.authority, params.questionHash);
  const [yesMint] = yesMintPda(market);
  const [noMint] = noMintPda(market);
  const collateralVault = getAssociatedTokenAddressSync(params.collateralMint, market, true, tp);

  return m(program)
    .create_market(
      Array.from(params.questionHash) as number[] & { length: 32 },
      params.bParam,
      params.batchWindowSlots,
      params.resolutionSlot,
      params.feeBps,
      params.creatorFeeBps
    )
    .accounts({
      authority: params.authority,
      market,
      collateralMint: params.collateralMint,
      yesMint,
      noMint,
      collateralVault,
      creatorFeeVault: getAssociatedTokenAddressSync(params.collateralMint, params.authority, false, tp),
      tokenProgram: tp,
    })
    .instruction();
}

// ── add_liquidity ─────────────────────────────────────────────────

export async function buildAddLiquidity(
  program: AegisProgram,
  params: {
    lp: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    usdcAmount: BN;
    tokenProgram?: PublicKey;
  }
): Promise<TransactionInstruction> {
  const tp = params.tokenProgram ?? TOKEN_PROGRAM_ID;
  const [lpPool] = lpPoolPda(params.market);
  const [lpMint] = lpMintPda(params.market);
  const lpCollateralAccount = getAssociatedTokenAddressSync(params.collateralMint, params.lp, false, tp);
  const collateralVault = getAssociatedTokenAddressSync(params.collateralMint, params.market, true, tp);
  const lpTokenAccount = getAssociatedTokenAddressSync(lpMint, params.lp, false, tp);

  return m(program)
    .add_liquidity(params.usdcAmount)
    .accounts({
      lp: params.lp,
      market: params.market,
      lpPool,
      lpMint,
      lpCollateralAccount,
      collateralVault,
      lpTokenAccount,
      collateralMint: params.collateralMint,
      tokenProgram: tp,
    })
    .instruction();
}

// ── remove_liquidity ──────────────────────────────────────────────

export async function buildRemoveLiquidity(
  program: AegisProgram,
  params: {
    lp: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    collateralVault: PublicKey;
    lpTokenAmount: BN;
    tokenProgram?: PublicKey;
  }
): Promise<TransactionInstruction> {
  const tp = params.tokenProgram ?? TOKEN_PROGRAM_ID;
  const [lpPool] = lpPoolPda(params.market);
  const [lpMint] = lpMintPda(params.market);
  const lpTokenAccount = getAssociatedTokenAddressSync(lpMint, params.lp, false, tp);
  const lpCollateralAccount = getAssociatedTokenAddressSync(params.collateralMint, params.lp, false, tp);

  return m(program)
    .remove_liquidity(params.lpTokenAmount)
    .accounts({
      lp: params.lp,
      market: params.market,
      lpPool,
      lpMint,
      lpTokenAccount,
      lpCollateralAccount,
      collateralVault: params.collateralVault,
      collateralMint: params.collateralMint,
      tokenProgram: tp,
    })
    .instruction();
}

// ── submit_order ──────────────────────────────────────────────────

export async function buildSubmitOrder(
  program: AegisProgram,
  params: {
    user: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    outcome: { yes: Record<string, never> } | { no: Record<string, never> };
    amount: BN;
    commitmentHash?: Uint8Array;
    tokenProgram?: PublicKey;
  }
): Promise<TransactionInstruction> {
  const tp = params.tokenProgram ?? TOKEN_PROGRAM_ID;
  const [batchOrder] = batchOrderPda(params.market, params.user);
  const userCollateralAccount = getAssociatedTokenAddressSync(params.collateralMint, params.user, false, tp);
  const collateralVault = getAssociatedTokenAddressSync(params.collateralMint, params.market, true, tp);
  const hash = params.commitmentHash ? Array.from(params.commitmentHash) as number[] & { length: 32 } : null;

  return m(program)
    .submit_order(params.outcome, params.amount, hash)
    .accounts({
      user: params.user,
      market: params.market,
      batchOrder,
      userCollateralAccount,
      collateralVault,
      collateralMint: params.collateralMint,
      tokenProgram: tp,
    })
    .instruction();
}

// ── reveal_order ──────────────────────────────────────────────────

export async function buildRevealOrder(
  program: AegisProgram,
  params: {
    user: PublicKey;
    market: PublicKey;
    outcome: { yes: Record<string, never> } | { no: Record<string, never> };
    amount: BN;
    nonce: Uint8Array;
  }
): Promise<TransactionInstruction> {
  const [batchOrder] = batchOrderPda(params.market, params.user);

  return m(program)
    .reveal_order(params.outcome, params.amount, Array.from(params.nonce) as number[] & { length: 32 })
    .accounts({
      user: params.user,
      market: params.market,
      batchOrder,
    })
    .instruction();
}

// ── settle_batch ──────────────────────────────────────────────────

export async function buildSettleBatch(
  program: AegisProgram,
  params: {
    cranker: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    creatorFeeAccount: PublicKey;
    /** Interleaved: [orderPda, userTokenAccount, orderPda, userTokenAccount, ...] */
    remainingAccounts: { pubkey: PublicKey; isWritable: boolean; isSigner: boolean }[];
    tokenProgram?: PublicKey;
  }
): Promise<TransactionInstruction> {
  const tp = params.tokenProgram ?? TOKEN_PROGRAM_ID;
  const [lpPool] = lpPoolPda(params.market);
  const [yesMint] = yesMintPda(params.market);
  const [noMint] = noMintPda(params.market);
  const collateralVault = getAssociatedTokenAddressSync(params.collateralMint, params.market, true, tp);
  const crankerCollateralAccount = getAssociatedTokenAddressSync(params.collateralMint, params.cranker, false, tp);

  return m(program)
    .settle_batch()
    .accounts({
      cranker: params.cranker,
      market: params.market,
      lpPool,
      yesMint,
      noMint,
      collateralVault,
      crankerCollateralAccount,
      creatorFeeAccount: params.creatorFeeAccount,
      collateralMint: params.collateralMint,
      tokenProgram: tp,
    })
    .remainingAccounts(params.remainingAccounts)
    .instruction();
}

// ── propose_resolution ────────────────────────────────────────────

export async function buildProposeResolution(
  program: AegisProgram,
  params: {
    proposer: PublicKey;
    market: PublicKey;
    proposedOutcome: boolean;
    bondAmount: BN;
  }
): Promise<TransactionInstruction> {
  const [proposal] = resolutionPda(params.market);

  return m(program)
    .propose_resolution(params.proposedOutcome, params.bondAmount)
    .accounts({
      proposer: params.proposer,
      market: params.market,
      proposal,
    })
    .instruction();
}

// ── finalize_resolution ───────────────────────────────────────────

export async function buildFinalizeResolution(
  program: AegisProgram,
  params: { caller: PublicKey; market: PublicKey }
): Promise<TransactionInstruction> {
  const [proposal] = resolutionPda(params.market);

  return m(program)
    .finalize_resolution()
    .accounts({ caller: params.caller, market: params.market, proposal })
    .instruction();
}

// ── check_price_resolution ────────────────────────────────────────

export async function buildCheckPriceResolution(
  program: AegisProgram,
  params: { caller: PublicKey; market: PublicKey; priceFeed: PublicKey; bondAmount: BN }
): Promise<TransactionInstruction> {
  const [proposal] = resolutionPda(params.market);

  return m(program)
    .check_price_resolution(params.bondAmount)
    .accounts({
      caller: params.caller,
      market: params.market,
      priceFeed: params.priceFeed,
      proposal,
    })
    .instruction();
}

// ── redeem_winnings ───────────────────────────────────────────────

export async function buildRedeemWinnings(
  program: AegisProgram,
  params: {
    user: PublicKey;
    market: PublicKey;
    winningMint: PublicKey;
    collateralMint: PublicKey;
    collateralVault: PublicKey;
    tokenProgram?: PublicKey;
  }
): Promise<TransactionInstruction> {
  const tp = params.tokenProgram ?? TOKEN_PROGRAM_ID;
  const userWinningAccount = getAssociatedTokenAddressSync(params.winningMint, params.user, false, tp);
  const userCollateralAccount = getAssociatedTokenAddressSync(params.collateralMint, params.user, false, tp);

  return m(program)
    .redeem_winnings()
    .accounts({
      user: params.user,
      market: params.market,
      winningMint: params.winningMint,
      userWinningAccount,
      collateralVault: params.collateralVault,
      userCollateralAccount,
      collateralMint: params.collateralMint,
      tokenProgram: tp,
    })
    .instruction();
}

// ── submit_oracle_vote ────────────────────────────────────────────

export async function buildSubmitOracleVote(
  program: AegisProgram,
  params: { oracle: PublicKey; market: PublicKey; outcome: boolean; bondAmount: BN }
): Promise<TransactionInstruction> {
  const [oracleConfig] = oracleConfigPda(params.market);
  const [oracleVote] = oracleVotePda(params.market, params.oracle);

  return m(program)
    .submit_oracle_vote(params.outcome, params.bondAmount)
    .accounts({
      oracle: params.oracle,
      market: params.market,
      oracleConfig,
      oracleVote,
    })
    .instruction();
}

// ── tally_oracle_votes ────────────────────────────────────────────

export async function buildTallyOracleVotes(
  program: AegisProgram,
  params: { caller: PublicKey; market: PublicKey; bondAmount: BN }
): Promise<TransactionInstruction> {
  const [oracleConfig] = oracleConfigPda(params.market);
  const [proposal] = resolutionPda(params.market);

  return m(program)
    .tally_oracle_votes(params.bondAmount)
    .accounts({
      caller: params.caller,
      market: params.market,
      oracleConfig,
      proposal,
    })
    .instruction();
}

// ── pause_market ──────────────────────────────────────────────────

export async function buildPauseMarket(
  program: AegisProgram,
  params: { authority: PublicKey; market: PublicKey }
): Promise<TransactionInstruction> {
  return m(program)
    .pause_market()
    .accounts({ authority: params.authority, market: params.market })
    .instruction();
}

// ── unpause_market ────────────────────────────────────────────────

export async function buildUnpauseMarket(
  program: AegisProgram,
  params: { authority: PublicKey; market: PublicKey }
): Promise<TransactionInstruction> {
  return m(program)
    .unpause_market()
    .accounts({ authority: params.authority, market: params.market })
    .instruction();
}
