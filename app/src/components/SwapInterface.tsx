"use client";

import { useState, useMemo } from "react";
import type { MockMarket, Outcome } from "@/lib/mockData";
import { formatUsdc } from "@/lib/utils";
import { BatchCountdownLarge } from "@/components/BatchCountdown";

interface SwapInterfaceProps {
  market: MockMarket;
}

export default function SwapInterface({ market }: SwapInterfaceProps) {
  const [fromToken, setFromToken] = useState<"USDC" | "YES" | "NO">("USDC");
  const [toToken, setToToken] = useState<"YES" | "NO" | "USDC">("YES");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const usdcBalance = 1250.0;
  const yesSharesBalance = 500;
  const noSharesBalance = 0;

  // Derive price based on outcome
  const activeOutcome = useMemo(() => {
    if (fromToken === "YES" || toToken === "YES") return "yes";
    return "no";
  }, [fromToken, toToken]);

  const pricePercent = activeOutcome === "yes" ? market.yesPrice : market.noPrice;
  const priceDecimal = pricePercent / 100;

  const currentBalance = useMemo(() => {
    if (fromToken === "USDC") return usdcBalance;
    if (fromToken === "YES") return yesSharesBalance;
    return noSharesBalance;
  }, [fromToken]);

  const handlePercentage = (percent: number) => {
    const calculated = (currentBalance * percent).toFixed(2);
    setAmount(calculated);
  };

  const handleFlip = () => {
    if (fromToken === "USDC") {
      setFromToken(toToken === "YES" ? "YES" : "NO");
      setToToken("USDC");
    } else {
      setToToken(fromToken === "YES" ? "YES" : "NO");
      setFromToken("USDC");
    }
    setAmount("");
  };

  const numAmount = parseFloat(amount) || 0;

  // Expected output calculation
  const expectedOutput = useMemo(() => {
    if (numAmount <= 0) return 0;
    if (fromToken === "USDC") {
      // Buying YES/NO shares with USDC
      return numAmount / priceDecimal;
    } else {
      // Selling YES/NO shares for USDC
      return numAmount * priceDecimal;
    }
  }, [numAmount, fromToken, priceDecimal]);

  // Price impact calculation
  const priceImpact = useMemo(() => {
    if (numAmount <= 0) return 0;
    const impact = (numAmount / market.liquidity) * 100;
    return Math.min(15, parseFloat(impact.toFixed(2)));
  }, [numAmount, market.liquidity]);

  // Fees
  const feePercent = market.feeBps / 100;
  const feeAmount = useMemo(() => {
    if (numAmount <= 0) return 0;
    return (numAmount * market.feeBps) / 10000;
  }, [numAmount, market.feeBps]);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) return;
    if (numAmount > currentBalance) {
      setErrorMsg("Insufficient balance");
      return;
    }
    setErrorMsg("");
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setAmount("");
    }, 3000);
  };

  return (
    <div className="swap-interface">
      <div className="swap-header">
        <span className="swap-title">BATCH ORDER SWAP</span>
        <span className="logo-badge" style={{ fontSize: "8px", verticalAlign: "middle" }}>
          BATCH SETTLED
        </span>
      </div>

      <form onSubmit={handlePlaceOrder} noValidate>
        {/* From Box */}
        <div className="swap-box">
          <div className="swap-box-header">
            <span>From</span>
            <span className="font-mono">
              Balance: {currentBalance.toLocaleString()} {fromToken}
            </span>
          </div>
          <div className="swap-box-input-row">
            <input
              type="number"
              placeholder="0.0"
              className="swap-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={market.status !== "active"}
            />
            <div className="swap-token-selector">{fromToken}</div>
          </div>
          {/* Quick percentage buttons */}
          {market.status === "active" && (
            <div className="percentage-quick-row">
              <button type="button" className="percent-btn" onClick={() => handlePercentage(0.25)}>
                25%
              </button>
              <button type="button" className="percent-btn" onClick={() => handlePercentage(0.5)}>
                50%
              </button>
              <button type="button" className="percent-btn" onClick={() => handlePercentage(0.75)}>
                75%
              </button>
              <button type="button" className="percent-btn" onClick={() => handlePercentage(1.0)}>
                MAX
              </button>
            </div>
          )}
        </div>

        {/* Flip Direction Button */}
        <div className="swap-flip-btn-row">
          <button type="button" className="swap-flip-btn" onClick={handleFlip} aria-label="Flip swap direction">
            ⇅
          </button>
        </div>

        {/* To Box */}
        <div className="swap-box" style={{ marginTop: "4px" }}>
          <div className="swap-box-header">
            <span>To (Expected)</span>
            <span className="font-mono">
              Price: {pricePercent}¢
            </span>
          </div>
          <div className="swap-box-input-row">
            <div className="swap-input font-mono" style={{ padding: "4px 0", fontSize: "22px" }}>
              {expectedOutput > 0 ? expectedOutput.toFixed(2) : "0.0"}
            </div>
            {fromToken === "USDC" ? (
              <select
                className="swap-token-selector"
                value={toToken}
                onChange={(e) => {
                  setToToken(e.target.value as any);
                  setAmount("");
                }}
                style={{ border: "none", outline: "none", cursor: "pointer" }}
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            ) : (
              <div className="swap-token-selector">USDC</div>
            )}
          </div>
        </div>

        {/* Expected calculations list */}
        {numAmount > 0 && (
          <div className="swap-info-box">
            <div className="swap-info-row">
              <span>Rate</span>
              <span className="font-mono">
                1 {fromToken === "USDC" ? (toToken === "YES" ? "YES" : "NO") : fromToken} = {pricePercent}¢
              </span>
            </div>
            <div className="swap-info-row">
              <span>Price Impact</span>
              <span className="font-mono" style={{ color: priceImpact > 5 ? "var(--no)" : "var(--text)" }}>
                {priceImpact}%
              </span>
            </div>
            <div className="swap-info-row">
              <span>Protocol Fee ({feePercent}%)</span>
              <span className="font-mono">${feeAmount.toFixed(2)} USDC</span>
            </div>
          </div>
        )}

        {/* Batch countdown block */}
        <BatchCountdownLarge />

        {errorMsg && (
          <div className="font-mono" style={{ color: "var(--no)", fontSize: "11px", marginTop: "10px", textAlign: "center" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="place-order-btn"
          disabled={numAmount <= 0 || market.status !== "active" || submitted}
        >
          {submitted ? "Queued in Batch..." : "Place Batch Order"}
        </button>

        {submitted && (
          <div
            className="font-mono"
            style={{
              color: "var(--primary)",
              fontSize: "11px",
              marginTop: "8px",
              textAlign: "center",
              animation: "pulse-amber 1.5s infinite",
            }}
          >
            ✓ Order placed! Settles in next batch.
          </div>
        )}
      </form>
    </div>
  );
}
