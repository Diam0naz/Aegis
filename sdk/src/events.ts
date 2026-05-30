import { BorshCoder, EventParser } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { IDL, PROGRAM_ID } from "./idl";

const coder = new BorshCoder(IDL);
const parser = new EventParser(new PublicKey(PROGRAM_ID), coder);

export type AegisEvent =
  | { name: "OrderSubmitted"; data: OrderSubmittedEvent }
  | { name: "OrderRevealed"; data: OrderRevealedEvent }
  | { name: "BatchSettled"; data: BatchSettledEvent }
  | { name: "LiquidityAdded"; data: LiquidityAddedEvent }
  | { name: "LiquidityRemoved"; data: LiquidityRemovedEvent }
  | { name: "MarketCreated"; data: MarketCreatedEvent }
  | { name: "MarketPaused"; data: MarketPausedEvent }
  | { name: "MarketUnpaused"; data: MarketUnpausedEvent }
  | { name: "ResolutionProposed"; data: ResolutionProposedEvent }
  | { name: "ResolutionFinalized"; data: ResolutionFinalizedEvent }
  | { name: "OracleVoteSubmitted"; data: OracleVoteSubmittedEvent }
  | { name: "OracleTallyComplete"; data: OracleTallyCompleteEvent }
  | { name: "WinningsRedeemed"; data: WinningsRedeemedEvent };

export interface OrderSubmittedEvent {
  market: PublicKey;
  user: PublicKey;
  outcome: { yes?: Record<string, never>; no?: Record<string, never> };
  amount: bigint;
  batchSlotStart: bigint;
  priceBefore: bigint;
}

export interface OrderRevealedEvent {
  market: PublicKey;
  user: PublicKey;
  outcome: { yes?: Record<string, never>; no?: Record<string, never> };
  amount: bigint;
  batchSlotStart: bigint;
}

export interface BatchSettledEvent {
  market: PublicKey;
  clearingPriceBps: bigint;
  netYes: bigint;
  netNo: bigint;
  matched: bigint;
  crankTip: bigint;
  totalFees: bigint;
  ordersFilled: number;
  newBatchSlotStart: bigint;
}

export interface LiquidityAddedEvent {
  market: PublicKey;
  lp: PublicKey;
  usdcAmount: bigint;
  lpTokensMinted: bigint;
  newTotalLiquidity: bigint;
}

export interface LiquidityRemovedEvent {
  market: PublicKey;
  lp: PublicKey;
  lpTokensBurned: bigint;
  usdcReturned: bigint;
  newTotalLiquidity: bigint;
}

export interface MarketCreatedEvent {
  market: PublicKey;
  authority: PublicKey;
  questionHash: number[];
  bParam: bigint;
  resolutionSlot: bigint;
  timestamp: bigint;
}

export interface MarketPausedEvent { market: PublicKey; pausedBy: PublicKey }
export interface MarketUnpausedEvent { market: PublicKey; unpausedBy: PublicKey }

export interface ResolutionProposedEvent {
  market: PublicKey;
  proposer: PublicKey;
  proposedOutcome: boolean;
  bondAmount: bigint;
  proposedAtSlot: bigint;
  challengeWindow: bigint;
}

export interface ResolutionFinalizedEvent {
  market: PublicKey;
  winningOutcome: { yes?: Record<string, never>; no?: Record<string, never> };
  proposer: PublicKey;
}

export interface OracleVoteSubmittedEvent {
  market: PublicKey;
  oracle: PublicKey;
  outcome: boolean;
  bondAmount: bigint;
}

export interface OracleTallyCompleteEvent {
  market: PublicKey;
  yesVotes: number;
  noVotes: number;
  proposedOutcome: boolean;
  totalSlashed: bigint;
}

export interface WinningsRedeemedEvent {
  market: PublicKey;
  user: PublicKey;
  tokensBurned: bigint;
  usdcPaid: bigint;
  outcome: { yes?: Record<string, never>; no?: Record<string, never> };
}

/** Parse all Aegis events from a transaction's log messages. */
export function parseEvents(logs: string[]): AegisEvent[] {
  const events: AegisEvent[] = [];
  for (const event of parser.parseLogs(logs)) {
    events.push(event as AegisEvent);
  }
  return events;
}

/** Fetch a confirmed transaction and return its parsed Aegis events. */
export async function fetchTransactionEvents(
  connection: Connection,
  signature: string
): Promise<AegisEvent[]> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta?.logMessages) return [];
  return parseEvents(tx.meta.logMessages);
}
