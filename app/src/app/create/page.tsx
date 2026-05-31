"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { BN } from "@coral-xyz/anchor";
import { buildCreateMarket, buildAddLiquidity, marketPda } from "@aegis/sdk";
import MarketCard from "@/components/MarketCard";
import type { MockMarket, Category, MarketStatus } from "@/lib/mockData";
import { useAegisProgram } from "@/hooks/useAegisProgram";

type TxStatus = "idle" | "building" | "signing" | "sending" | "confirmed" | "error";

const DEVNET_USDC = process.env.NEXT_PUBLIC_USDC_MINT
  ? new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT)
  : null;

async function sha256Bytes(text: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded.buffer as ArrayBuffer);
  return new Uint8Array(hashBuf);
}

export default function CreateMarketPage() {
  const router = useRouter();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const program = useAegisProgram();

  const [question, setQuestion] = useState("Will OpenAI launch its search engine globally by July 2026?");
  const [description, setDescription] = useState(
    "This market resolves to YES if OpenAI makes its web search interface generally available to all free and paid users globally before July 1, 2026.",
  );
  const [category, setCategory] = useState<Category>("tech");
  const [resolutionDate, setResolutionDate] = useState("Jun 30, 2026");
  const [resolutionSlots, setResolutionSlots] = useState("500000");
  const [liquidity, setLiquidity] = useState("50000");
  const [feeBps, setFeeBps] = useState(150);
  const [creatorFeeBps, setCreatorFeeBps] = useState(50);

  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txSig, setTxSig] = useState<string | null>(null);
  const [newMarketAddr, setNewMarketAddr] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const numLiquidity = parseFloat(liquidity) || 0;
  const impliedBParam = useMemo(() => {
    if (numLiquidity <= 0) return 0;
    return Math.round(numLiquidity / Math.log(2));
  }, [numLiquidity]);

  const previewMarket = useMemo<MockMarket>(() => ({
    id: "preview-market-id-pda",
    question: question || "Write your market question...",
    description: description || "Write your detailed resolution rules...",
    category,
    status: "active" as MarketStatus,
    yesPrice: 50,
    noPrice: 50,
    volume: 0,
    volume24h: 0,
    liquidity: numLiquidity,
    feeBps,
    bParam: impliedBParam,
    resolutionDate: resolutionDate || "Dec 31, 2026",
    resolutionSource: "Custom Oracle",
    createdAt: "Today",
    sparkline: [50, 50, 50, 50, 50],
  }), [question, description, category, resolutionDate, numLiquidity, feeBps, impliedBParam]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    if (!question || numLiquidity <= 0) return;
    if (!program) {
      setErrorMsg("Wallet not ready. Please reconnect.");
      return;
    }
    if (!DEVNET_USDC) {
      setErrorMsg("USDC mint not configured. Set NEXT_PUBLIC_USDC_MINT in .env.local");
      return;
    }

    try {
      setTxStatus("building");

      // Derive question hash
      const questionHash = await sha256Bytes(question);
      const [mPubkey] = marketPda(publicKey, questionHash);

      // Compute resolution slot (current slot + user-entered offset)
      const currentSlot = await connection.getSlot("confirmed");
      const resSlot = new BN(currentSlot + (parseInt(resolutionSlots) || 500000));

      const bParam = new BN(impliedBParam);
      const batchWindowSlots = new BN(8);

      // Build create_market instruction
      const createIx = await buildCreateMarket(program, {
        authority: publicKey,
        collateralMint: DEVNET_USDC,
        questionHash,
        bParam,
        batchWindowSlots,
        resolutionSlot: resSlot,
        feeBps,
        creatorFeeBps,
      });

      const tx = new Transaction().add(createIx);

      // Optionally add initial liquidity in the same transaction
      if (numLiquidity > 0) {
        const usdcAmount = new BN(Math.floor(numLiquidity * 1_000_000));
        const addLiqIx = await buildAddLiquidity(program, {
          lp: publicKey,
          market: mPubkey,
          collateralMint: DEVNET_USDC,
          usdcAmount,
        });
        tx.add(addLiqIx);
      }

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      setTxStatus("signing");
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });

      setTxStatus("sending");
      await connection.confirmTransaction(sig, "confirmed");

      setTxStatus("confirmed");
      setTxSig(sig);
      setNewMarketAddr(mPubkey.toBase58());

      // Redirect to new market page after 2 seconds
      setTimeout(() => router.push(`/market/${mPubkey.toBase58()}`), 2000);
    } catch (err: any) {
      setTxStatus("error");
      setErrorMsg(err?.message ?? "Transaction failed");
      setTimeout(() => { setTxStatus("idle"); setErrorMsg(""); }, 6000);
    }
  }, [connected, publicKey, question, numLiquidity, program, impliedBParam, feeBps, creatorFeeBps, resolutionSlots, sendTransaction, connection, setVisible, router]);

  const isSubmitting = txStatus === "building" || txStatus === "signing" || txStatus === "sending";

  const btnLabel = () => {
    if (!connected) return "CONNECT WALLET TO DEPLOY";
    if (txStatus === "building") return "Building Transaction...";
    if (txStatus === "signing") return "Waiting for Signature...";
    if (txStatus === "sending") return "Deploying On-Chain...";
    if (txStatus === "confirmed") return "✓ Market Deployed!";
    return "Initialize Prediction Market";
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", textTransform: "uppercase" }}>
          INITIALIZE PREDICTION MARKET
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
          Deploy a new batch-settled LMSR prediction market on Solana devnet.
        </p>
      </div>

      <div className="create-grid">
        {/* Left Column: Form */}
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
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  <option value="crypto">Crypto</option>
                  <option value="politics">Politics</option>
                  <option value="sports">Sports</option>
                  <option value="tech">Tech</option>
                  <option value="economics">Economics</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resolution Date (display)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dec 31, 2026"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Resolution Slot Offset (slots from now)</label>
              <input
                type="number"
                className="form-input font-mono"
                placeholder="500000 ≈ 55 hours"
                value={resolutionSlots}
                onChange={(e) => setResolutionSlots(e.target.value)}
              />
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                ~{((parseInt(resolutionSlots) || 0) * 0.4 / 3600).toFixed(1)} hours at 400ms/slot
              </span>
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
                <select className="form-select font-mono" value={feeBps} onChange={(e) => setFeeBps(parseInt(e.target.value))}>
                  <option value={50}>0.50% (50 bps)</option>
                  <option value={100}>1.00% (100 bps)</option>
                  <option value={150}>1.50% (150 bps)</option>
                  <option value={200}>2.00% (200 bps)</option>
                  <option value={300}>3.00% (300 bps)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Creator Fee Share (bps of total fee)</label>
              <input
                type="number"
                className="form-input font-mono"
                placeholder="50 = 0.5%"
                value={creatorFeeBps}
                min={0}
                max={feeBps}
                onChange={(e) => setCreatorFeeBps(Math.min(parseInt(e.target.value) || 0, feeBps))}
              />
            </div>

            {/* LMSR Calculator */}
            <div className="fee-calc-box font-mono">
              <div style={{ fontWeight: "700", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "6px", marginBottom: "6px", color: "var(--primary)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                LMSR Parameters
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>b Parameter:</span>
                <span style={{ color: "#fff" }}>{impliedBParam.toLocaleString()} units</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>LP Shares Minted:</span>
                <span style={{ color: "#fff" }}>{numLiquidity.toLocaleString()} AEGIS-LP</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Opening Price:</span>
                <span style={{ color: "#fff" }}>YES 50% / NO 50%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Fee at Settlement:</span>
                <span style={{ color: "#fff" }}>{(feeBps / 100).toFixed(2)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Creator Share:</span>
                <span style={{ color: "#fff" }}>{(creatorFeeBps / 100).toFixed(2)}% of fees</span>
              </div>
            </div>

            {errorMsg && (
              <div className="alert-banner error" style={{ marginTop: "16px" }}>
                ⚠ {errorMsg}
              </div>
            )}

            {txStatus === "confirmed" && txSig && newMarketAddr && (
              <div className="alert-banner success" style={{ marginTop: "16px", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                <span>✓ Market deployed on-chain!</span>
                <a href={`https://solscan.io/tx/${txSig}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontSize: "11px" }}>
                  View transaction →
                </a>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Redirecting to market page...
                </span>
              </div>
            )}

            <button
              type="submit"
              className="place-order-btn"
              disabled={(!question || numLiquidity <= 0) && connected || isSubmitting || txStatus === "confirmed"}
              style={{
                display: "block",
                background: txStatus === "confirmed" ? "var(--yes)" : "",
              }}
            >
              {btnLabel()}
            </button>

            {!connected && (
              <p className="font-mono" style={{ fontSize: "11px", color: "var(--text-subtle)", textAlign: "center", marginTop: "8px" }}>
                Connect a Solana wallet to deploy on-chain.
              </p>
            )}
          </form>
        </div>

        {/* Right Column: Live Preview */}
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
            Live Market Card Preview
          </span>
          <div style={{ border: "1px dashed var(--border-amber)", padding: "10px", borderRadius: "14px" }}>
            <MarketCard market={previewMarket} variant="polymarket" />
          </div>

          <div className="sidebar-panel" style={{ marginTop: "20px", padding: "16px" }}>
            <h4 style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
              On-Chain Instruction
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
              {`create_market {
  question_hash: sha256("${question.slice(0, 30)}..."),
  b_param: ${impliedBParam},
  fee_bps: ${feeBps},
  creator_fee_bps: ${creatorFeeBps},
  batch_window_slots: 8,
  resolution_slot: current + ${resolutionSlots}
}

add_liquidity {
  usdc_amount: ${Math.floor(numLiquidity * 1_000_000)} lamports
}`}
            </pre>
          </div>

          {connected && publicKey && (
            <div className="sidebar-panel" style={{ padding: "12px", fontSize: "12px" }}>
              <div style={{ color: "var(--text-subtle)", marginBottom: "4px", fontSize: "10px", textTransform: "uppercase", fontWeight: "700" }}>Deployer</div>
              <div className="font-mono" style={{ color: "var(--primary)", wordBreak: "break-all" }}>
                {publicKey.toBase58()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
