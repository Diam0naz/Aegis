"use client";

import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAegisProgram } from "./useAegisProgram";

export interface UserBatchOrder {
  address: string;
  marketAddress: string;
  outcome: "yes" | "no";
  amount: number;
  isFilled: boolean;
  isRevealed: boolean;
}

export interface UserTokenBalance {
  mint: string;
  amount: number;
  symbol: string;
}

export function useUserPositions() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const program = useAegisProgram();

  const [pendingOrders, setPendingOrders] = useState<UserBatchOrder[]>([]);
  const [tokenBalances, setTokenBalances] = useState<UserTokenBalance[]>([]);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey || !program) {
      setPendingOrders([]);
      setTokenBalances([]);
      setUsdcBalance(null);
      return;
    }

    setLoading(true);

    const usdcMintStr = process.env.NEXT_PUBLIC_USDC_MINT;

    const fetchData = async () => {
      try {
        // Fetch all batch orders for this user
        const allOrders = await (program.account as any).batchOrder.all([
          { memcmp: { offset: 8 + 32, bytes: publicKey.toBase58() } },
        ]);

        const orders: UserBatchOrder[] = allOrders.map(({ publicKey: pk, account }: any) => ({
          address: pk.toBase58(),
          marketAddress: account.market?.toBase58?.() ?? "",
          outcome: account.outcome?.yes !== undefined ? "yes" : "no",
          amount: account.amount?.toNumber?.() ?? 0,
          isFilled: account.is_filled ?? false,
          isRevealed: account.is_revealed ?? true,
        }));
        setPendingOrders(orders.filter((o) => !o.isFilled));

        // Fetch USDC balance if mint is configured
        if (usdcMintStr) {
          try {
            const usdcMint = new PublicKey(usdcMintStr);
            const ata = getAssociatedTokenAddressSync(usdcMint, publicKey, false, TOKEN_PROGRAM_ID);
            const bal = await connection.getTokenAccountBalance(ata);
            setUsdcBalance(bal.value.uiAmount ?? 0);
          } catch {
            setUsdcBalance(0);
          }
        }
      } catch (e) {
        console.error("Failed to fetch user positions:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [publicKey, program, connection]);

  return { pendingOrders, tokenBalances, usdcBalance, loading };
}
