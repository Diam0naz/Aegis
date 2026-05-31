"use client";

import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { BN } from "@coral-xyz/anchor";
import {
  buildAddLiquidity,
  buildRemoveLiquidity,
  buildRedeemWinnings,
  fetchMarket,
  fetchLpPool,
  yesMintPda,
  noMintPda,
} from "@aegis/sdk";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MOCK_MARKETS, MOCK_ORDER_BOOKS, MOCK_ACTIVITY } from "@/lib/mockData";
import { formatDollar, formatFeeBps, truncatePubkey } from "@/lib/utils";
import SwapInterface from "@/components/SwapInterface";
import { useAegisProgram } from "@/hooks/useAegisProgram";
import { useUserPositions } from "@/hooks/useUserPositions";

interface Props {
  params: Promise<{ id: string }>;
}

type Timeframe = "1H" | "1D" | "1W" | "1M" | "ALL";
type ActiveTab = "activity" | "orderbook" | "details";
type TxStatus = "idle" | "building" | "signing" | "sending" | "confirmed" | "error";

const DEVNET_USDC = process.env.NEXT_PUBLIC_USDC_MINT
  ? new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT)
  : null;

function isValidPubkey(str: string): boolean {
  try { new PublicKey(str); return true; } catch { return false; }
}

export default function MarketPage({ params }: Props) {
  const { id } = React.use(params);

  // Compute these before any hooks so hook count is stable
  const isOnChain = isValidPubkey(id);
  const mockMarket = MOCK_MARKETS.find((m) => m.id === id);

  // ── ALL hooks must be declared unconditionally ─────────────────────
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const program = useAegisProgram();
  const { usdcBalance } = useUserPositions();

  const [chainMarket, setChainMarket] = useState<any>(null);
  const [chainLpPool, setChainLpPool] = useState<any>(null);
  const [chainLoading, setChainLoading] = useState(isOnChain && !mockMarket);

  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [activeTab, setActiveTab] = useState<ActiveTab>("orderbook");
  const [sidebarTab, setSidebarTab] = useState<"trade" | "lp" | "redeem">("trade");
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  const [lpAction, setLpAction] = useState<"add" | "remove">("add");
  const [lpAmount, setLpAmount] = useState("");
  const [lpTxStatus, setLpTxStatus] = useState<TxStatus>("idle");
  const [lpTxSig, setLpTxSig] = useState<string | null>(null);
  const [lpError, setLpError] = useState("");

  const [redeemTxStatus, setRedeemTxStatus] = useState<TxStatus>("idle");
  const [redeemTxSig, setRedeemTxSig] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState("");

  useEffect(() => {
    if (!isOnChain || !program) return;
    const mPubkey = new PublicKey(id);
    setChainLoading(true);
    Promise.all([
      fetchMarket(program, mPubkey).catch(() => null),
      fetchLpPool(program, mPubkey).catch(() => null),
    ]).then(([mkt, lp]) => {
      setChainMarket(mkt);
      setChainLpPool(lp);
      setChainLoading(false);
    });
  }, [isOnChain, id, program]);

  // ── After all hooks — conditional guard ────────────────────────────
  if (!isOnChain && !mockMarket) notFound();

  // ── Derived display market (chain data takes priority over mock) ───
  const market = useMemo(() => {
    if (chainMarket) {
      const yq = chainMarket.yes_qty ?? 0;
      const nq = chainMarket.no_qty ?? 0;
      const total = yq + nq;
      const yesP = total === 0 ? 50 : Math.round((yq / total) * 100);
      return {
        question: `On-chain market ${truncatePubkey(id)}`,
        description: "Live on-chain prediction market",
        category: "custom" as const,
        status: Object.keys(chainMarket.status ?? { active: {} })[0] as "active" | "locked" | "resolved",
        yesPrice: yesP,
        noPrice: 100 - yesP,
        volume: 0,
        liquidity: (chainLpPool?.total_liquidity?.toNumber?.() ?? 0) / 1_000_000,
        feeBps: chainMarket.fee_bps ?? 0,
        bParam: chainMarket.b_param?.toNumber?.() ?? 0,
        resolutionDate: `Slot ${chainMarket.resolution_slot?.toString()}`,
        resolutionSource: "On-chain oracle",
        createdAt: "On-chain",
        sparkline: [50] as number[],
        id,
        winningOutcome: chainMarket.winning_outcome != null
          ? (chainMarket.winning_outcome ? "yes" : "no")
          : undefined,
      };
    }
    return mockMarket!;
  }, [chainMarket, chainLpPool, mockMarket, id]);

  const chartPoints = useMemo(() => {
    const hist = market.sparkline || [50];
    switch (timeframe) {
      case "1H": return hist.slice(-5);
      case "1D": return hist.slice(-12);
      case "1W": return hist.slice(-18);
      default: return hist;
    }
  }, [timeframe, market]);

  const handleShare = useCallback(() => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const svgWidth = 600;
  const svgHeight = 220;
  const pad = { left: 40, right: 20, top: 15, bottom: 25 };
  const gW = svgWidth - pad.left - pad.right;
  const gH = svgHeight - pad.top - pad.bottom;

  const coords = useMemo(() => {
    if (chartPoints.length < 2) return [];
    return chartPoints.map((val, idx) => ({
      x: pad.left + (idx / (chartPoints.length - 1)) * gW,
      y: pad.top + gH - (val / 100) * gH,
      val,
    }));
  }, [chartPoints, gW, gH]);

  const linePath = useMemo(() => {
    if (!coords.length) return "";
    return coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  }, [coords]);

  const areaPath = useMemo(() => {
    if (!coords.length) return "";
    return `${linePath} L ${pad.left + gW} ${pad.top + gH} L ${pad.left} ${pad.top + gH} Z`;
  }, [linePath, coords, gW, gH]);

  const orderBook = MOCK_ORDER_BOOKS[market.id] || MOCK_ORDER_BOOKS.default;
  const maxVolume = useMemo(() => {
    const all = [...orderBook.bids, ...orderBook.asks];
    return Math.max(...all.map((r) => r.total), 1);
  }, [orderBook]);

  const marketActivity = useMemo(
    () => MOCK_ACTIVITY.filter((a) => a.marketId === market.id),
    [market],
  );

  // ── LP Transaction ────────────────────────────────────────────────
  const handleLp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLpError("");
    if (!connected || !publicKey) { setVisible(true); return; }
    if (!isOnChain || !DEVNET_USDC || !program) {
      setLpError("LP operations require an on-chain market and connected wallet.");
      return;
    }
    const numAmt = parseFloat(lpAmount);
    if (!(numAmt > 0)) return;

    try {
      setLpTxStatus("building");
      const mPubkey = new PublicKey(id);
      let ix;
      if (lpAction === "add") {
        const usdcAmount = new BN(Math.floor(numAmt * 1_000_000));
        ix = await buildAddLiquidity(program, {
          lp: publicKey,
          market: mPubkey,
          collateralMint: DEVNET_USDC,
          usdcAmount,
        });
      } else {
        const collateralVault = getAssociatedTokenAddressSync(DEVNET_USDC, mPubkey, true, TOKEN_PROGRAM_ID);
        const lpTokenAmount = new BN(Math.floor(numAmt * 1_000_000));
        ix = await buildRemoveLiquidity(program, {
          lp: publicKey,
          market: mPubkey,
          collateralMint: DEVNET_USDC,
          collateralVault,
          lpTokenAmount,
        });
      }

      const tx = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      setLpTxStatus("signing");
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      setLpTxStatus("sending");
      await connection.confirmTransaction(sig, "confirmed");
      setLpTxStatus("confirmed");
      setLpTxSig(sig);
      setLpAmount("");
      setTimeout(() => { setLpTxStatus("idle"); setLpTxSig(null); }, 6000);
    } catch (err: any) {
      setLpTxStatus("error");
      setLpError(err?.message ?? "LP transaction failed");
      setTimeout(() => { setLpTxStatus("idle"); setLpError(""); }, 6000);
    }
  }, [connected, publicKey, isOnChain, program, lpAction, lpAmount, id, sendTransaction, connection, setVisible]);

  // ── Redeem Winnings ───────────────────────────────────────────────
  const handleRedeem = useCallback(async () => {
    setRedeemError("");
    if (!connected || !publicKey) { setVisible(true); return; }
    if (!isOnChain || !DEVNET_USDC || !program) {
      setRedeemError("Redeem requires an on-chain market and connected wallet.");
      return;
    }
    const winOutcome = market.winningOutcome;
    if (!winOutcome) return;

    try {
      setRedeemTxStatus("building");
      const mPubkey = new PublicKey(id);
      const [yesMint] = yesMintPda(mPubkey);
      const [noMint] = noMintPda(mPubkey);
      const winningMint = winOutcome === "yes" ? yesMint : noMint;
      const collateralVault = getAssociatedTokenAddressSync(DEVNET_USDC, mPubkey, true, TOKEN_PROGRAM_ID);

      const ix = await buildRedeemWinnings(program, {
        user: publicKey,
        market: mPubkey,
        winningMint,
        collateralMint: DEVNET_USDC,
        collateralVault,
      });
      const tx = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      setRedeemTxStatus("signing");
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      setRedeemTxStatus("sending");
      await connection.confirmTransaction(sig, "confirmed");
      setRedeemTxStatus("confirmed");
      setRedeemTxSig(sig);
      setTimeout(() => { setRedeemTxStatus("idle"); setRedeemTxSig(null); }, 6000);
    } catch (err: any) {
      setRedeemTxStatus("error");
      setRedeemError(err?.message ?? "Redeem failed");
      setTimeout(() => { setRedeemTxStatus("idle"); setRedeemError(""); }, 6000);
    }
  }, [connected, publicKey, isOnChain, program, market, id, sendTransaction, connection, setVisible]);

  const isLpSubmitting = lpTxStatus === "building" || lpTxStatus === "signing" || lpTxStatus === "sending";
  const isRedeemSubmitting = redeemTxStatus === "building" || redeemTxStatus === "signing" || redeemTxStatus === "sending";

  if (chainLoading) {
    return (
      <div className="page-content" style={{ textAlign: "center", paddingTop: "80px" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading on-chain market data...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Link
        href="/markets"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}
      >
        ← BACK TO MARKETS
      </Link>

      <div className="landing-grid">
        {/* Left column */}
        <div>
          {/* Market Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span className="logo-badge" style={{ fontSize: "9px" }}>{market.category.toUpperCase()}</span>
                <span className={`status-badge ${market.status}`}>{market.status.toUpperCase()}</span>
                {market.status === "active" && (
                  <span className="live-pulsing-indicator">
                    <span className="live-dot" /> LIVE
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1.3", color: "#fff" }}>
                {market.question}
              </h1>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="percent-btn"
                style={{ padding: "8px 12px", color: bookmarked ? "var(--primary)" : "" }}
              >
                ★ {bookmarked ? "Saved" : "Save"}
              </button>
              <button onClick={handleShare} className="percent-btn" style={{ padding: "8px 12px" }}>
                {copied ? "Copied!" : "Share ↗"}
              </button>
            </div>
          </div>

          {/* Price Chart */}
          <div className="sidebar-panel" style={{ padding: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>YES PRICE</span>
                <div className="font-mono" style={{ fontSize: "32px", fontWeight: "800", color: "var(--yes)" }}>
                  {market.yesPrice}¢
                </div>
                <div className="font-mono" style={{ fontSize: "13px", color: "var(--no)" }}>
                  NO: {market.noPrice}¢
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", background: "#16161c", padding: "3px", borderRadius: "4px" }}>
                {(["1H", "1D", "1W", "1M", "ALL"] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className="font-mono"
                    style={{
                      fontSize: "11px", fontWeight: "700", padding: "4px 8px", borderRadius: "3px",
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

            <div style={{ position: "relative", width: "100%", height: `${svgHeight}px` }}>
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = pad.top + gH - (val / 100) * gH;
                  return (
                    <g key={val}>
                      <line x1={pad.left} y1={y} x2={svgWidth - pad.right} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <text x={pad.left - 8} y={y + 4} fill="var(--text-subtle)" fontSize="9" textAnchor="end" className="font-mono">
                        {val}¢
                      </text>
                    </g>
                  );
                })}
                <path d={areaPath} fill="rgba(34,197,94,0.06)" />
                <path d={linePath} fill="none" stroke="var(--yes)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                {coords.length > 0 && (
                  <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="4" fill="var(--yes)" stroke="#09090b" strokeWidth="1.5" />
                )}
              </svg>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {[
              { label: "VOLUME", value: `$${formatDollar(market.volume)}` },
              { label: "LIQUIDITY", value: `$${formatDollar(market.liquidity)}` },
              { label: "FEE", value: formatFeeBps(market.feeBps) },
              { label: "b PARAM", value: market.bParam.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="portfolio-stat-card" style={{ padding: "14px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{label}</span>
                <div className="font-mono" style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginTop: "4px" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="detail-tabs">
            <button className={`detail-tab ${activeTab === "orderbook" ? "active" : ""}`} onClick={() => setActiveTab("orderbook")}>
              ORDER BOOK
            </button>
            <button className={`detail-tab ${activeTab === "activity" ? "active" : ""}`} onClick={() => setActiveTab("activity")}>
              ACTIVITY
            </button>
            <button className={`detail-tab ${activeTab === "details" ? "active" : ""}`} onClick={() => setActiveTab("details")}>
              DETAILS
            </button>
          </div>

          <div className="detail-tab-content">
            {activeTab === "orderbook" && (
              <div className="orderbook-grid">
                <div className="orderbook-side">
                  <div className="orderbook-header">
                    <span>ASK PRICE</span><span>SIZE</span><span>TOTAL</span>
                  </div>
                  {orderBook.asks.map((ask, idx) => (
                    <div key={idx} className="orderbook-row font-mono" style={{ color: "var(--no)" }}>
                      <div className="orderbook-bar ask" style={{ width: `${(ask.total / maxVolume) * 100}%` }} />
                      <span className="orderbook-val">{ask.price}¢</span>
                      <span className="orderbook-val">{ask.quantity.toLocaleString()}</span>
                      <span className="orderbook-val">${ask.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="orderbook-side">
                  <div className="orderbook-header">
                    <span>BID PRICE</span><span>SIZE</span><span>TOTAL</span>
                  </div>
                  {orderBook.bids.map((bid, idx) => (
                    <div key={idx} className="orderbook-row font-mono" style={{ color: "var(--yes)" }}>
                      <div className="orderbook-bar bid" style={{ width: `${(bid.total / maxVolume) * 100}%` }} />
                      <span className="orderbook-val">{bid.price}¢</span>
                      <span className="orderbook-val">{bid.quantity.toLocaleString()}</span>
                      <span className="orderbook-val">${bid.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div style={{ overflowX: "auto" }}>
                <table className="positions-table">
                  <thead>
                    <tr>
                      <th>USER</th><th>ACTION</th><th>OUTCOME</th><th>SHARES</th><th>VALUE</th><th>TIME</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {marketActivity.length > 0 ? marketActivity.map((act) => (
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
                    )) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                          No activity recorded yet for this market.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px", lineHeight: "1.6" }}>
                <div>
                  <h4 style={{ color: "#fff", marginBottom: "4px" }}>Resolution Rules</h4>
                  <p style={{ color: "var(--text-muted)" }}>{market.description}</p>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "12px" }}>
                  <h4 style={{ color: "#fff", marginBottom: "6px" }}>Market Constants</h4>
                  <div className="font-mono" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {[
                      ["Market Address", id],
                      ["b Param (LMSR Depth)", market.bParam.toLocaleString()],
                      ["Protocol Fee", `${market.feeBps} bps (${formatFeeBps(market.feeBps)})`],
                      ["Resolution Date", market.resolutionDate],
                      ["Resolution Source", market.resolutionSource],
                      ...(isOnChain ? [["Program ID", process.env.NEXT_PUBLIC_PROGRAM_ID ?? "—"]] : []),
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ color: "var(--text-subtle)", flexShrink: 0 }}>{label}:</span>
                        <span style={{ wordBreak: "break-all", textAlign: "right" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Sticky Sidebar */}
        <div style={{ position: "sticky", top: "80px", alignSelf: "start" }}>
          {/* Sidebar tab bar */}
          <div style={{
            display: "flex",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            overflow: "hidden",
            marginBottom: "-1px",
          }}>
            {([
              { key: "trade", label: "TRADE" },
              { key: "lp", label: "LIQUIDITY" },
              ...(market.status === "resolved" ? [{ key: "redeem", label: "REDEEM" }] : []),
            ] as { key: typeof sidebarTab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSidebarTab(key)}
                style={{
                  flex: 1, padding: "10px 4px", fontSize: "11px", fontWeight: "700",
                  color: sidebarTab === key ? "var(--primary)" : "var(--text-muted)",
                  background: sidebarTab === key ? "var(--card)" : "transparent",
                  borderBottom: sidebarTab === key ? "2px solid var(--primary)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Trade tab */}
          {sidebarTab === "trade" && (
            <div style={{ borderRadius: "0 0 var(--radius-xl) var(--radius-xl)", overflow: "hidden" }}>
              <SwapInterface
                market={market as any}
                marketPubkey={isOnChain ? new PublicKey(id) : undefined}
                collateralMint={DEVNET_USDC ?? undefined}
                usdcBalance={usdcBalance}
              />
            </div>
          )}

          {/* Liquidity tab */}
          {sidebarTab === "lp" && (
            <div className="swap-interface" style={{ borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
              <div className="swap-header">
                <span className="swap-title">LIQUIDITY</span>
                <span className="logo-badge" style={{ fontSize: "8px" }}>LP TOKENS</span>
              </div>

              {/* Pool stats */}
              {chainLpPool && (
                <div className="swap-info-box" style={{ marginBottom: "16px" }}>
                  <div className="swap-info-row">
                    <span>Pool Liquidity</span>
                    <span className="font-mono">${((chainLpPool.total_liquidity?.toNumber?.() ?? 0) / 1e6).toFixed(2)} USDC</span>
                  </div>
                  <div className="swap-info-row">
                    <span>Total LP Supply</span>
                    <span className="font-mono">{((chainLpPool.total_lp_supply?.toNumber?.() ?? 0) / 1e6).toFixed(2)} LP</span>
                  </div>
                  <div className="swap-info-row">
                    <span>Fees Accrued</span>
                    <span className="font-mono">${((chainLpPool.fees_accrued?.toNumber?.() ?? 0) / 1e6).toFixed(4)} USDC</span>
                  </div>
                </div>
              )}

              {!isOnChain && (
                <div className="alert-banner info" style={{ marginBottom: "16px", fontSize: "11px" }}>
                  This is a demo market. LP operations work on deployed on-chain markets only.
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {(["add", "remove"] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => setLpAction(action)}
                    className="percent-btn"
                    style={{
                      flex: 1, padding: "8px",
                      background: lpAction === action
                        ? action === "add" ? "var(--primary-glow)" : "var(--no-muted)"
                        : "",
                      borderColor: lpAction === action
                        ? action === "add" ? "var(--primary)" : "var(--no)"
                        : "",
                      color: lpAction === action
                        ? action === "add" ? "var(--primary)" : "var(--no)"
                        : "",
                    }}
                  >
                    {action === "add" ? "Add" : "Remove"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleLp} noValidate>
                <div className="swap-box">
                  <div className="swap-box-header">
                    <span>{lpAction === "add" ? "USDC to Deposit" : "LP Tokens to Burn"}</span>
                  </div>
                  <div className="swap-box-input-row">
                    <input
                      type="number"
                      placeholder="0.0"
                      className="swap-input"
                      value={lpAmount}
                      min="0"
                      step="any"
                      onChange={(e) => setLpAmount(e.target.value)}
                      disabled={isLpSubmitting}
                    />
                    <div className="swap-token-selector">{lpAction === "add" ? "USDC" : "LP"}</div>
                  </div>
                </div>

                {lpError && (
                  <div className="alert-banner error" style={{ marginTop: "12px", fontSize: "11px" }}>
                    ⚠ {lpError}
                  </div>
                )}
                {lpTxStatus === "confirmed" && lpTxSig && (
                  <div className="alert-banner success" style={{ marginTop: "12px", fontSize: "11px" }}>
                    ✓{" "}
                    <a href={`https://solscan.io/tx/${lpTxSig}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                      View on Solscan →
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  className="place-order-btn"
                  disabled={!(parseFloat(lpAmount) > 0) || isLpSubmitting || lpTxStatus === "confirmed"}
                >
                  {!connected
                    ? "CONNECT WALLET"
                    : isLpSubmitting
                    ? "Processing..."
                    : lpTxStatus === "confirmed"
                    ? "✓ Done!"
                    : lpAction === "add"
                    ? "ADD LIQUIDITY"
                    : "REMOVE LIQUIDITY"}
                </button>
              </form>
            </div>
          )}

          {/* Redeem tab — resolved markets only */}
          {sidebarTab === "redeem" && market.status === "resolved" && (
            <div className="swap-interface" style={{ borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
              <div className="swap-header">
                <span className="swap-title">REDEEM WINNINGS</span>
              </div>

              <div style={{ padding: "16px 0", fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                <p>
                  Market resolved:{" "}
                  <strong style={{ color: market.winningOutcome === "yes" ? "var(--yes)" : "var(--no)" }}>
                    {market.winningOutcome?.toUpperCase() ?? "—"}
                  </strong>
                </p>
                <p style={{ marginTop: "8px" }}>
                  Burn your {market.winningOutcome?.toUpperCase()} tokens to receive USDC 1:1 from the collateral vault.
                </p>
              </div>

              {!isOnChain && (
                <div className="alert-banner info" style={{ marginBottom: "12px", fontSize: "11px" }}>
                  Redemption works on deployed on-chain markets only.
                </div>
              )}

              {redeemError && (
                <div className="alert-banner error" style={{ marginBottom: "12px", fontSize: "11px" }}>
                  ⚠ {redeemError}
                </div>
              )}
              {redeemTxStatus === "confirmed" && redeemTxSig && (
                <div className="alert-banner success" style={{ marginBottom: "12px", fontSize: "11px" }}>
                  ✓ Winnings redeemed!{" "}
                  <a href={`https://solscan.io/tx/${redeemTxSig}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                    View →
                  </a>
                </div>
              )}

              <button
                className="place-order-btn"
                onClick={handleRedeem}
                disabled={!market.winningOutcome || isRedeemSubmitting || redeemTxStatus === "confirmed"}
                style={{ background: redeemTxStatus === "confirmed" ? "var(--yes)" : "" }}
              >
                {!connected
                  ? "CONNECT WALLET"
                  : isRedeemSubmitting
                  ? "Processing..."
                  : redeemTxStatus === "confirmed"
                  ? "✓ Redeemed!"
                  : `REDEEM ${market.winningOutcome?.toUpperCase() ?? ""} WINNINGS`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
