# Aegis LP Management Agent

The LP Management Agent monitors pool depth, risk metrics, and Predictive Divergence Loss (PDL) across Aegis prediction markets. It tracks and verifies target performance metrics (KPIs) in real time to ensure reliable and timely warnings for Liquidity Providers (LPs).

## Features

- **PDL Calculation**: Computes Predictive Divergence Loss using fixed-point LMSR math matching the on-chain Anchor program.
- **Risk Alerting**: Identifies position risks (such as high utilization, severe PDL drops, and low depth) and fires warning/critical alerts.
- **Deduplication Cooldown**: Restricts alerts to a 1-minute cooldown window per market per alert type to avoid alerting spam.
- **Performance KPI Tracking**: Monitors its own accuracy, latency, and false positive rates.

---

## LP Agent KPIs

The agent automatically tracks and validates the following performance targets:

| Metric | Target | Description |
| :--- | :--- | :--- |
| **PDL Tracking Accuracy** | Within 1% of on-chain calculation | Verifies calculated PDL deviation against raw on-chain state to prevent false warnings due to math errors. |
| **Alert Latency** | < 30 seconds from on-chain event | Measures delay between on-chain slot times and local warning generation to give LPs ample response time. |
| **False Positive Rate** | < 5% on loss alerts | Ensures loss warnings match actual settled outcomes so that alerts remain trusted and actionable. |
| **Pools Monitored Simultaneously** | > 20 at launch | Validates agent scalability across active prediction markets. |

---

## Configuration

Settings are configured using the local `.env` file:

```ini
RPC_URL=http://127.0.0.1:8899
KEYPAIR_PATH=~/.config/solana/id.json
POLL_INTERVAL_MS=3000
MARKETS_FILE="../crank_agent/markets.json"

# Alert thresholds (BPS)
PDL_WARN_BPS=500
PDL_CRITICAL_BPS=1500
DEPTH_WARN_USDC=50000000
IL_WARN_BPS=200

# KPI Targets
KPI_PDL_ACCURACY_PCT=1.0
KPI_ALERT_LATENCY_MS=30000
KPI_FALSE_POSITIVE_MAX_PCT=5.0
KPI_MIN_POOLS_MONITORED=20
```

---

## Getting Started

### Prerequisites
Make sure you have Node.js installed and dependencies configured:
```bash
npm install
```

### Run the Agent
To start the agent polling loop:
```bash
npm start
```

The agent will poll every `POLL_INTERVAL_MS` and print a compiled KPI dashboard report to console every 60 seconds.
