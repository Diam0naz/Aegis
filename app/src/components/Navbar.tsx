"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [connected, setConnected] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          <div className="logo-icon" aria-hidden="true">⬡</div>
          <span className="logo-text">Aegis</span>
          <span className="logo-badge">Protocol</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="navbar-nav" aria-label="Main navigation">
          <Link href="/" className="nav-link">Markets</Link>
          <Link href="/portfolio" className="nav-link">Portfolio</Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            Docs
          </a>
        </nav>

        {/* Right side */}
        <div className="navbar-actions">
          <div className="network-pill" title="Connected to Devnet">
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
              <>
                <span className="connect-dot" />
                7x9F…j5H
              </>
            ) : (
              "Connect Wallet"
            )}
          </button>

          {/* Mobile toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <Link href="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            Markets
          </Link>
          <Link href="/portfolio" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            Portfolio
          </Link>
          <a href="https://github.com" className="mobile-nav-link">Docs</a>
        </nav>
      )}
    </header>
  );
}
