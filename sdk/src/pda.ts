import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./idl";

const PROGRAM = new PublicKey(PROGRAM_ID);

export function marketPda(authority: PublicKey, questionHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), authority.toBuffer(), Buffer.from(questionHash)],
    PROGRAM
  );
}

export function lpPoolPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("lp_pool"), market.toBuffer()], PROGRAM);
}

export function lpMintPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("lp_mint"), market.toBuffer()], PROGRAM);
}

export function yesMintPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("yes_mint"), market.toBuffer()], PROGRAM);
}

export function noMintPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("no_mint"), market.toBuffer()], PROGRAM);
}

export function batchOrderPda(market: PublicKey, user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), market.toBuffer(), user.toBuffer()],
    PROGRAM
  );
}

export function resolutionPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("resolution"), market.toBuffer()], PROGRAM);
}

export function oracleConfigPda(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_config"), market.toBuffer()],
    PROGRAM
  );
}

export function oracleVotePda(market: PublicKey, oracle: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_vote"), market.toBuffer(), oracle.toBuffer()],
    PROGRAM
  );
}
