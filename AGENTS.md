# Aegis Agents

Three background agents keep the protocol running. They are managed via [PM2](https://pm2.keymetrics.io/) using `pm2.config.js`.

## Agents

| Agent | Role |
|---|---|
| **crank-agent** | Watches active markets and calls `settle_batch` when a batch window closes, distributing outcome tokens to traders. |
| **oracle-agent** | Watches markets past their resolution slot, queries external data sources, submits an oracle vote, tallies votes into a resolution proposal, and finalises after the challenge window. |
| **lp-agent** | Manages liquidity positions — adds/removes liquidity based on configured strategy. |

Logs are written to `.logs/` in the project root.

---

## Prerequisites

```bash
npm install -g pm2
npm install          # from project root
```

Copy and configure each agent's env file before starting:

```bash
cp agents/crank_agent/.env.example agents/crank_agent/.env   # if present
cp agents/oracle_agent/.env.example agents/oracle_agent/.env
```

Key env vars:

- `RPC_URL` — Solana RPC endpoint (default: `http://127.0.0.1:8899`)
- `KEYPAIR_PATH` (crank) / `ORACLE_KEYPAIR` (oracle) — wallet used to sign transactions
- `WATCH_MARKET` — single market PDA to watch (optional, supplements `markets.json`)
- `IDL_PATH` — path to compiled IDL (default: `../../target/idl/aegis_project.json`)

---

## Starting & stopping

```bash
# Start all three agents (persistent, auto-restart on crash)
npm run agents:start

# Stop all agents
npm run agents:stop

# Restart all agents (e.g. after a code change)
npm run agents:restart

# Check running status
npm run agents:status
```

For development (all agents in one terminal with coloured output, no PM2):

```bash
npm run agents:dev
```

---

## Logs

```bash
# Tail all agent logs
npm run agents:logs

# Tail a specific agent
pm2 logs crank-agent
pm2 logs oracle-agent
pm2 logs lp-agent

# View error logs only
pm2 logs crank-agent --err
```

Log files on disk:

```
.logs/crank-agent.log
.logs/crank-agent.error.log
.logs/oracle-agent.log
.logs/oracle-agent.error.log
.logs/lp-agent.log
.logs/lp-agent.error.log
```

---

## Adding a new market

Run the creation script — it automatically registers the market PDA with both the crank and oracle agents:

```bash
npm run 1:create
```

The market PDA is appended to `agents/crank_agent/markets.json` and `agents/oracle_agent/markets.json`. Both agents pick it up on their next poll cycle (within 1–5 seconds) without a restart.

To add a market manually:

```json
// agents/crank_agent/markets.json
{
  "markets": [
    "YourMarketPDA..."
  ]
}
```

---

## Full lifecycle (localnet)

```bash
# 1. Start a local validator
solana-test-validator

# 2. Deploy the program
anchor deploy

# 3. Start agents
npm run agents:start

# 4. Run the market lifecycle scripts in order
npm run 1:create      # create market → auto-registers with agents
npm run 2:liquidity   # add LP liquidity
npm run 3:orders      # submit test orders
npm run 4:settle      # manually trigger settle_batch (crank does this automatically)
npm run 5:resolve     # resolve market (oracle does this automatically)
npm run 6:redeem      # redeem winnings
```

---

## PM2 survival across reboots

```bash
pm2 startup          # generates a startup command — run the printed command as root
pm2 save             # saves current process list
```

To clear saved processes:

```bash
pm2 delete all
pm2 save --force
```
