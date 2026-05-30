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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const acct = (program: AegisProgram) => (program.account as any);

export async function fetchMarket(program: AegisProgram, address: PublicKey) {
  return acct(program).market.fetch(address);
}

export async function fetchMarketBySeeds(
  program: AegisProgram,
  authority: PublicKey,
  questionHash: Uint8Array,
) {
  const [pda] = marketPda(authority, questionHash);
  return acct(program).market.fetch(pda);
}

export async function fetchAllMarkets(program: AegisProgram) {
  return acct(program).market.all();
}

export async function fetchLpPool(program: AegisProgram, market: PublicKey) {
  const [pda] = lpPoolPda(market);
  return acct(program).lpPool.fetch(pda);
}

export async function fetchBatchOrder(
  program: AegisProgram,
  market: PublicKey,
  user: PublicKey,
) {
  const [pda] = batchOrderPda(market, user);
  return acct(program).batchOrder.fetch(pda);
}

export async function fetchBatchOrderByAddress(
  program: AegisProgram,
  address: PublicKey,
) {
  return acct(program).batchOrder.fetch(address);
}

export async function fetchOpenOrdersForMarket(
  program: AegisProgram,
  market: PublicKey,
) {
  return acct(program).batchOrder.all([
    { memcmp: { offset: 8, bytes: market.toBase58() } },
  ]);
}

export async function fetchResolutionProposal(
  program: AegisProgram,
  market: PublicKey,
) {
  const [pda] = resolutionPda(market);
  return acct(program).resolutionProposal.fetch(pda);
}

export async function fetchOracleConfig(
  program: AegisProgram,
  market: PublicKey,
) {
  const [pda] = oracleConfigPda(market);
  return acct(program).oracleConfig.fetch(pda);
}

export async function fetchOracleVote(
  program: AegisProgram,
  market: PublicKey,
  oracle: PublicKey,
) {
  const [pda] = oracleVotePda(market, oracle);
  return acct(program).oracleVote.fetch(pda);
}
