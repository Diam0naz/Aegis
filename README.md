# Aegis Protocol

On-chain binary prediction markets on Solana, powered by LMSR pricing, batch-settled orders, and a decentralised oracle network.

---

## Architecture

```
aegis_project/
├── programs/aegis_project/   # Anchor smart contract (Rust)
├── sdk/                      # TypeScript SDK (npm package @aegis/sdk)
├── app/                      # Next.js 16 frontend
├── agents/
│   ├── crank_agent/          # Settles batch windows automatically
│   ├── oracle_agent/         # Votes on market outcomes
│   └── lp_agent/             # Manages liquidity positions
├── scripts/                  # Lifecycle scripts (create → redeem)
└── tests/                    # Anchor integration tests
```

---

## Smart Contract

**Program ID (localnet):** `FsG83myaVACEpxdy96ieCpVUAGgxVT5wq3T6nQxqPm9Y`  
**Program ID (devnet):** `E7gRicDGMsBxtLd93eYT9dJkHwnAQ1EfpmgBuoUFXDsw`

Built with Anchor 0.32.1 / Rust 1.89.0.

### Instructions

| Instruction | Description |
|---|---|
| `create_market` | Initialise a new binary market with LMSR b-param, batch window, and resolution slot |
| `add_liquidity` | Deposit USDC collateral, receive LP tokens |
| `remove_liquidity` | Burn LP tokens, withdraw proportional collateral |
| `submit_order` | Place a YES/NO order into the current batch (optionally commit-reveal) |
| `reveal_order` | Reveal a previously committed order |
| `settle_batch` | Crank: price and fill all orders in a closed batch window |
| `propose_resolution` | Post a bond and propose the winning outcome |
| `finalize_resolution` | Finalise an unchallenged proposal after the challenge window |
| `check_price_resolution` | Resolve via Pyth price feed |
| `submit_oracle_vote` | Oracle: cast a vote on the outcome |
| `tally_oracle_votes` | Tally oracle votes into a resolution proposal |
| `redeem_winnings` | Burn winning tokens, receive USDC payout |
| `pause_market` / `unpause_market` | Authority circuit-breaker |

### On-chain Accounts

| Account | Description |
|---|---|
| `Market` | Core market state: prices, liquidity, status, resolution slot |
| `LpPool` | LP position tracking and total liquidity |
| `BatchOrder` | Per-user pending order in the current batch |
| `ResolutionProposal` | Active resolution proposal with challenge window |
| `OracleConfig` | Oracle whitelist and vote threshold for a market |
| `OracleVote` | Individual oracle vote record |

---

## SDK (`@aegis/sdk`)

A typed TypeScript wrapper around the Anchor program.

```bash
# from repo root
cd sdk && npm install && npm run build
```

### Usage

```ts
import { getProgram, fetchAllMarkets, buildSubmitOrder } from "@aegis/sdk";
import { AnchorProvider } from "@coral-xyz/anchor";
import { BN } from "bn.js";

const provider = AnchorProvider.env();
const program = getProgram(provider);

// Fetch all markets
const markets = await fetchAllMarkets(program);

// Build a submit_order instruction
const ix = await buildSubmitOrder(program, {
  user: provider.wallet.publicKey,
  market: marketPubkey,
  collateralMint: usdcMint,
  outcome: { yes: {} },
  amount: new BN(1_000_000), // 1 USDC (6 decimals)
});
```

### Exports

- **`getProgram(provider)`** — returns an `AegisProgram` instance
- **PDA helpers** — `marketPda`, `lpPoolPda`, `yesMintPda`, `noMintPda`, `batchOrderPda`, `resolutionPda`, `oracleConfigPda`, `oracleVotePda`
- **Account fetchers** — `fetchMarket`, `fetchAllMarkets`, `fetchLpPool`, `fetchBatchOrder`, `fetchOpenOrdersForMarket`, `fetchResolutionProposal`, `fetchOracleConfig`, `fetchOracleVote`
- **Instruction builders** — `buildCreateMarket`, `buildAddLiquidity`, `buildRemoveLiquidity`, `buildSubmitOrder`, `buildRevealOrder`, `buildSettleBatch`, `buildProposeResolution`, `buildFinalizeResolution`, `buildCheckPriceResolution`, `buildRedeemWinnings`, `buildSubmitOracleVote`, `buildTallyOracleVotes`, `buildPauseMarket`, `buildUnpauseMarket`
- **Commit-reveal** — `buildCommitment`, `verifyCommitment`
- **Event parsing** — `parseEvents`, `fetchTransactionEvents`

---

## Frontend (`app/`)

Next.js 16 app with Solana wallet adapter.

```bash
cd app
cp .env.local.example .env.local   # set NEXT_PUBLIC_RPC_URL and NEXT_PUBLIC_AEGIS_PROGRAM_ID
npm install
npm run dev
```

**Environment variables:**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_RPC_URL` | Solana RPC endpoint (default: devnet) |
| `NEXT_PUBLIC_AEGIS_PROGRAM_ID` | Deployed program address |

---

## Agents

Three background agents manage the protocol lifecycle. Managed via PM2.

```bash
npm install          # from repo root
npm run agents:start # start all three via PM2
npm run agents:stop
npm run agents:logs
```

For development (all agents in one terminal):

```bash
npm run agents:dev
```

### Configuration

Copy and edit each agent's env file before starting:

```bash
cp agents/crank_agent/.env.example agents/crank_agent/.env
cp agents/oracle_agent/.env.example agents/oracle_agent/.env
```

| Variable | Used by | Description |
|---|---|---|
| `RPC_URL` | all | Solana RPC endpoint |
| `KEYPAIR_PATH` | crank | Path to crank wallet keypair |
| `ORACLE_KEYPAIR` | oracle | Path to oracle wallet keypair |
| `WATCH_MARKET` | crank, oracle | Single market PDA to watch (optional) |
| `IDL_PATH` | all | Path to compiled IDL JSON |

---

## Lifecycle Scripts

Run in order against a live cluster:

```bash
npm run setup        # airdrop, create USDC mint, fund wallets
npm run 1:create     # create a market → auto-registers with agents
npm run 2:liquidity  # add LP liquidity
npm run 3:orders     # submit test orders
npm run 4:settle     # manually trigger settle_batch
npm run 5:resolve    # resolve market
npm run 6:redeem     # redeem winnings
```

---

## Local Development

### Prerequisites

- Rust 1.89.0 (`rustup toolchain install 1.89.0`)
- Solana CLI ≥ 1.18
- Anchor CLI 0.32.1 (`cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.32.1`)
- Node.js ≥ 20
- PM2 (`npm install -g pm2`)

### Localnet

```bash
# 1. Start validator
solana-test-validator

# 2. Build and deploy
anchor build
anchor deploy

# 3. Run tests
anchor test --skip-local-validator

# 4. Start agents
npm run agents:start

# 5. Run lifecycle
npm run setup
npm run 1:create
# ...
```

### Tests

```bash
npm test   # runs Anchor integration tests via ts-mocha
```

---

## Project Status

| Component | Status |
|---|---|
| Smart contract | ✅ Deployed (devnet + localnet) |
| SDK | ✅ Built and published locally |
| Crank agent | ✅ Running |
| Oracle agent | ✅ Running |
| LP agent | ✅ Running |
| Frontend | 🚧 In progress — SDK integration underway |
