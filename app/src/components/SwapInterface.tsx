"use client";

import { useState, useMemo, useCallback } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { BN } from "@coral-xyz/anchor";
import { buildSubmitOrder } from "@aegis/sdk";
import type { MockMarket } from "@/lib/mockData";
import { BatchCountdownLarge } from "@/components/BatchCountdown";
import { useAegisProgram } from "@/hooks/useAegisProgram";

interface SwapInterfaceProps {
  market: MockMarket;
  marketPubkey?: PublicKey;
  collateralMint?: PublicKey;
  usdcBalance?: number | null;
}

const DEVNET_USDC = process.env.NEXT_PUBLIC_USDC_MINT
  ? new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT)
  : null;

type TxStatus = "idle" | "building" | "signing" | "sending" | "confirmed" | "error";

export default function SwapInterface({
  market,
  marketPubkey,
  collateralMint,
  usdcBalance,
}: SwapInterfaceProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const program = useAegisProgram();

  const [toToken, setToToken] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txSig, setTxSig] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const balanceDisplay = usdcBalance != null ? usdcBalance : 0;

  const pricePercent = toToken === "YES" ? market.yesPrice : market.noPrice;
  const priceDecimal = pricePercent / 100;
  const numAmount = parseFloat(amount) || 0;

  const expectedOutput = useMemo(() => {
    if (numAmount <= 0 || priceDecimal <= 0) return 0;
    return numAmount / priceDecimal;
  }, [numAmount, priceDecimal]);

  const priceImpact = useMemo(() => {
    if (numAmount <= 0 || market.liquidity <= 0) return 0;
    return Math.min(15, parseFloat(((numAmount / market.liquidity) * 100).toFixed(2)));
  }, [numAmount, market.liquidity]);

  const feeAmount = useMemo(() => {
    if (numAmount <= 0) return 0;
    return (numAmount * market.feeBps) / 10000;
  }, [numAmount, market.feeBps]);

  const handlePercentage = (pct: number) => {
    if (usdcBalance == null || usdcBalance <= 0) return;
    setAmount((usdcBalance * pct).toFixed(2));
  };

  const handlePlaceOrder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    if (numAmount <= 0) return;
    if (market.status !== "active") return;

    if (!program) {
      setErrorMsg("Wallet not ready. Please reconnect.");
      return;
    }

    const mint = collateralMint ?? DEVNET_USDC;
    if (!mint) {
      setErrorMsg("USDC mint not configured. Set NEXT_PUBLIC_USDC_MINT in .env.local");
      return;
    }

    // Determine market PDA — use provided, or derive from question hash
    let mPubkey = marketPubkey;
    if (!mPubkey) {
      setErrorMsg("This is a demo market. Create an on-chain market first via 'Create Market'.");
      return;
    }

    try {
      setTxStatus("building");
      const amountLamports = new BN(Math.floor(numAmount * 1_000_000)); // USDC 6 decimals
      const outcome: { yes: Record<string, never> } | { no: Record<string, never> } =
        toToken === "YES" ? { yes: {} } : { no: {} };

      const ix = await buildSubmitOrder(program, {
        user: publicKey,
        market: mPubkey,
        collateralMint: mint,
        outcome,
        amount: amountLamports,
      });

      const tx = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      setTxStatus("signing");
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });

      setTxStatus("sending");
      await connection.confirmTransaction(sig, "confirmed");

      setTxStatus("confirmed");
      setTxSig(sig);
      setAmount("");
      setTimeout(() => { setTxStatus("idle"); setTxSig(null); }, 6000);
    } catch (err: any) {
      setTxStatus("error");
      setErrorMsg(err?.message ?? "Transaction failed");
      setTimeout(() => { setTxStatus("idle"); setErrorMsg(""); }, 5000);
    }
  }, [connected, publicKey, numAmount, market, program, marketPubkey, collateralMint, toToken, sendTransaction, connection, setVisible]);

  const isSubmitting = txStatus === "building" || txStatus === "signing" || txStatus === "sending";

  const btnLabel = () => {
    if (!connected) return "CONNECT WALLET";
    if (market.status !== "active") return "MARKET NOT ACTIVE";
    if (txStatus === "building") return "Building Tx...";
    if (txStatus === "signing") return "Waiting for Signature...";
    if (txStatus === "sending") return "Sending...";
    if (txStatus === "confirmed") return "✓ Order Placed!";
    return `BUY ${toToken} — BATCH ORDER`;
  };

  return (
    <div className="swap-interface">
      <div className="swap-header">
        <span className="swap-title">BATCH ORDER SWAP</span>
        <span className="logo-badge" style={{ fontSize: "8px" }}>BATCH SETTLED</span>
      </div>

      <form onSubmit={handlePlaceOrder} noValidate>
        {/* From Box — USDC input */}
        <div className="swap-box">
          <div className="swap-box-header">
            <span>From (USDC)</span>
            <span className="font-mono">
              Balance: {usdcBalance != null ? balanceDisplay.toLocaleString() : "—"} USDC
            </span>
          </div>
          <div className="swap-box-input-row">
            <input
              type="number"
              placeholder="0.0"
              className="swap-input"
              value={amount}
              min="0"
              step="any"
              onChange={(e) => setAmount(e.target.value)}
              disabled={market.status !== "active" || isSubmitting}
            />
            <div className="swap-token-selector">USDC</div>
          </div>
          {market.status === "active" && usdcBalance != null && (
            <div className="percentage-quick-row">
              {([0.25, 0.5, 0.75, 1.0] as const).map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className="percent-btn"
                  onClick={() => handlePercentage(pct)}
                >
                  {pct === 1 ? "MAX" : `${pct * 100}%`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="swap-flip-btn-row">
          <div className="swap-flip-btn" style={{ cursor: "default" }}>↓</div>
        </div>

        {/* To Box — outcome selection */}
        <div className="swap-box" style={{ marginTop: "4px" }}>
          <div className="swap-box-header">
            <span>To (Expected Shares)</span>
            <span className="font-mono">Price: {pricePercent}¢</span>
          </div>
          <div className="swap-box-input-row">
            <div className="swap-input font-mono" style={{ padding: "4px 0", fontSize: "22px" }}>
              {expectedOutput > 0 ? expectedOutput.toFixed(2) : "0.0"}
            </div>
            <select
              className="swap-token-selector"
              value={toToken}
              onChange={(e) => { setToToken(e.target.value as "YES" | "NO"); setAmount(""); }}
              style={{ border: "none", outline: "none", cursor: "pointer", background: "#272730" }}
            >
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>
        </div>

        {/* Info row */}
        {numAmount > 0 && (
          <div className="swap-info-box">
            <div className="swap-info-row">
              <span>Implied Probability</span>
              <span className="font-mono" style={{ color: toToken === "YES" ? "var(--yes)" : "var(--no)" }}>
                {pricePercent}%
              </span>
            </div>
            <div className="swap-info-row">
              <span>Price Impact</span>
              <span className="font-mono" style={{ color: priceImpact > 5 ? "var(--no)" : "var(--text)" }}>
                {priceImpact}%
              </span>
            </div>
            <div className="swap-info-row">
              <span>Protocol Fee ({(market.feeBps / 100).toFixed(2)}%)</span>
              <span className="font-mono">${feeAmount.toFixed(4)} USDC</span>
            </div>
            <div className="swap-info-row">
              <span>Net Payout If {toToken} Wins</span>
              <span className="font-mono" style={{ color: "var(--yes)" }}>
                ${(numAmount - feeAmount).toFixed(2)} USDC
              </span>
            </div>
          </div>
        )}

        <BatchCountdownLarge />

        {errorMsg && (
          <div className="font-mono" style={{ color: "var(--no)", fontSize: "11px", marginTop: "10px", padding: "8px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px" }}>
            ⚠ {errorMsg}
          </div>
        )}

        {txStatus === "confirmed" && txSig && (
          <div style={{ color: "var(--yes)", fontSize: "11px", marginTop: "10px", padding: "8px 10px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "6px" }} className="font-mono">
            ✓ Order queued!{" "}
            <a
              href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--primary)", textDecoration: "underline" }}
            >
              View on Solscan
            </a>
          </div>
        )}

        <button
          type="submit"
          className="place-order-btn"
          disabled={
            (market.status !== "active") ||
            (connected && numAmount <= 0) ||
            isSubmitting ||
            txStatus === "confirmed"
          }
          style={{ background: txStatus === "confirmed" ? "var(--yes)" : "" }}
        >
          {btnLabel()}
        </button>
      </form>
    </div>
  );
}
