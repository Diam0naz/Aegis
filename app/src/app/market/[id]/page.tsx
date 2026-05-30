"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_MARKETS, MOCK_ORDER_BOOKS, MOCK_ACTIVITY } from "@/lib/mockData";
import { formatUsdc, formatFeeBps, truncatePubkey } from "@/lib/utils";
import SwapInterface from "@/components/SwapInterface";

interface Props {
  params: Promise<{ id: string }>;
}

type Timeframe = "1H" | "1D" | "1W" | "1M" | "ALL";
type ActiveTab = "activity" | "orderbook" | "details";

export default function MarketPage({ params }: Props) {
  const { id } = React.use(params);
  const market = MOCK_MARKETS.find((m) => m.id === id);

  if (!market) {
    notFound();
  }

  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [activeTab, setActiveTab] = useState<ActiveTab>("orderbook");
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Derive price history based on selected timeframe
  const chartPoints = useMemo(() => {
    const defaultHistory = market.sparkline || [50, 52, 54, 53, 56, 58, 55, 62];
    
    // Generate different lengths for different timeframes
    switch (timeframe) {
      case "1H":
        return defaultHistory.slice(-5);
      case "1D":
        return defaultHistory.slice(-12);
      case "1W":
        return defaultHistory.slice(-18);
      case "1M":
      case "ALL":
      default:
        return defaultHistory;
    }
  }, [timeframe, market]);

  // Handle Share / Copy URL
  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // SVG Chart parameters
  const svgWidth = 600;
  const svgHeight = 220;
  const chartPadding = { left: 40, right: 20, top: 15, bottom: 25 };
  const graphWidth = svgWidth - chartPadding.left - chartPadding.right;
  const graphHeight = svgHeight - chartPadding.top - chartPadding.bottom;

  // Chart coordinates
  const coords = useMemo(() => {
    if (chartPoints.length < 2) return [];
    return chartPoints.map((val, idx) => {
      const x = chartPadding.left + (idx / (chartPoints.length - 1)) * graphWidth;
      const y = chartPadding.top + graphHeight - (val / 100) * graphHeight;
      return { x, y, val };
    });
  }, [chartPoints, graphWidth, graphHeight]);

  const linePath = useMemo(() => {
    if (coords.length === 0) return "";
    return coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  }, [coords]);

  const areaPath = useMemo(() => {
    if (coords.length === 0) return "";
    return `${linePath} L ${chartPadding.left + graphWidth} ${chartPadding.top + graphHeight} L ${chartPadding.left} ${chartPadding.top + graphHeight} Z`;
  }, [linePath, coords, graphWidth, graphHeight]);

  // Order Book calculations
  const orderBook = MOCK_ORDER_BOOKS[market.id] || MOCK_ORDER_BOOKS.default;
  const maxVolume = useMemo(() => {
    const allRows = [...orderBook.bids, ...orderBook.asks];
    return Math.max(...allRows.map((r) => r.total), 1);
  }, [orderBook]);

  // Filtered activity feed for this specific market
  const marketActivity = useMemo(() => {
    return MOCK_ACTIVITY.filter((act) => act.marketId === market.id || market.id === "eth-10k-timeline");
  }, [market]);

  return (
    <div className="page-content">
      {/* Back Link */}
      <Link href="/markets" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
        ← BACK TO MARKETS
      </Link>

      <div className="landing-grid">
        {/* Left Column: Details & Chart */}
        <div>
          {/* Market Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span className="logo-badge" style={{ fontSize: "9px" }}>
                  {market.category.toUpperCase()}
                </span>
                {market.status === "active" ? (
                  <span className="live-pulsing-indicator">
                    <span className="live-dot" /> LIVE
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--text-subtle)", fontWeight: "700" }}>
                    {market.status.toUpperCase()}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1.3", color: "#fff" }}>
                {market.question}
              </h1>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="percent-btn"
                style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "4px", color: bookmarked ? "var(--primary)" : "" }}
              >
                ★ {bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
              <button onClick={handleShare} className="percent-btn" style={{ padding: "8px 12px" }}>
                {copied ? "Copied Link!" : "Share ↗"}
              </button>
            </div>
          </div>

          {/* Interactive Price Chart Card */}
          <div className="sidebar-panel" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>YES PRICE</span>
                <div className="font-mono" style={{ fontSize: "32px", fontWeight: "800", color: "var(--yes)" }}>
                  {market.yesPrice}¢
                </div>
              </div>

              {/* Timeframe Toggles */}
              <div style={{ display: "flex", gap: "4px", background: "#16161c", padding: "3px", borderRadius: "4px" }}>
                {(["1H", "1D", "1W", "1M", "ALL"] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className="font-mono"
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      background: timeframe === tf ? "var(--primary)" : "transparent",
                      color: timeframe === tf ? "#000" : "var(--text-muted)",
                      transition: "all 0.15s",
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart */}
            <div style={{ position: "relative", width: "100%", height: `${svgHeight}px` }}>
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
                {/* Horizontal gridlines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = chartPadding.top + graphHeight - (val / 100) * graphHeight;
                  return (
                    <g key={val}>
                      <line
                        x1={chartPadding.left}
                        y1={y}
                        x2={svgWidth - chartPadding.right}
                        y2={y}
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                      />
                      <text x={chartPadding.left - 8} y={y + 4} fill="var(--text-subtle)" fontSize="9" textAnchor="end" className="font-mono">
                        {val}¢
                      </text>
                    </g>
                  );
                })}

                {/* Main paths */}
                <defs>
                  <linearGradient id="detail-chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--yes)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--yes)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#detail-chart-grad)" />
                <path d={linePath} fill="none" stroke="var(--yes)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dot at the end */}
                {coords.length > 0 && (
                  <circle
                    cx={coords[coords.length - 1].x}
                    cy={coords[coords.length - 1].y}
                    r="4"
                    fill="var(--yes)"
                    stroke="#09090b"
                    strokeWidth="1.5"
                  />
                )}
              </svg>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <div className="portfolio-stat-card" style={{ padding: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>VOLUME</span>
              <div className="font-mono" style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginTop: "4px" }}>
                ${formatUsdc(market.volume)}
              </div>
            </div>
            <div className="portfolio-stat-card" style={{ padding: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>LIQUIDITY</span>
              <div className="font-mono" style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginTop: "4px" }}>
                ${formatUsdc(market.liquidity)}
              </div>
            </div>
            <div className="portfolio-stat-card" style={{ padding: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>24H CHANGE</span>
              <div className="font-mono" style={{ fontSize: "18px", fontWeight: "800", color: "var(--yes)", marginTop: "4px" }}>
                ▲ +4.2%
              </div>
            </div>
            <div className="portfolio-stat-card" style={{ padding: "14px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>RESOLUTION DATE</span>
              <div className="font-mono" style={{ fontSize: "16px", fontWeight: "800", color: "#fff", marginTop: "4px" }}>
                {market.resolutionDate}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="detail-tabs">
            <button className={`detail-tab ${activeTab === "orderbook" ? "active" : ""}`} onClick={() => setActiveTab("orderbook")}>
              ORDER BOOK
            </button>
            <button className={`detail-tab ${activeTab === "activity" ? "active" : ""}`} onClick={() => setActiveTab("activity")}>
              ACTIVITY FEED
            </button>
            <button className={`detail-tab ${activeTab === "details" ? "active" : ""}`} onClick={() => setActiveTab("details")}>
              MARKET DETAILS
            </button>
          </div>

          {/* Tab Content */}
          <div className="detail-tab-content">
            {/* Order Book Tab */}
            {activeTab === "orderbook" && (
              <div className="orderbook-grid">
                {/* Asks (Sell Orders) */}
                <div className="orderbook-side">
                  <div className="orderbook-header">
                    <span>ASK PRICE</span>
                    <span>SIZE (SHARES)</span>
                    <span>TOTAL (USDC)</span>
                  </div>
                  {orderBook.asks.map((ask, idx) => {
                    const depthPercent = (ask.total / maxVolume) * 100;
                    return (
                      <div key={idx} className="orderbook-row font-mono" style={{ color: "var(--no)" }}>
                        <div className="orderbook-bar ask" style={{ width: `${depthPercent}%` }} />
                        <span className="orderbook-val">{ask.price}¢</span>
                        <span className="orderbook-val">{ask.quantity.toLocaleString()}</span>
                        <span className="orderbook-val">${ask.total.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Bids (Buy Orders) */}
                <div className="orderbook-side">
                  <div className="orderbook-header">
                    <span>BID PRICE</span>
                    <span>SIZE (SHARES)</span>
                    <span>TOTAL (USDC)</span>
                  </div>
                  {orderBook.bids.map((bid, idx) => {
                    const depthPercent = (bid.total / maxVolume) * 100;
                    return (
                      <div key={idx} className="orderbook-row font-mono" style={{ color: "var(--yes)" }}>
                        <div className="orderbook-bar bid" style={{ width: `${depthPercent}%` }} />
                        <span className="orderbook-val">{bid.price}¢</span>
                        <span className="orderbook-val">{bid.quantity.toLocaleString()}</span>
                        <span className="orderbook-val">${bid.total.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity Feed Tab */}
            {activeTab === "activity" && (
              <div style={{ overflowX: "auto" }}>
                <table className="positions-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>ACTION</th>
                      <th>OUTCOME</th>
                      <th>SHARES</th>
                      <th>VALUE (USDC)</th>
                      <th>TIME</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {marketActivity.length > 0 ? (
                      marketActivity.map((act) => (
                        <tr key={act.id}>
                          <td>{act.user}</td>
                          <td style={{ color: act.side === "BUY" ? "var(--yes)" : "var(--no)" }}>{act.side}</td>
                          <td style={{ color: act.outcome === "yes" ? "var(--yes)" : "var(--no)", fontWeight: "700" }}>
                            {act.outcome.toUpperCase()}
                          </td>
                          <td>{act.shares.toLocaleString()}</td>
                          <td>${act.amount.toFixed(2)}</td>
                          <td style={{ color: "var(--text-subtle)" }}>{act.time}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                          No recent transactions recorded in this batch cycle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Market Details & Rules Tab */}
            {activeTab === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px", lineHeight: "1.6" }}>
                <div>
                  <h4 style={{ color: "#fff", marginBottom: "4px", fontSize: "14px" }}>Resolution Rules</h4>
                  <p style={{ color: "var(--text-muted)" }}>{market.description}</p>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px" }}>
                  <h4 style={{ color: "#fff", marginBottom: "6px", fontSize: "14px" }}>Data & Constants</h4>
                  <div className="font-mono" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-subtle)" }}>Market Address (PDA):</span>
                      <span>{market.id}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-subtle)" }}>b Param (LMSR Liquidity):</span>
                      <span>{market.bParam}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-subtle)" }}>Oracle Resolution API:</span>
                      <a href={market.resolutionSource.includes("http") ? market.resolutionSource : "#"} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                        {market.resolutionSource}
                      </a>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-subtle)" }}>Creation Date:</span>
                      <span>{market.createdAt}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-subtle)" }}>Protocol Fee Basis Points:</span>
                      <span>{market.feeBps} bps ({formatFeeBps(market.feeBps)})</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Swap Sidebar */}
        <div style={{ position: "sticky", top: "80px", alignSelf: "start" }}>
          <SwapInterface market={market} />
        </div>
      </div>
    </div>
  );
}
