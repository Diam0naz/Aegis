"use client";

import { useState } from "react";
import Link from "next/link";
import type { MockMarket } from "@/lib/mockData";
import { formatDollar } from "@/lib/utils";
import Sparkline from "@/components/Sparkline";
import { BatchCountdownChip } from "@/components/BatchCountdown";

interface MarketCardProps {
  market: MockMarket;
  variant?: "simple" | "polymarket" | "sports";
}

const CATEGORY_EMOJIS: Record<string, string> = {
  crypto: "🪙",
  politics: "🏛️",
  sports: "🏆",
  tech: "💻",
  economics: "📊",
  custom: "⚙️",
};

export default function MarketCard({ market, variant = "polymarket" }: MarketCardProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [selectedBet, setSelectedBet] = useState<string | null>(null);

  const emoji = CATEGORY_EMOJIS[market.category] ?? "🔮";
  const isResolved = market.status === "resolved";

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarked(!bookmarked);
  };

  const handleBetClick = (e: React.MouseEvent, outcomeName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBet(selectedBet === outcomeName ? null : outcomeName);
  };

  // ── VARIANT 1: SIMPLE CARD ─────────────────────────────────────────
  if (variant === "simple") {
    return (
      <Link href={`/market/${market.id}`} className="market-card" style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
            {emoji} {market.category}
          </span>
          <BatchCountdownChip />
        </div>

        <h3 className="card-question" style={{ margin: "0", fontSize: "15px", flex: "1" }}>
          {market.question}
        </h3>

        {/* Sparkline chart */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.03)" }}>
          <span className="font-mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            YES Price history
          </span>
          <Sparkline history={market.sparkline} color="var(--primary)" width={100} height={30} />
        </div>

        {/* YES / NO prices */}
        <div className="price-labels" style={{ fontSize: "13px", padding: "4px 0" }}>
          <span className="price-yes font-mono" style={{ color: "var(--yes)", fontWeight: "700" }}>
            YES {market.yesPrice}¢
          </span>
          <span className="price-no font-mono" style={{ color: "var(--no)", fontWeight: "700" }}>
            {market.noPrice}¢ NO
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "auto" }}>
          <span className="font-mono" style={{ color: "var(--text-muted)" }}>
            Vol: ${formatDollar(market.volume)}
          </span>
          <span style={{ color: "var(--text-subtle)", fontWeight: "600" }}>
            Ends {market.resolutionDate}
          </span>
        </div>
      </Link>
    );
  }

  // ── VARIANT 2: SPORTS MATCHUP CARD ─────────────────────────────────
  if (variant === "sports" || market.isSportsMatchup) {
    const teams = market.teams ?? {
      home: { name: "Home Team", score: 0, logo: "🏠" },
      away: { name: "Away Team", score: 0, logo: "🚗" },
      homeYesPrice: 50,
      awayYesPrice: 50,
    };

    return (
      <div className="sports-matchup-card">
        <div className="sports-matchup-header">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="live-pulsing-indicator">
              <span className="live-dot" />
              LIVE
            </span>
            <span style={{ textTransform: "uppercase", fontWeight: "700" }}>NBA Basketball</span>
          </div>
          <button onClick={handleBookmark} style={{ color: bookmarked ? "var(--primary)" : "var(--text-subtle)" }}>
            ★
          </button>
        </div>

        <Link href={`/market/${market.id}`} style={{ display: "block" }}>
          <div className="sports-teams">
            <div className="sports-team-row">
              <div className="sports-team-info">
                <span className="sports-team-logo">{teams.home.logo}</span>
                <span>{teams.home.name}</span>
              </div>
              <span className="sports-team-score font-mono">{teams.home.score}</span>
            </div>
            <div className="sports-team-row">
              <div className="sports-team-info">
                <span className="sports-team-logo">{teams.away.logo}</span>
                <span>{teams.away.name}</span>
              </div>
              <span className="sports-team-score font-mono">{teams.away.score}</span>
            </div>
          </div>
        </Link>

        <div className="sports-actions">
          <button
            className="sports-bet-btn font-mono"
            onClick={(e) => handleBetClick(e, "home")}
            style={{
              borderColor: selectedBet === "home" ? "var(--primary)" : "",
              background: selectedBet === "home" ? "var(--primary-glow)" : "",
              color: selectedBet === "home" ? "var(--primary)" : "",
            }}
          >
            {teams.home.name.split(" ").pop()}: {teams.homeYesPrice}¢
          </button>
          <button
            className="sports-bet-btn font-mono"
            onClick={(e) => handleBetClick(e, "away")}
            style={{
              borderColor: selectedBet === "away" ? "var(--primary)" : "",
              background: selectedBet === "away" ? "var(--primary-glow)" : "",
              color: selectedBet === "away" ? "var(--primary)" : "",
            }}
          >
            {teams.away.name.split(" ").pop()}: {teams.awayYesPrice}¢
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "12px", color: "var(--text-muted)" }}>
          <span className="font-mono">Vol: ${formatDollar(market.volume)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span className="batch-countdown-pulse" style={{ width: "4px", height: "4px" }} />
            Batch settled
          </span>
        </div>
      </div>
    );
  }

  // ── VARIANT 3: POLYMARKET-STYLE CARD ────────────────────────────────
  return (
    <Link href={`/market/${market.id}`} className="market-card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Top Meta Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "16px" }}>{emoji}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.02em" }}>
            {market.category}
          </span>
          {market.isLive && (
            <span className="live-pulsing-indicator" style={{ marginLeft: "4px" }}>
              <span className="live-dot" />
              LIVE
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BatchCountdownChip />
          <button
            onClick={handleBookmark}
            style={{
              color: bookmarked ? "var(--primary)" : "var(--text-subtle)",
              fontSize: "15px",
              padding: "2px",
              transition: "color 0.15s",
            }}
            aria-label="Bookmark market"
          >
            ★
          </button>
        </div>
      </div>

      {/* Question */}
      <h3 className="card-question" style={{ margin: "0", fontSize: "15px", fontWeight: "700", lineHeight: "1.4" }}>
        {market.question}
      </h3>

      {/* Outcome / Betting buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
        {market.outcomes && market.outcomes.length > 0 ? (
          market.outcomes.map((outcome) => (
            <div
              key={outcome.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(255,255,255,0.02)",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>{outcome.name}</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="outcome-pill-btn yes font-mono"
                  onClick={(e) => handleBetClick(e, `${outcome.id}-yes`)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    background: selectedBet === `${outcome.id}-yes` ? "var(--yes-muted)" : "",
                    borderColor: selectedBet === `${outcome.id}-yes` ? "var(--yes)" : "",
                  }}
                >
                  YES {outcome.price}¢
                </button>
                <button
                  className="outcome-pill-btn no font-mono"
                  onClick={(e) => handleBetClick(e, `${outcome.id}-no`)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    background: selectedBet === `${outcome.id}-no` ? "var(--no-muted)" : "",
                    borderColor: selectedBet === `${outcome.id}-no` ? "var(--no)" : "",
                  }}
                >
                  NO {(100 - outcome.price)}¢
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="outcome-pill-row">
            <button
              className="outcome-pill-btn yes font-mono"
              onClick={(e) => handleBetClick(e, "yes")}
              style={{
                background: selectedBet === "yes" ? "var(--yes-muted)" : "",
                borderColor: selectedBet === "yes" ? "var(--yes)" : "",
              }}
            >
              <span>YES</span>
              <span>{market.yesPrice}¢</span>
            </button>
            <button
              className="outcome-pill-btn no font-mono"
              onClick={(e) => handleBetClick(e, "no")}
              style={{
                background: selectedBet === "no" ? "var(--no-muted)" : "",
                borderColor: selectedBet === "no" ? "var(--no)" : "",
              }}
            >
              <span>NO</span>
              <span>{market.noPrice}¢</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "11px",
          borderTop: "1px solid var(--border)",
          paddingTop: "10px",
          marginTop: "6px",
        }}
      >
        <span className="font-mono" style={{ color: "var(--text-muted)" }}>
          Volume: ${formatDollar(market.volume)}
        </span>
        <span style={{ color: "var(--text-subtle)", fontWeight: "600" }}>
          Resolves {market.resolutionDate}
        </span>
      </div>
    </Link>
  );
}
