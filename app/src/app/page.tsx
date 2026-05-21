"use client";

import { useState, useMemo } from "react";
import MarketCard from "@/components/MarketCard";
import { MOCK_MARKETS } from "@/lib/mockData";
import { formatUsdc } from "@/lib/utils";
import type { MarketStatus, Category } from "@/lib/mockData";

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Locked", value: "locked" },
  { label: "Resolved", value: "resolved" },
  { label: "Crypto", value: "crypto" },
  { label: "Macro", value: "macro" },
  { label: "Sports", value: "sports" },
];

export default function HomePage() {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return MOCK_MARKETS;
    return MOCK_MARKETS.filter(
      (m) => m.status === filter || m.category === filter
    );
  }, [filter]);

  // Hero stats
  const totalVolume = MOCK_MARKETS.reduce((s, m) => s + m.volume, 0);
  const totalLiquidity = MOCK_MARKETS.reduce((s, m) => s + m.liquidity, 0);
  const activeCount = MOCK_MARKETS.filter((m) => m.status === "active").length;

  return (
    <div className="page-content">
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="hero" aria-label="Aegis Protocol overview">
        <div className="hero-eyebrow">
          <span>⬡</span> Built on Solana
        </div>
        <h1>Predict the Future,<br />Earn on Truth</h1>
        <p className="hero-sub">
          Trade binary prediction markets secured by LMSR pricing, batch
          settlement, and a decentralized oracle network.
        </p>
        <div className="hero-stats" role="list" aria-label="Protocol statistics">
          <div className="hero-stat" role="listitem">
            <div className="hero-stat-value" style={{ color: "var(--primary)" }}>
              {formatUsdc(totalVolume)}
            </div>
            <div className="hero-stat-label">Total Volume</div>
          </div>
          <div className="hero-stat" role="listitem">
            <div className="hero-stat-value" style={{ color: "var(--yes)" }}>
              {activeCount}
            </div>
            <div className="hero-stat-label">Open Markets</div>
          </div>
          <div className="hero-stat" role="listitem">
            <div className="hero-stat-value" style={{ color: "#38bdf8" }}>
              {formatUsdc(totalLiquidity)}
            </div>
            <div className="hero-stat-label">Total Liquidity</div>
          </div>
        </div>
      </section>

      {/* ── Markets Grid ─────────────────────────────────── */}
      <section className="markets-section" aria-label="Prediction markets">
        <div className="section-header">
          <h2 className="section-title">Markets</h2>
          <nav className="filter-bar" aria-label="Filter markets">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                id={`filter-${value}`}
                className={`filter-btn ${filter === value ? "active" : ""}`}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" role="status">
            <div className="empty-state-icon">◎</div>
            <div className="empty-state-title">No markets found</div>
            <div className="empty-state-sub">Try a different filter</div>
          </div>
        ) : (
          <div className="markets-grid">
            {filtered.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
