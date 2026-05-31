"use client";

import { useState, useMemo } from "react";
import MarketCard from "@/components/MarketCard";
import { MOCK_MARKETS, MockMarket } from "@/lib/mockData";
import { formatDollar } from "@/lib/utils";
import MultiLineChart from "@/components/MultiLineChart";

const CATEGORIES = [
  { label: "All Markets", value: "all" },
  { label: "Trending", value: "trending" },
  { label: "Crypto 🪙", value: "crypto" },
  { label: "Politics 🏛️", value: "politics" },
  { label: "Sports 🏆", value: "sports" },
  { label: "Tech 💻", value: "tech" },
  { label: "Economics 📊", value: "economics" },
];

export default function HomePage() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const featuredMarket = useMemo(() => {
    return MOCK_MARKETS.find((m) => m.isFeatured) || MOCK_MARKETS[0];
  }, []);

  const filteredMarkets = useMemo(() => {
    let result = MOCK_MARKETS.filter((m) => !m.isFeatured); // Don't show featured market twice

    if (filter !== "all") {
      if (filter === "trending") {
        result = result.filter((m) => m.volume24h > 50000 || m.isLive);
      } else {
        result = result.filter((m) => m.category === filter);
      }
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [filter, searchQuery]);

  return (
    <div className="page-content">
      {/* Search Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "-0.5px" }}>
            AEGIS Terminal
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Decentralized Batch-Settled Prediction Infrastructure
          </p>
        </div>

        <div className="search-bar-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search prediction markets..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="landing-grid">
        {/* Left Column: Featured & Grid */}
        <div>
          {/* Featured Market Section */}
          {featuredMarket && (
            <div className="featured-card">
              <span className="featured-badge">Featured Market</span>
              <h2 className="featured-question">{featuredMarket.question}</h2>

              {/* Multi-outcome Timeline Picker */}
              <div className="multi-outcome-timeline">
                {featuredMarket.outcomes?.map((out) => (
                  <div key={out.id} className="timeline-node active">
                    <div className="timeline-label">{out.name}</div>
                    <div className="timeline-val font-mono" style={{ color: "var(--primary)" }}>
                      {out.price}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Multi-line Interactive Chart */}
              <div style={{ background: "#0d0d11", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <MultiLineChart outcomes={featuredMarket.outcomes || []} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "16px", color: "var(--text-muted)" }}>
                <span className="font-mono">Liquidity: ${formatDollar(featuredMarket.liquidity)} USDC</span>
                <span>Oracle Resolver: {featuredMarket.resolutionSource}</span>
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="category-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`category-pill ${filter === cat.value ? "active" : ""}`}
                onClick={() => setFilter(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Markets Grid */}
          <div className="market-cards-grid">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  variant={market.isSportsMatchup ? "sports" : "polymarket"}
                />
              ))
            ) : (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "var(--surface)",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔮</div>
                <div style={{ fontWeight: "700", color: "#fff", marginBottom: "4px" }}>No markets found</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Try searching or selecting another category</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebars */}
        <div>
          {/* Breaking News / Trending markets */}
          <div className="sidebar-panel">
            <h3 className="sidebar-title">
              <span>Breaking Markets</span>
              <span className="font-mono" style={{ fontSize: "10px", color: "var(--text-subtle)" }}>LIVE FEED</span>
            </h3>
            <div className="sidebar-list">
              <div className="sidebar-item">
                <div className="sidebar-item-left">
                  <span className="sidebar-num">1</span>
                  <div>
                    <div className="sidebar-item-title">GPT-5 Release Date</div>
                    <div className="sidebar-item-sub font-mono">Vol: $112K · Tech</div>
                  </div>
                </div>
                <div className="sidebar-item-right font-mono">
                  <div style={{ fontWeight: "700" }}>73%</div>
                  <span className="change-indicator up">▲ 5.4%</span>
                </div>
              </div>

              <div className="sidebar-item">
                <div className="sidebar-item-left">
                  <span className="sidebar-num">2</span>
                  <div>
                    <div className="sidebar-item-title">Celtics vs Mavericks</div>
                    <div className="sidebar-item-sub font-mono">Vol: $87K · Sports</div>
                  </div>
                </div>
                <div className="sidebar-item-right font-mono">
                  <div style={{ fontWeight: "700" }}>78%</div>
                  <span className="change-indicator up">▲ 12.1%</span>
                </div>
              </div>

              <div className="sidebar-item">
                <div className="sidebar-item-left">
                  <span className="sidebar-num">3</span>
                  <div>
                    <div className="sidebar-item-title">US Stablecoin Bill</div>
                    <div className="sidebar-item-sub font-mono">Vol: $31K · Politics</div>
                  </div>
                </div>
                <div className="sidebar-item-right font-mono">
                  <div style={{ fontWeight: "700" }}>58%</div>
                  <span className="change-indicator down">▼ 2.3%</span>
                </div>
              </div>

              <div className="sidebar-item">
                <div className="sidebar-item-left">
                  <span className="sidebar-num">4</span>
                  <div>
                    <div className="sidebar-item-title">Solana Flip Ethereum</div>
                    <div className="sidebar-item-sub font-mono">Vol: $62K · Crypto</div>
                  </div>
                </div>
                <div className="sidebar-item-right font-mono">
                  <div style={{ fontWeight: "700" }}>31%</div>
                  <span className="change-indicator up">▲ 4.1%</span>
                </div>
              </div>

              <div className="sidebar-item">
                <div className="sidebar-item-left">
                  <span className="sidebar-num">5</span>
                  <div>
                    <div className="sidebar-item-title">Fed Cut Rates</div>
                    <div className="sidebar-item-sub font-mono">Vol: $94K · Macro</div>
                  </div>
                </div>
                <div className="sidebar-item-right font-mono">
                  <div style={{ fontWeight: "700" }}>65%</div>
                  <span className="change-indicator down">▼ 0.8%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hot Topics Sidebar */}
          <div className="sidebar-panel">
            <h3 className="sidebar-title">
              <span>Hot Categories</span>
              <span>🔥</span>
            </h3>
            <div className="sidebar-list">
              <div className="sidebar-item">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>🪙</span>
                  <div>
                    <div style={{ fontWeight: "700" }}>Crypto</div>
                    <div className="sidebar-item-sub font-mono">Daily Vol: $3.25M</div>
                  </div>
                </div>
                <span className="logo-badge" style={{ fontSize: "9px" }}>HOT</span>
              </div>

              <div className="sidebar-item">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>💻</span>
                  <div>
                    <div style={{ fontWeight: "700" }}>Tech / AI</div>
                    <div className="sidebar-item-sub font-mono">Daily Vol: $1.82M</div>
                  </div>
                </div>
                <span className="logo-badge" style={{ fontSize: "9px" }}>HOT</span>
              </div>

              <div className="sidebar-item">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>🏆</span>
                  <div>
                    <div style={{ fontWeight: "700" }}>Sports</div>
                    <div className="sidebar-item-sub font-mono">Daily Vol: $950K</div>
                  </div>
                </div>
              </div>

              <div className="sidebar-item">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>🏛️</span>
                  <div>
                    <div style={{ fontWeight: "700" }}>Politics</div>
                    <div className="sidebar-item-sub font-mono">Daily Vol: $780K</div>
                  </div>
                </div>
              </div>

              <div className="sidebar-item">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>📊</span>
                  <div>
                    <div style={{ fontWeight: "700" }}>Economics</div>
                    <div className="sidebar-item-sub font-mono">Daily Vol: $540K</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
