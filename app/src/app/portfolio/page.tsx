"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { MOCK_PORTFOLIO, CATEGORY_LABELS, Category } from "@/lib/mockData";
import { truncatePubkey } from "@/lib/utils";
import { BatchCountdownChip } from "@/components/BatchCountdown";
import { useUserPositions } from "@/hooks/useUserPositions";

type PerformancePeriod = "1D" | "1W" | "1M" | "ALL";
type ActiveTab = "positions" | "pending" | "history" | "live";

export default function PortfolioPage() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { pendingOrders, usdcBalance, loading: positionsLoading } = useUserPositions();

  const [period, setPeriod] = useState<PerformancePeriod>("1M");
  const [activeTab, setActiveTab] = useState<ActiveTab>("positions");

  const portfolio = MOCK_PORTFOLIO;

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
    return data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * graphWidth,
      y: padding.top + graphHeight - ((d.value - minVal) / valRange) * graphHeight,
      value: d.value,
      date: d.date,
    }));
  }, [portfolio, graphWidth, graphHeight]);

  const linePath = useMemo(() => {
    if (!points.length) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [points]);

  const areaPath = useMemo(() => {
    if (!points.length) return "";
    return `${linePath} L ${padding.left + graphWidth} ${padding.top + graphHeight} L ${padding.left} ${padding.top + graphHeight} Z`;
  }, [linePath, points, graphWidth, graphHeight]);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", textTransform: "uppercase" }}>
            PORTFOLIO MANAGEMENT
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            {connected && publicKey
              ? `Wallet: ${truncatePubkey(publicKey.toBase58(), 6)}`
              : "Track active positions, pending batch executions, and historical ROI."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {connected && usdcBalance != null && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--primary-glow)", border: "1px solid var(--border-amber)", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "700" }}>
              <span style={{ color: "var(--text-muted)" }}>USDC:</span>
              <span className="font-mono" style={{ color: "var(--primary)" }}>${usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <BatchCountdownChip />
        </div>
      </div>

      {/* Connect prompt */}
      {!connected && (
        <div className="alert-banner info" style={{ marginBottom: "24px" }}>
          <span>Connect a wallet to view live on-chain positions and pending batch orders.</span>
          <button
            onClick={() => setVisible(true)}
            style={{ marginLeft: "auto", background: "var(--primary)", color: "#000", fontWeight: "700", padding: "4px 12px", borderRadius: "4px", fontSize: "11px" }}
          >
            Connect
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="portfolio-header-grid">
        <div className="portfolio-stat-card">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>TOTAL PORTFOLIO VALUE</span>
          <div className="font-mono portfolio-stat-val" style={{ color: "var(--primary)" }}>
            ${portfolio.summary.totalValue.toLocaleString()}
          </div>
          {connected && usdcBalance != null && (
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>
              + {usdcBalance.toFixed(2)} USDC liquid
            </div>
          )}
        </div>

        <div className="portfolio-stat-card">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>TOTAL P&L (ALL TIME)</span>
          <div className="font-mono portfolio-stat-val" style={{ color: "var(--yes)" }}>
            +${portfolio.summary.pnl.toLocaleString()}{" "}
            <span style={{ fontSize: "14px", fontWeight: "600" }}>({portfolio.summary.pnlPercent}%)</span>
          </div>
        </div>

        <div className="portfolio-stat-card">
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>WIN RATE</span>
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

      {/* Chart + Allocation grid */}
      <div className="landing-grid" style={{ marginBottom: "30px" }}>
        <div>
          {/* Equity Curve */}
          <div className="sidebar-panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Equity Curve
              </span>
              <div style={{ display: "flex", gap: "4px", background: "#16161c", padding: "2px", borderRadius: "4px" }}>
                {(["1D", "1W", "1M", "ALL"] as PerformancePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="font-mono"
                    style={{
                      fontSize: "10px", padding: "4px 8px", borderRadius: "3px",
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

            <div style={{ width: "100%", height: `${svgHeight}px` }}>
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <line
                  x1={padding.left} y1={padding.top + graphHeight}
                  x2={svgWidth - padding.right} y2={padding.top + graphHeight}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                />
                <path d={areaPath} fill="rgba(245,158,11,0.06)" />
                <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" />
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

          {/* Risk Metrics */}
          <div className="sidebar-panel" style={{ padding: "20px" }}>
            <h3 className="sidebar-title">Risk & Trading Metrics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px" }} className="font-mono">
              {[
                { label: "PROFIT FACTOR", value: portfolio.riskMetrics.profitFactor, color: "" },
                { label: "AVG WIN", value: `$${portfolio.riskMetrics.avgWin}`, color: "var(--yes)" },
                { label: "AVG LOSS", value: `$${Math.abs(portfolio.riskMetrics.avgLoss)}`, color: "var(--no)" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>{label}</span>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: color || "#fff", marginTop: "4px" }}>{value}</div>
                </div>
              ))}
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>BEST PERFORMER</span>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--yes)", marginTop: "4px" }}>
                  {portfolio.riskMetrics.bestPerformer}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Allocation breakdown */}
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

      {/* Tabs */}
      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === "positions" ? "active" : ""}`} onClick={() => setActiveTab("positions")}>
          POSITIONS ({portfolio.positions.length})
        </button>
        {connected && (
          <button className={`detail-tab ${activeTab === "live" ? "active" : ""}`} onClick={() => setActiveTab("live")}>
            LIVE ORDERS {positionsLoading ? "..." : `(${pendingOrders.length})`}
          </button>
        )}
        <button className={`detail-tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
          PENDING ({portfolio.pendingOrders.length})
        </button>
        <button className={`detail-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          HISTORY ({portfolio.history.length})
        </button>
      </div>

      <div className="detail-tab-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>

        {/* Positions */}
        {activeTab === "positions" && (
          <div style={{ overflowX: "auto" }}>
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Market</th><th>Outcome</th><th>Shares</th><th>Entry</th><th>Current</th><th>Value</th><th>P&L</th><th style={{ textAlign: "right" }}>Actions</th>
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
                        <button className="percent-btn" style={{ padding: "4px 8px", fontSize: "11px", borderColor: "var(--no)", color: "var(--no)" }}>
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

        {/* Live on-chain orders */}
        {activeTab === "live" && connected && (
          <div style={{ overflowX: "auto" }}>
            {positionsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                Loading on-chain positions...
              </div>
            ) : pendingOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "24px", marginBottom: "12px" }}>📋</div>
                <div style={{ fontWeight: "700", color: "#fff" }}>No pending on-chain orders</div>
                <div style={{ fontSize: "12px", marginTop: "4px" }}>
                  Orders placed through this wallet will appear here.
                </div>
              </div>
            ) : (
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>Order PDA</th><th>Market</th><th>Outcome</th><th>Amount (USDC)</th><th>Filled</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {pendingOrders.map((ord) => (
                    <tr key={ord.address}>
                      <td style={{ color: "var(--text-subtle)" }}>{truncatePubkey(ord.address)}</td>
                      <td>{truncatePubkey(ord.marketAddress)}</td>
                      <td style={{ color: ord.outcome === "yes" ? "var(--yes)" : "var(--no)", fontWeight: "700" }}>
                        {ord.outcome.toUpperCase()}
                      </td>
                      <td>${(ord.amount / 1_000_000).toFixed(2)}</td>
                      <td style={{ color: ord.isFilled ? "var(--yes)" : "var(--text-muted)" }}>
                        {ord.isFilled ? "✓ FILLED" : "PENDING"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pending demo orders */}
        {activeTab === "pending" && (
          <div style={{ overflowX: "auto" }}>
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Market</th><th>Side</th><th>Outcome</th><th>Amount</th><th>Est. Shares</th><th>Queue Pos</th><th>Status</th>
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
                    <td>#{ord.queuePosition}</td>
                    <td style={{ color: "var(--primary)", fontWeight: "700" }}>QUEUED</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div style={{ overflowX: "auto" }}>
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Market</th><th>Outcome</th><th>Shares</th><th>Payout</th><th>Net Profit</th><th>Result</th><th style={{ textAlign: "right" }}>Date</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {portfolio.history.map((hist) => (
                  <tr key={hist.id}>
                    <td style={{ fontWeight: "700" }}>{hist.marketQuestion}</td>
                    <td>{hist.outcome.toUpperCase()}</td>
                    <td>{hist.shares.toLocaleString()}</td>
                    <td>${hist.payout.toFixed(2)}</td>
                    <td style={{ color: hist.netProfit >= 0 ? "var(--yes)" : "var(--no)", fontWeight: "700" }}>
                      {hist.netProfit >= 0 ? "+" : ""}${hist.netProfit.toFixed(2)}
                    </td>
                    <td>
                      <span className={hist.result === "won" ? "badge-won" : "badge-lost"}>
                        {hist.result.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-subtle)" }}>{hist.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
