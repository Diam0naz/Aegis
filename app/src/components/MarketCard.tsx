import Link from "next/link";
import type { MockMarket } from "@/lib/mockData";
import { formatUsdc, formatFeeBps } from "@/lib/utils";

interface Props {
  market: MockMarket;
}

const STATUS_CONFIG = {
  active:   { label: "Active",   className: "badge-active"   },
  locked:   { label: "Locked",   className: "badge-locked"   },
  resolved: { label: "Resolved", className: "badge-resolved" },
};

const CATEGORY_ICONS: Record<string, string> = {
  crypto:   "◈",
  macro:    "⊞",
  sports:   "◎",
  politics: "◇",
  custom:   "◆",
};

export default function MarketCard({ market }: Props) {
  const { label, className } = STATUS_CONFIG[market.status];
  const icon = CATEGORY_ICONS[market.category] ?? "◆";
  const isResolved = market.status === "resolved";

  return (
    <Link
      href={`/market/${market.id}`}
      className="market-card"
      id={`market-card-${market.id.slice(0, 8)}`}
      aria-label={`View market: ${market.question}`}
    >
      {/* Header row */}
      <div className="card-header">
        <div className="card-category">
          <span className="category-icon" aria-hidden="true">{icon}</span>
          <span className="category-label">{market.category}</span>
        </div>
        <span className={`badge ${className}`} role="status">{label}</span>
      </div>

      {/* Question */}
      <h2 className="card-question">{market.question}</h2>

      {/* Price bar */}
      <div className="price-bar-wrapper" aria-label={`YES ${market.yesPrice}%, NO ${market.noPrice}%`}>
        <div className="price-bar">
          <div
            className="price-bar-yes"
            style={{ width: `${market.yesPrice}%` }}
          />
        </div>
        <div className="price-labels">
          <span className="price-yes">
            YES &nbsp;
            <strong>{isResolved && market.winningOutcome === "yes" ? "✓ " : ""}{market.yesPrice}%</strong>
          </span>
          <span className="price-no">
            <strong>{isResolved && market.winningOutcome === "no" ? "✓ " : ""}{market.noPrice}%</strong>
            &nbsp; NO
          </span>
        </div>
      </div>

      {/* Footer stats */}
      <div className="card-footer">
        <div className="stat">
          <span className="stat-label">Volume</span>
          <span className="stat-value">{formatUsdc(market.volume)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Liquidity</span>
          <span className="stat-value">{formatUsdc(market.liquidity)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Fee</span>
          <span className="stat-value">{formatFeeBps(market.feeBps)}</span>
        </div>
        <div className="stat" style={{ textAlign: "right" }}>
          <span className="stat-label">Resolves</span>
          <span className="stat-value">{market.resolutionDate}</span>
        </div>
      </div>
    </Link>
  );
}
