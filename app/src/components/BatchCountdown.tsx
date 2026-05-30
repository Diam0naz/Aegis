"use client";

import { useState, useEffect } from "react";

export function useBatchCountdown(cycleSeconds = 300) {
  const [secondsLeft, setSecondsLeft] = useState(cycleSeconds);

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const left = cycleSeconds - (now % cycleSeconds);
      setSecondsLeft(left);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cycleSeconds]);

  const formatCountdown = () => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const formatCountdownDigital = () => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return { secondsLeft, formatCountdown, formatCountdownDigital };
}

interface ChipProps {
  className?: string;
}

export function BatchCountdownChip({ className = "" }: ChipProps) {
  const { formatCountdown } = useBatchCountdown();

  return (
    <div className={`batch-countdown-chip ${className}`} title="Batch Settlement Countdown">
      <span className="batch-countdown-pulse" />
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginRight: "2px" }}
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="font-mono">NEXT BATCH: {formatCountdown()}</span>
    </div>
  );
}

export function BatchCountdownLarge() {
  const { formatCountdownDigital } = useBatchCountdown();

  return (
    <div className="batch-countdown-chip large" style={{ width: "100%", margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className="batch-countdown-pulse" style={{ width: "8px", height: "8px" }} />
        <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Batch Settlement Queue
        </span>
      </div>
      <span className="font-mono" style={{ fontSize: "16px", color: "var(--primary)" }}>
        {formatCountdownDigital()}
      </span>
    </div>
  );
}
