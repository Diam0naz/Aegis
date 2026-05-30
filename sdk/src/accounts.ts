import { PublicKey } from "@solana/web3.js";
import { AegisProgram } from "./instructions";
import {
  marketPda,
  lpPoolPda,
  batchOrderPda,
  resolutionPda,
  oracleConfigPda,
  oracleVotePda,
} from "./pda";

export async function fetchMarket(program: AegisProgram, address: PublicKey) {
  return program.account.market.fetch(address);
}

export async function fetchMarketBySeeds(
  program: AegisProgram,
  authority: PublicKey,
  questionHash: Uint8Array,
) {
  const [pda] = marketPda(authority, questionHash);
  return program.account.market.fetch(pda);
}

export async function fetchAllMarkets(program: AegisProgram) {
  return program.account.market.all();
}

export async function fetchLpPool(program: AegisProgram, market: PublicKey) {
  const [pda] = lpPoolPda(market);
  return program.account.lpPool.fetch(pda);
}

export async function fetchBatchOrder(
  program: AegisProgram,
  market: PublicKey,
  user: PublicKey,
) {
  const [pda] = batchOrderPda(market, user);
  return program.account.batchOrder.fetch(pda);
}

export async function fetchBatchOrderByAddress(
  program: AegisProgram,
  address: PublicKey,
) {
  return program.account.batchOrder.fetch(address);
}

export async function fetchOpenOrdersForMarket(
  program: AegisProgram,
  market: PublicKey,
) {
  return program.account.batchOrder.all([
    { memcmp: { offset: 8, bytes: market.toBase58() } },
  ]);
}

export async function fetchResolutionProposal(
  program: AegisProgram,
  market: PublicKey,
) {
  const [pda] = resolutionPda(market);
  return program.account.resolutionProposal.fetch(pda);
}

export async function fetchOracleConfig(
  program: AegisProgram,
  market: PublicKey,
) {
  const [pda] = oracleConfigPda(market);
  return program.account.oracleConfig.fetch(pda);
}

export async function fetchOracleVote(
  program: AegisProgram,
  market: PublicKey,
  oracle: PublicKey,
) {
  const [pda] = oracleVotePda(market, oracle);
  return program.account.oracleVote.fetch(pda);
}
