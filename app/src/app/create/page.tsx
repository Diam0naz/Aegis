"use client";

import { useState, useMemo } from "react";
import MarketCard from "@/components/MarketCard";
import type { MockMarket, Category, MarketStatus } from "@/lib/mockData";

export default function CreateMarketPage() {
  const [question, setQuestion] = useState("Will OpenAI launch its search engine globally by July 2026?");
  const [description, setDescription] = useState(
    "This market resolves to YES if OpenAI makes its web search interface generally available to all free and paid users globally before July 1, 2026."
  );
  const [category, setCategory] = useState<Category>("tech");
  const [resolutionDate, setResolutionDate] = useState("Jun 30, 2026");
  const [resolutionSource, setResolutionSource] = useState("https://openai.com/blog");
  const [liquidity, setLiquidity] = useState("50000");
  const [feeBps, setFeeBps] = useState(150); // 1.5%

  const [submitted, setSubmitted] = useState(false);

  // Fee Calculations
  const numLiquidity = parseFloat(liquidity) || 0;
  
  // Implied LMSR b parameter calculation
  // standard: b = liquidity / ln(2) for binary 50/50 markets
  const impliedBParam = useMemo(() => {
    if (numLiquidity <= 0) return 0;
    return Math.round(numLiquidity / Math.log(2));
  }, [numLiquidity]);

  const lpSharesMinted = useMemo(() => {
    return numLiquidity; // LP shares are 1:1 with initial USDC deposit
  }, [numLiquidity]);

  // Construct a MockMarket object for the live preview card
  const previewMarket = useMemo<MockMarket>(() => {
    return {
      id: "preview-market-id-pda",
      question: question || "Write your market question...",
      description: description || "Write your detailed resolution rules...",
      category: category,
      status: "active" as MarketStatus,
      yesPrice: 50,
      noPrice: 50,
      volume: 0,
      volume24h: 0,
      liquidity: numLiquidity,
      feeBps: feeBps,
      bParam: impliedBParam,
      resolutionDate: resolutionDate || "Dec 31, 2026",
      resolutionSource: resolutionSource || "Official source URL",
      createdAt: "Today",
      sparkline: [50, 50, 50, 50, 50],
    };
  }, [question, description, category, resolutionDate, resolutionSource, numLiquidity, feeBps, impliedBParam]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || numLiquidity <= 0) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setQuestion("");
      setDescription("");
      setLiquidity("25000");
    }, 4000);
  };

  return (
    <div className="page-content">
      {/* Page Title */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", textTransform: "uppercase" }}>
          INITIALIZE PREDICTION MARKET
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
          Deploy a new batch-settled LMSR prediction market on Solana.
        </p>
      </div>

      <div className="create-grid">
        {/* Left Column: Form & Calculator */}
        <div className="form-card">
          <form onSubmit={handleCreate} noValidate>
            <div className="form-group">
              <label className="form-label">Market Question</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Will ETH hit $10,000 in 2026?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Resolution Rules / Description</label>
              <textarea
                rows={4}
                className="form-textarea"
                placeholder="Define precise parameters under which the market resolves to YES or NO..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                >
                  <option value="crypto">Crypto 🪙</option>
                  <option value="politics">Politics 🏛️</option>
                  <option value="sports">Sports 🏆</option>
                  <option value="tech">Tech 💻</option>
                  <option value="economics">Economics 📊</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resolution Date</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dec 31, 2026"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Resolution Source URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="e.g. https://www.coingecko.com"
                value={resolutionSource}
                onChange={(e) => setResolutionSource(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Initial Liquidity (USDC)</label>
                <input
                  type="number"
                  className="form-input font-mono"
                  placeholder="USDC Amount"
                  value={liquidity}
                  onChange={(e) => setLiquidity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Protocol Fee</label>
                <select
                  className="form-select font-mono"
                  value={feeBps}
                  onChange={(e) => setFeeBps(parseInt(e.target.value))}
                >
                  <option value={50}>0.50% (50 bps)</option>
                  <option value={100}>1.00% (100 bps)</option>
                  <option value={150}>1.50% (150 bps)</option>
                  <option value={200}>2.00% (200 bps)</option>
                  <option value={300}>3.00% (300 bps)</option>
                </select>
              </div>
            </div>

            {/* Fee Calculator Box */}
            <div className="fee-calc-box font-mono">
              <div style={{ fontWeight: "700", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "6px", marginBottom: "6px", color: "var(--primary)" }}>
                LMSR MATRICES & PROJECTIONS
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Implied b Parameter:</span>
                <span style={{ color: "#fff" }}>{impliedBParam.toLocaleString()} units</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>LP Shares Minted:</span>
                <span style={{ color: "#fff" }}>{lpSharesMinted.toLocaleString()} AEGIS-LP</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Initial Share Pool:</span>
                <span style={{ color: "#fff" }}>YES: 50% / NO: 50%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Fee Tier:</span>
                <span style={{ color: "#fff" }}>{(feeBps / 100).toFixed(2)}% collected at settlement</span>
              </div>
            </div>

            <button
              type="submit"
              className="place-order-btn"
              disabled={!question || numLiquidity <= 0 || submitted}
              style={{ display: "block" }}
            >
              {submitted ? "Initializing Program PDA..." : "Initialize Prediction Market"}
            </button>

            {submitted && (
              <div className="font-mono" style={{ color: "var(--primary)", fontSize: "11px", marginTop: "10px", textAlign: "center", animation: "pulse-amber 1.5s infinite" }}>
                ✓ PDA initialized! Proposed Solana transaction to cluster.
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Live Preview */}
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
            Live Market Card Preview
          </span>
          <div style={{ border: "1px dashed var(--primary-glow-strong)", padding: "10px", borderRadius: "14px", background: "rgba(0,0,0,0.15)" }}>
            <MarketCard market={previewMarket} variant="polymarket" />
          </div>

          <div className="sidebar-panel" style={{ marginTop: "20px", padding: "16px" }}>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              Anchor CLI Equivalent
            </h4>
            <pre
              className="font-mono"
              style={{
                fontSize: "10px",
                background: "#050508",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                color: "var(--primary)",
              }}
            >
              {`anchor client call initialize_market \\
  --question-hash $(echo -n "${question.slice(0, 15)}" | sha256sum | cut -d' ' -f1) \\
  --b-param ${impliedBParam} \\
  --fee-bps ${feeBps} \\
  --initial-liquidity ${numLiquidity * 1000000} \\
  --resolution-slot 420000`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
