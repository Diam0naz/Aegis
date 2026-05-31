"use client";

import { useState, useMemo } from "react";
import MarketCard from "@/components/MarketCard";
import SwapInterface from "@/components/SwapInterface";
import { MOCK_MARKETS, MockMarket } from "@/lib/mockData";
import { useUserPositions } from "@/hooks/useUserPositions";

type SortOption = "volume" | "newest" | "ending" | "traded";

export default function MarketsPage() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("volume");
  const [selectedMarketId, setSelectedMarketId] = useState(MOCK_MARKETS[0].id);
  const { usdcBalance } = useUserPositions();

  const selectedMarketForSwap = useMemo(
    () => MOCK_MARKETS.find((m) => m.id === selectedMarketId) || MOCK_MARKETS[0],
    [selectedMarketId],
  );

  const filteredAndSortedMarkets = useMemo(() => {
    let result = [...MOCK_MARKETS];

    if (filter !== "all") result = result.filter((m) => m.category === filter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.question.toLowerCase().includes(q) || m.category.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "volume") return b.volume - a.volume;
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "ending") return new Date(a.resolutionDate).getTime() - new Date(b.resolutionDate).getTime();
      if (sortBy === "traded") return b.volume24h - a.volume24h;
      return 0;
    });

    return result;
  }, [filter, searchQuery, sortBy]);

  return (
    <div className="page-content">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", textTransform: "uppercase" }}>
          Prediction Markets
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
          Browse and trade batch-settled outcomes on Crypto, Technology, Politics, and more.
        </p>
      </div>

      <div className="landing-grid">
        <div>
          {/* Filter / Search / Sort */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div className="search-bar-container" style={{ flex: 1, minWidth: "200px", maxWidth: "400px" }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Filter by question, topic..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{ background: "#16161c", border: "1px solid var(--border)", borderRadius: "4px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", outline: "none", cursor: "pointer" }}
                >
                  <option value="volume">Highest Volume</option>
                  <option value="traded">Most Traded (24h)</option>
                  <option value="newest">Newest</option>
                  <option value="ending">Ending Soon</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
              {["all", "crypto", "tech", "politics", "sports", "economics"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className="percent-btn"
                  style={{
                    padding: "6px 12px", fontSize: "12px",
                    background: filter === cat ? "var(--primary-glow)" : "",
                    borderColor: filter === cat ? "var(--primary)" : "",
                    color: filter === cat ? "var(--primary)" : "",
                    textTransform: "uppercase",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="market-cards-grid">
            {filteredAndSortedMarkets.length > 0 ? (
              filteredAndSortedMarkets.map((market) => (
                <div
                  key={market.id}
                  onClick={() => setSelectedMarketId(market.id)}
                  style={{
                    cursor: "pointer",
                    border: selectedMarketId === market.id ? "1px solid var(--primary)" : "none",
                    borderRadius: "12px",
                  }}
                >
                  <MarketCard market={market} variant="simple" />
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", background: "var(--surface)", borderRadius: "12px" }}>
                🔮 No matching markets found.
              </div>
            )}
          </div>
        </div>

        {/* Sticky swap sidebar */}
        <div style={{ position: "sticky", top: "80px", alignSelf: "start" }}>
          <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>
              Active Trading Desk
            </span>
            <span className="font-mono" style={{ fontSize: "11px", color: "var(--primary)" }}>
              {selectedMarketForSwap.category.toUpperCase()}
            </span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", borderRadius: "12px", padding: "10px", marginBottom: "12px", fontSize: "12px" }}>
            <span style={{ color: "var(--text-muted)" }}>Trading:</span>{" "}
            <strong style={{ color: "#fff" }}>{selectedMarketForSwap.question}</strong>
          </div>
          <SwapInterface
            market={selectedMarketForSwap}
            usdcBalance={usdcBalance}
          />
        </div>
      </div>
    </div>
  );
}
