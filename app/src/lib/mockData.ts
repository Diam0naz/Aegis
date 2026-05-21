// ── Mock Market Data ──────────────────────────────────────────────
// Matches the on-chain Market struct from state/market.rs
// Replace with live program.account.market.all() calls once connected

export type MarketStatus = "active" | "locked" | "resolved";
export type Outcome = "yes" | "no";
export type Category = "crypto" | "macro" | "sports" | "politics" | "custom";

export interface MockMarket {
  id: string;           // Simulated pubkey
  question: string;     // Human-readable question (hash stored on-chain)
  category: Category;
  status: MarketStatus;
  yesPrice: number;     // 0–100
  noPrice: number;      // 0–100
  volume: number;       // USDC (6 decimals, displayed as whole dollars)
  liquidity: number;    // USDC in LP pool
  feeBps: number;       // e.g. 200 = 2%
  bParam: number;       // LMSR b parameter
  resolutionSlot: number;
  resolutionDate: string;
  winningOutcome?: Outcome;
  createdAt: string;
}

export const MOCK_MARKETS: MockMarket[] = [
  {
    id: "7x9Fk2mNpQrLsV3dA8bCeGhJwYuXiZoT1vRnU4cWj5H",
    question: "Will BTC exceed $150,000 before end of 2025?",
    category: "crypto",
    status: "active",
    yesPrice: 62,
    noPrice: 38,
    volume: 284_500,
    liquidity: 120_000,
    feeBps: 200,
    bParam: 1000,
    resolutionSlot: 320_000,
    resolutionDate: "Dec 31, 2025",
    createdAt: "May 1, 2025",
  },
  {
    id: "3mKpLqZsEwYuDfRnVxTa9bCjGhNiO2vWlUcX8dF6yA1",
    question: "Will Solana's market cap surpass Ethereum's by Q4 2025?",
    category: "crypto",
    status: "active",
    yesPrice: 28,
    noPrice: 72,
    volume: 97_200,
    liquidity: 55_000,
    feeBps: 150,
    bParam: 800,
    resolutionSlot: 310_000,
    resolutionDate: "Oct 1, 2025",
    createdAt: "Apr 28, 2025",
  },
  {
    id: "9rTpN5mKwEsQxVzA2dBcLfYuGhJiO4vWnU7eX1gF3yH",
    question: "Will the Fed cut interest rates in Q3 2025?",
    category: "macro",
    status: "locked",
    yesPrice: 45,
    noPrice: 55,
    volume: 512_000,
    liquidity: 200_000,
    feeBps: 100,
    bParam: 2000,
    resolutionSlot: 280_000,
    resolutionDate: "Sep 15, 2025",
    createdAt: "Mar 10, 2025",
  },
  {
    id: "2cFhL8nMsRwXuDqVaT5bEjKpOiGzN1vYlWmU9dA4kJ6",
    question: "Will ETH implement full danksharding by Jan 2026?",
    category: "crypto",
    status: "active",
    yesPrice: 18,
    noPrice: 82,
    volume: 43_800,
    liquidity: 30_000,
    feeBps: 200,
    bParam: 500,
    resolutionSlot: 410_000,
    resolutionDate: "Jan 1, 2026",
    createdAt: "May 10, 2025",
  },
  {
    id: "6pWmQ3rKtNyEoXsZuV1dCbAjLhGfI8vRlTn5eU2kF9gY",
    question: "Will the 2026 World Cup host nation reach the semifinals?",
    category: "sports",
    status: "active",
    yesPrice: 51,
    noPrice: 49,
    volume: 78_100,
    liquidity: 40_000,
    feeBps: 250,
    bParam: 600,
    resolutionSlot: 380_000,
    resolutionDate: "Jul 15, 2026",
    createdAt: "May 12, 2025",
  },
  {
    id: "1aDhM7nLsQvXwEpZuT4bFjKcOiGzN0vYkWnU8eR2gJ5",
    question: "Will global CPI inflation drop below 2% by Dec 2025?",
    category: "macro",
    status: "resolved",
    yesPrice: 0,
    noPrice: 100,
    volume: 1_204_000,
    liquidity: 0,
    feeBps: 100,
    bParam: 3000,
    resolutionSlot: 200_000,
    resolutionDate: "Dec 1, 2025",
    winningOutcome: "no",
    createdAt: "Jan 5, 2025",
  },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  crypto: "Crypto",
  macro: "Macro",
  sports: "Sports",
  politics: "Politics",
  custom: "Custom",
};
