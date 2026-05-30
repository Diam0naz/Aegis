"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MOCK_PORTFOLIO, CATEGORY_LABELS, Category } from "@/lib/mockData";
import { formatUsdc } from "@/lib/utils";
import { BatchCountdownChip } from "@/components/BatchCountdown";

type PerformancePeriod = "1D" | "1W" | "1M" | "ALL";
type ActiveTab = "positions" | "pending" | "history";

export default function PortfolioPage() {
  const [period, setPeriod] = useState<PerformancePeriod>("1M");
  const [activeTab, setActiveTab] = useState<ActiveTab>("positions");
  const [sellSuccessMsg, setSellSuccessMsg] = useState("");
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("");

  const portfolio = MOCK_PORTFOLIO;

  // Render SVG Performance Chart
  const svgWidth = 600;
  const svgHeight = 150;
  const padding = { left: 40, right: 20, top: 15, bottom: 20 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const points = useMemo(() => {
    const data = portfolio.performanceHistory;
    const minVal = Math.min(...data.map((d) => d.value)) * 0.98;
    const maxVal = Math.max(...data.map((d) => d.value)) * 1.02;
    const valRange = maxVal - minVal;

    return data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - ((d.value - minVal) / valRange) * graphHeight;
      return { x, y, value: d.value, date: d.date };
    });
  }, [portfolio, graphWidth, graphHeight]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    return `${linePath} L ${padding.left + graphWidth} ${padding.top + graphHeight} L ${padding.left} ${padding.top + graphHeight} Z`;
  }, [linePath, points, graphWidth, graphHeight]);

  // Handle Positions Liquidation
  const handleSellPosition = (posId: string, marketQuestion: string) => {
    setSellSuccessMsg(`Sell order for '${marketQuestion}' queued for Batch Settlement!`);
    setTimeout(() => setSellSuccessMsg(""), 3500);
  };

  // Handle Pending Order Cancelation
  const handleCancelOrder = (ordId: string) => {
    setCancelSuccessMsg("Order cancelled successfully.");
    setTimeout(() => setCancelSuccessMsg(""), 2500);
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", textTransform: "uppercase" }}>
            PORTFOLIO MANAGEMENT
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Track active positions, pending batch executions, and historical ROI.
          </p>
        </div>
        <BatchCountdownChip />
      </div>

      {/* Summary Grid */}
      <div className="portfolio-header-grid">
        <div className="portfolio-stat-card">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>TOTAL PORTFOLIO VALUE</span>
          <div className="font-mono portfolio-stat-val" style={{ color: "var(--primary)" }}>
            ${portfolio.summary.totalValue.toLocaleString()}
          </div>
        </div>

        <div className="portfolio-stat-card">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>TOTAL P&L (ALL TIME)</span>
          <div className="font-mono portfolio-stat-val" style={{ color: "var(--yes)" }}>
            +${portfolio.summary.pnl.toLocaleString()}{" "}
            <span style={{ fontSize: "14px", fontWeight: "600" }}>({portfolio.summary.pnlPercent}%)</span>
          </div>
        </div>

        <div className="portfolio-stat-card">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>WIN RATE RECORD</span>
          <div className="font-mono portfolio-stat-val" style={{ color: "#fff" }}>
            {portfolio.summary.winRate}
          </div>
        </div>

        <div className="portfolio-stat-card">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>HISTORICAL ROI</span>
          <div className="font-mono portfolio-stat-val" style={{ color: "var(--primary)" }}>
            +{portfolio.summary.historicalRoi}%
          </div>
        </div>
      </div>

      {/* Layout Grid: Performance Chart & Risk on Left, Allocation Breakdown on Right */}
      <div className="landing-grid" style={{ marginBottom: "30px" }}>
        <div>
          {/* Performance Chart Card */}
          <div className="sidebar-panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Equity Curve (Value over time)
              </span>
              <div style={{ display: "flex", gap: "4px", background: "#16161c", padding: "2px", borderRadius: "4px" }}>
                {(["1D", "1W", "1M", "ALL"] as PerformancePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="font-mono"
                    style={{
                      fontSize: "10px",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      background: period === p ? "var(--primary)" : "transparent",
                      color: period === p ? "#000" : "var(--text-muted)",
                      fontWeight: "700",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart */}
            <div style={{ width: "100%", height: `${svgHeight}px` }}>
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <defs>
                  <linearGradient id="equity-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Level line */}
                <line
                  x1={padding.left}
                  y1={padding.top + graphHeight}
                  x2={svgWidth - padding.right}
                  y2={padding.top + graphHeight}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="1"
                />
                {/* Paths */}
                <path d={areaPath} fill="url(#equity-grad)" />
                <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" />
                {/* Dots */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3" fill="var(--primary)" />
                    {i % 2 === 0 && (
                      <text x={p.x} y={svgHeight - 4} fill="var(--text-subtle)" fontSize="9" textAnchor="middle" className="font-mono">
                        {p.date}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Risk Metrics Card */}
          <div className="sidebar-panel" style={{ padding: "20px" }}>
            <h3 className="sidebar-title">Risk & Trading Metrics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px" }} className="font-mono">
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>PROFIT FACTOR</span>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginTop: "4px" }}>
                  {portfolio.riskMetrics.profitFactor}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>AVG WIN / AVG LOSS</span>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginTop: "4px" }}>
                  <span style={{ color: "var(--yes)" }}>${portfolio.riskMetrics.avgWin}</span> /{" "}
                  <span style={{ color: "var(--no)" }}>${Math.abs(portfolio.riskMetrics.avgLoss)}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>BEST PERFORMER</span>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--yes)", marginTop: "4px" }}>
                  {portfolio.riskMetrics.bestPerformer}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>WORST PERFORMER</span>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--no)", marginTop: "4px" }}>
                  {portfolio.riskMetrics.worstPerformer}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Category Allocation breakdown */}
        <div className="sidebar-panel">
          <h3 className="sidebar-title">Category Allocation</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {portfolio.allocations.map((alloc) => (
              <div key={alloc.category}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600" }}>
                  <span style={{ textTransform: "capitalize" }}>
                    {CATEGORY_LABELS[alloc.category as Category] || alloc.category}
                  </span>
                  <span className="font-mono" style={{ color: "var(--primary)" }}>
                    {alloc.percent}% (${alloc.amount.toLocaleString()})
                  </span>
                </div>
                <div className="allocation-progress-bar">
                  <div className="allocation-progress-fill" style={{ width: `${alloc.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === "positions" ? "active" : ""}`} onClick={() => setActiveTab("positions")}>
          ACTIVE POSITIONS ({portfolio.positions.length})
        </button>
        <button className={`detail-tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
          PENDING BATCH ORDERS ({portfolio.pendingOrders.length})
        </button>
        <button className={`detail-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          SETTLEMENT HISTORY ({portfolio.history.length})
        </button>
      </div>

      {/* Tabs Content */}
      <div className="detail-tab-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
        {/* Sell alert message */}
        {sellSuccessMsg && (
          <div className="font-mono" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid var(--primary)", color: "var(--primary)", padding: "12px", borderRadius: "4px", marginBottom: "16px", fontSize: "12px", animation: "pulse-amber 2s infinite" }}>
            ⚠️ {sellSuccessMsg}
          </div>
        )}

        {/* Cancel alert message */}
        {cancelSuccessMsg && (
          <div className="font-mono" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid var(--no)", color: "var(--no)", padding: "12px", borderRadius: "4px", marginBottom: "16px", fontSize: "12px" }}>
            ✕ {cancelSuccessMsg}
          </div>
        )}

        {/* 1. Active Positions Tab */}
        {activeTab === "positions" && (
          <div style={{ overflowX: "auto" }}>
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Outcome</th>
                  <th>Shares</th>
                  <th>Avg Entry</th>
                  <th>Current Price</th>
                  <th>Total Value</th>
                  <th>P&L</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {portfolio.positions.map((pos) => {
                  const isProfit = pos.pnl >= 0;
                  return (
                    <tr key={pos.id}>
                      <td style={{ fontWeight: "700" }}>
                        <Link href={`/market/${pos.marketId}`} style={{ color: "#fff", textDecoration: "underline" }}>
                          {pos.marketQuestion}
                        </Link>
                      </td>
                      <td style={{ color: pos.outcome === "yes" ? "var(--yes)" : "var(--no)", fontWeight: "700" }}>
                        {pos.outcome.toUpperCase()}
                      </td>
                      <td>{pos.shares.toLocaleString()}</td>
                      <td>{pos.entryPrice}¢</td>
                      <td>{pos.currentPrice}¢</td>
                      <td>${pos.totalValue.toLocaleString()}</td>
                      <td style={{ color: isProfit ? "var(--yes)" : "var(--no)", fontWeight: "700" }}>
                        {isProfit ? "+" : ""}${pos.pnl.toFixed(2)} ({pos.pnlPercent}%)
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleSellPosition(pos.id, pos.marketQuestion)}
                          className="percent-btn"
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            borderColor: "var(--no)",
                            color: "var(--no)",
                          }}
                        >
                          SELL
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Pending Batch Orders Tab */}
        {activeTab === "pending" && (
          <div style={{ overflowX: "auto" }}>
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Side</th>
                  <th>Outcome</th>
                  <th>USDC Input</th>
                  <th>Est. Shares</th>
                  <th>Queue Position</th>
                  <th>Batch Settlement</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {portfolio.pendingOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td style={{ fontWeight: "700" }}>{ord.marketQuestion}</td>
                    <td style={{ color: ord.side === "BUY" ? "var(--yes)" : "var(--no)" }}>{ord.side}</td>
                    <td style={{ color: ord.outcome === "yes" ? "var(--yes)" : "var(--no)", fontWeight: "700" }}>
                      {ord.outcome.toUpperCase()}
                    </td>
                    <td>${ord.amount.toFixed(2)}</td>
                    <td>{ord.expectedShares.toLocaleString()}</td>
                    <td>Position #{ord.queuePosition}</td>
                    <td style={{ color: "var(--primary)", fontWeight: "700" }}>
                      Pulsing (Batch settlement soon)
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleCancelOrder(ord.id)}
                        className="percent-btn"
                        style={{
                          padding: "4px 8px",
                          fontSize: "11px",
                        }}
                      >
                        CANCEL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Settlement History Tab */}
        {activeTab === "history" && (
          <div style={{ overflowX: "auto" }}>
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Outcome</th>
                  <th>Shares</th>
                  <th>Payout</th>
                  <th>Net Profit</th>
                  <th>Result</th>
                  <th style={{ textAlign: "right" }}>Settle Date</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {portfolio.history.map((hist) => {
                  const isWon = hist.result === "won";
                  return (
                    <tr key={hist.id}>
                      <td style={{ fontWeight: "700" }}>{hist.marketQuestion}</td>
                      <td>{hist.outcome.toUpperCase()}</td>
                      <td>{hist.shares.toLocaleString()}</td>
                      <td>${hist.payout.toFixed(2)}</td>
                      <td style={{ color: hist.netProfit >= 0 ? "var(--yes)" : "var(--no)", fontWeight: "700" }}>
                        {hist.netProfit >= 0 ? "+" : ""}${hist.netProfit.toFixed(2)}
                      </td>
                      <td>
                        <span className={isWon ? "badge-won" : "badge-lost"}>
                          {hist.result.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-subtle)" }}>{hist.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
