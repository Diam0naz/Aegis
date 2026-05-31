"use client";

import { useState } from "react";
import type { MockMarket } from "@/lib/mockData";
import { formatDollar } from "@/lib/utils";

interface Props {
  market: MockMarket;
}

type Tab = "trade" | "liquidity";

export default function TradePanel({ market }: Props) {
  const [tab, setTab] = useState<Tab>("trade");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lpAmount, setLpAmount] = useState("");
  const [lpSubmitted, setLpSubmitted] = useState(false);

  const isDisabled = market.status !== "active";
  const numAmount = parseFloat(amount) || 0;
  const estimatedShares =
    numAmount > 0 ? (numAmount / (side === "yes" ? market.yesPrice / 100 : market.noPrice / 100)).toFixed(2) : "—";
  const potentialPayout =
    numAmount > 0 ? (numAmount / (side === "yes" ? market.yesPrice / 100 : market.noPrice / 100)).toFixed(2) : "—";

  function handleTrade(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || numAmount <= 0) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setAmount("");
    }, 2500);
  }

  function handleLp(e: React.FormEvent) {
    e.preventDefault();
    if (!lpAmount || parseFloat(lpAmount) <= 0) return;
    setLpSubmitted(true);
    setTimeout(() => {
      setLpSubmitted(false);
      setLpAmount("");
    }, 2500);
  }

  return (
    <div className="trade-panel">
      {/* Tabs */}
      <div className="panel-tabs" role="tablist">
        <button
          id="tab-trade"
          role="tab"
          aria-selected={tab === "trade"}
          className={`panel-tab ${tab === "trade" ? "active" : ""}`}
          onClick={() => setTab("trade")}
        >
          Trade
        </button>
        <button
          id="tab-liquidity"
          role="tab"
          aria-selected={tab === "liquidity"}
          className={`panel-tab ${tab === "liquidity" ? "active" : ""}`}
          onClick={() => setTab("liquidity")}
        >
          Liquidity
        </button>
      </div>

      {/* Trade Tab */}
      {tab === "trade" && (
        <div role="tabpanel" aria-labelledby="tab-trade">
          {isDisabled ? (
            <div className="panel-disabled">
              {market.status === "locked"
                ? "🔒 Market is locked — no new orders accepted"
                : market.status === "resolved"
                ? `✅ Market resolved — Winner: ${market.winningOutcome?.toUpperCase()}`
                : "Market unavailable"}
            </div>
          ) : (
            <form onSubmit={handleTrade} className="trade-form" noValidate>
              {/* YES / NO toggle */}
              <div className="outcome-toggle" role="group" aria-label="Select outcome">
                <button
                  type="button"
                  id="btn-yes"
                  className={`outcome-btn yes ${side === "yes" ? "selected" : ""}`}
                  onClick={() => setSide("yes")}
                >
                  YES &nbsp;<span className="outcome-price">{market.yesPrice}¢</span>
                </button>
                <button
                  type="button"
                  id="btn-no"
                  className={`outcome-btn no ${side === "no" ? "selected" : ""}`}
                  onClick={() => setSide("no")}
                >
                  NO &nbsp;<span className="outcome-price">{market.noPrice}¢</span>
                </button>
              </div>

              {/* Amount input */}
              <div className="input-group">
                <label htmlFor="trade-amount" className="input-label">
                  Amount (USDC)
                </label>
                <div className="input-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    id="trade-amount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="amount-input"
                    aria-describedby="trade-estimate"
                  />
                  <span className="input-suffix">USDC</span>
                </div>
                {/* Quick fill buttons */}
                <div className="quick-fill">
                  {["10", "50", "100", "500"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="quick-btn"
                      onClick={() => setAmount(v)}
                      aria-label={`Set amount to $${v}`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimate */}
              <div id="trade-estimate" className="trade-estimate">
                <div className="estimate-row">
                  <span>Est. shares</span>
                  <span>{estimatedShares}</span>
                </div>
                <div className="estimate-row">
                  <span>Potential payout</span>
                  <span className={side === "yes" ? "text-yes" : "text-no"}>
                    {potentialPayout !== "—" ? `$${potentialPayout}` : "—"}
                  </span>
                </div>
                <div className="estimate-row">
                  <span>Fee ({(market.feeBps / 100).toFixed(1)}%)</span>
                  <span>
                    {numAmount > 0 ? `$${((numAmount * market.feeBps) / 10_000).toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>

              <button
                id="submit-order-btn"
                type="submit"
                disabled={!amount || numAmount <= 0 || submitted}
                className={`submit-btn ${side === "yes" ? "submit-yes" : "submit-no"} ${submitted ? "submitted" : ""}`}
              >
                {submitted
                  ? "✓ Order Submitted!"
                  : `Buy ${side.toUpperCase()} shares`}
              </button>

              <p className="panel-disclaimer">
                Connect a wallet to submit on-chain orders. Demo mode active.
              </p>
            </form>
          )}
        </div>
      )}

      {/* Liquidity Tab */}
      {tab === "liquidity" && (
        <div role="tabpanel" aria-labelledby="tab-liquidity">
          <div className="lp-stats">
            <div className="lp-stat">
              <span className="lp-stat-label">Pool Liquidity</span>
              <span className="lp-stat-value">{formatDollar(market.liquidity)}</span>
            </div>
            <div className="lp-stat">
              <span className="lp-stat-label">b Parameter</span>
              <span className="lp-stat-value">{market.bParam}</span>
            </div>
          </div>

          {market.status === "resolved" ? (
            <div className="panel-disabled">Market closed — liquidity has been settled</div>
          ) : (
            <form onSubmit={handleLp} className="trade-form" noValidate>
              <div className="input-group">
                <label htmlFor="lp-amount" className="input-label">
                  USDC to Deposit
                </label>
                <div className="input-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    id="lp-amount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0.00"
                    value={lpAmount}
                    onChange={(e) => setLpAmount(e.target.value)}
                    className="amount-input"
                  />
                  <span className="input-suffix">USDC</span>
                </div>
              </div>

              <div className="trade-estimate">
                <div className="estimate-row">
                  <span>Your share of pool</span>
                  <span>
                    {parseFloat(lpAmount) > 0
                      ? `${((parseFloat(lpAmount) / (market.liquidity + parseFloat(lpAmount))) * 100).toFixed(2)}%`
                      : "—"}
                  </span>
                </div>
                <div className="estimate-row">
                  <span>Fee APY (est.)</span>
                  <span className="text-yes">~3.2%</span>
                </div>
              </div>

              <button
                id="add-liquidity-btn"
                type="submit"
                disabled={!lpAmount || parseFloat(lpAmount) <= 0 || lpSubmitted}
                className={`submit-btn submit-lp ${lpSubmitted ? "submitted" : ""}`}
              >
                {lpSubmitted ? "✓ Liquidity Added!" : "Add Liquidity"}
              </button>

              <p className="panel-disclaimer">
                LP tokens are minted proportionally. Fees accrue per batch settlement.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
