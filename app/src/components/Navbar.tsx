"use client";

import { useState } from "react";
import Link from "next/link";
import { BatchCountdownChip } from "@/components/BatchCountdown";

export default function Navbar() {
  const [connected, setConnected] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <div className="navbar-left">
            {/* Logo */}
            <Link href="/" className="navbar-logo">
              <span className="logo-icon" aria-hidden="true">⬡</span>
              <span className="logo-text">Aegis</span>
              <span className="logo-badge">Protocol</span>
            </Link>

            {/* Navigation links */}
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

          {/* Right actions */}
          <div className="navbar-actions">
            <BatchCountdownChip />
            
            <div className="network-pill" title="Connected to Aegis Devnet">
              <span className="network-dot" />
              Devnet
            </div>

            <button
              id="connect-wallet-btn"
              className={`connect-btn ${connected ? "connected" : ""}`}
              onClick={() => setConnected((v) => !v)}
              aria-label={connected ? "Disconnect wallet" : "Connect wallet"}
            >
              {connected ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="connect-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--yes)" }} />
                  <span className="font-mono">7x9F…j5H</span>
                </div>
              ) : (
                "CONNECT WALLET"
              )}
            </button>
          </div>
        </div>
      </header>

      {/* How it Works Modal */}
      {showHowItWorks && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-amber)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 0 30px rgba(245,158,11,0.15)",
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
                <strong style={{ color: "#fff" }}>1. Place Batch Orders:</strong> Instead of instant execution, Aegis pools all YES and NO swap orders during a 5-minute settlement interval.
              </p>
              <p>
                <strong style={{ color: "#fff" }}>2. Liquidity & LMSR:</strong> Aegis aggregates all bids and asks. Price changes are calculated mathematically using the logarithmic market scoring rule (LMSR) based on the net imbalance.
              </p>
              <p>
                <strong style={{ color: "#fff" }}>3. Batch Settlement:</strong> Every 5 minutes, the batch is cleared at a single, fair clearing price. This mitigates front-running, high-frequency trading, and gas wars.
              </p>
              <p>
                <strong style={{ color: "#fff" }}>4. Zero slippage:</strong> Trades settle atomically. All orders within a batch share the exact same clearing rate.
              </p>
            </div>
            <button
              onClick={() => setShowHowItWorks(false)}
              className="place-order-btn"
              style={{ marginTop: "20px" }}
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
}
