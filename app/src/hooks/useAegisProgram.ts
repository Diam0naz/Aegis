"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram, AegisProgram } from "@aegis/sdk";

export function useAegisProgram(): AegisProgram | null {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  return useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    return getProgram(provider);
  }, [connection, anchorWallet]);
}
