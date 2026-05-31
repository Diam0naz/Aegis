"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { BatchCountdownChip } from "@/components/BatchCountdown";
import { truncatePubkey } from "@/lib/utils";

export default function Navbar() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleWalletClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <div className="navbar-left">
            <Link href="/" className="navbar-logo">
              <span className="logo-icon" aria-hidden="true">⬡</span>
              <span className="logo-text">Aegis</span>
              <span className="logo-badge">Protocol</span>
            </Link>

            <nav className="navbar-nav" aria-label="Main navigation" style={{ marginLeft: "12px" }}>
              <Link href="/" className="nav-link">Home</Link>
              <Link href="/markets" className="nav-link">Markets</Link>
              <Link href="/portfolio" className="nav-link">Portfolio</Link>
              <Link href="/create" className="nav-link">Create Market</Link>
              <button onClick={() => setShowHowItWorks(true)} className="nav-link">
                How It Works
              </button>
            </nav>
          </div>

          <div className="navbar-actions">
            <BatchCountdownChip />

            <div className="network-pill" title="Connected to Aegis Devnet">
              <span className="network-dot" />
              Devnet
            </div>

            <button
              id="connect-wallet-btn"
              className={`connect-btn ${connected ? "connected" : ""}`}
              onClick={handleWalletClick}
              aria-label={connected ? "Disconnect wallet" : "Connect wallet"}
            >
              {connected && publicKey ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--yes)", display: "inline-block" }} />
                  <span className="font-mono">{truncatePubkey(publicKey.toBase58())}</span>
                </div>
              ) : (
                "CONNECT WALLET"
              )}
            </button>
          </div>
        </div>
      </header>

      {showHowItWorks && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-amber)",
              borderRadius: "12px", padding: "24px",
              maxWidth: "500px", width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ color: "var(--primary)", fontSize: "18px", fontWeight: "800", textTransform: "uppercase" }}>
                How Aegis Batch Settlement Works
              </h2>
              <button onClick={() => setShowHowItWorks(false)} style={{ fontSize: "18px", color: "var(--text-muted)" }}>
                ✕
              </button>
            </div>
            <div className="font-mono" style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", lineHeight: "1.6", color: "var(--text-muted)" }}>
              <p>
                <strong style={{ color: "#fff" }}>1. Place Batch Orders:</strong> Instead of instant execution, Aegis pools all YES and NO swap orders during a settlement window.
              </p>
              <p>
                <strong style={{ color: "#fff" }}>2. LMSR Pricing:</strong> Prices are calculated using the Logarithmic Market Scoring Rule — a mathematically bounded formula that guarantees liquidity at all prices.
              </p>
              <p>
                <strong style={{ color: "#fff" }}>3. Batch Settlement:</strong> Every window, the crank agent clears all orders at a single fair price. This eliminates front-running and MEV attacks.
              </p>
              <p>
                <strong style={{ color: "#fff" }}>4. Oracle Resolution:</strong> After the resolution slot, bonded oracles vote on the outcome. Winners redeem outcome tokens 1:1 for USDC.
              </p>
            </div>
            <button onClick={() => setShowHowItWorks(false)} className="place-order-btn" style={{ marginTop: "20px" }}>
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
}
