import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_MARKETS } from "@/lib/mockData";
import { formatUsdc, formatFeeBps, truncatePubkey } from "@/lib/utils";
import TradePanel from "@/components/TradePanel";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const market = MOCK_MARKETS.find((m) => m.id === id);
  if (!market) return { title: "Market Not Found — Aegis" };
  return {
    title: `${market.question} — Aegis Protocol`,
    description: `Trade YES or NO on: ${market.question}. Volume: ${formatUsdc(market.volume)}`,
  };
}

const STATUS_CONFIG = {
  active:   { label: "Active",   className: "badge-active"   },
  locked:   { label: "Locked",   className: "badge-locked"   },
  resolved: { label: "Resolved", className: "badge-resolved" },
};

export default async function MarketPage({ params }: Props) {
  const { id } = await params;
  const market = MOCK_MARKETS.find((m) => m.id === id);

  if (!market) notFound();

  const { label, className } = STATUS_CONFIG[market.status];

  return (
    <div className="page-content market-detail">
      <Link href="/" className="detail-back" aria-label="Back to markets">
        ← All Markets
      </Link>

      <div className="detail-grid">
        {/* ── Left Column ─────────────────────────────── */}
        <div className="detail-left">
          {/* Header */}
          <div className="detail-header">
            <div className="detail-meta">
              <span className={`badge ${className}`} role="status">{label}</span>
              <span style={{ color: "var(--text-subtle)", fontSize: "13px" }}>
                {market.category.toUpperCase()}
              </span>
            </div>
            <h1 className="detail-question">{market.question}</h1>
          </div>

          {/* YES / NO price cards */}
          <div className="price-display" aria-label="Current market prices">
            <div className="price-card yes-card">
              <div className="price-card-label">YES</div>
              <div className="price-card-value">
                {market.status === "resolved" && market.winningOutcome === "yes"
                  ? "✓ "
                  : ""}
                {market.yesPrice}¢
              </div>
              <div className="price-card-sub">
                {market.yesPrice}% implied probability
              </div>
            </div>
            <div className="price-card no-card">
              <div className="price-card-label">NO</div>
              <div className="price-card-value">
                {market.status === "resolved" && market.winningOutcome === "no"
                  ? "✓ "
                  : ""}
                {market.noPrice}¢
              </div>
              <div className="price-card-sub">
                {market.noPrice}% implied probability
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="detail-stats-grid" role="list" aria-label="Market statistics">
            <div className="detail-stat-card" role="listitem">
              <div className="detail-stat-label">Volume</div>
              <div className="detail-stat-value">{formatUsdc(market.volume)}</div>
            </div>
            <div className="detail-stat-card" role="listitem">
              <div className="detail-stat-label">Liquidity</div>
              <div className="detail-stat-value">{formatUsdc(market.liquidity)}</div>
            </div>
            <div className="detail-stat-card" role="listitem">
              <div className="detail-stat-label">Fee</div>
              <div className="detail-stat-value">{formatFeeBps(market.feeBps)}</div>
            </div>
          </div>

          {/* Resolution info */}
          <div className="resolution-card">
            <div className="resolution-title">Resolution Details</div>
            <div className="resolution-rows">
              <div className="resolution-row">
                <span className="resolution-key">Market ID</span>
                <span className="resolution-val" title={market.id}>
                  {truncatePubkey(market.id)}
                </span>
              </div>
              <div className="resolution-row">
                <span className="resolution-key">Resolution Slot</span>
                <span className="resolution-val">{market.resolutionSlot.toLocaleString()}</span>
              </div>
              <div className="resolution-row">
                <span className="resolution-key">Resolution Date</span>
                <span className="resolution-val">{market.resolutionDate}</span>
              </div>
              <div className="resolution-row">
                <span className="resolution-key">b Parameter</span>
                <span className="resolution-val">{market.bParam}</span>
              </div>
              <div className="resolution-row">
                <span className="resolution-key">Created</span>
                <span className="resolution-val">{market.createdAt}</span>
              </div>
              <div className="resolution-row">
                <span className="resolution-key">Oracle</span>
                <span className="resolution-val">Aegis Oracle Network</span>
              </div>
            </div>

            {market.status === "resolved" && market.winningOutcome && (
              <div className={`resolution-winner ${market.winningOutcome}`} role="alert">
                ✓ Resolved: {market.winningOutcome.toUpperCase()} wins
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Trade Panel ────────────────── */}
        <div className="detail-right">
          <TradePanel market={market} />
        </div>
      </div>
    </div>
  );
}
