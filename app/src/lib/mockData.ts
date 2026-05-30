// ── Mock Prediction Market Data ──────────────────────────────────────

export type MarketStatus = "active" | "locked" | "resolved";
export type Category = "crypto" | "politics" | "sports" | "tech" | "economics" | "custom";
export type Outcome = "yes" | "no";

export interface OutcomeOption {
  id: string;
  name: string; // e.g., "June 30", "Sept 30", "Dec 31" or "YES", "NO"
  price: number; // 0-100 (¢)
  history: number[]; // 25 price data points
}

export interface MockMarket {
  id: string;
  question: string;
  description: string;
  category: Category;
  status: MarketStatus;
  yesPrice: number;     // 0-100 for binary markets
  noPrice: number;      // 0-100 for binary markets
  volume: number;       // total volume in USDC
  volume24h: number;    // 24h volume
  liquidity: number;    // liquidity in pool
  feeBps: number;       // e.g. 200 = 2%
  bParam: number;       // LMSR parameter
  resolutionDate: string;
  resolutionSource: string;
  winningOutcome?: string;
  createdAt: string;
  isLive?: boolean;
  isFeatured?: boolean;
  isSportsMatchup?: boolean;
  // Sports-specific fields
  teams?: {
    home: { name: string; score: number; logo: string };
    away: { name: string; score: number; logo: string };
    homeYesPrice: number;
    awayYesPrice: number;
  };
  // Multi-outcome options (e.g., for ETH $10k by date timeline chart)
  outcomes?: OutcomeOption[];
  // Price history for sparkline charts
  sparkline?: number[];
}

// Generate simple price histories
const generateHistory = (start: number, end: number, length = 25): number[] => {
  const arr: number[] = [];
  const step = (end - start) / (length - 1);
  for (let i = 0; i < length; i++) {
    const noise = Math.sin(i * 0.8) * 4 + (Math.random() - 0.5) * 3;
    const val = Math.max(2, Math.min(98, Math.round(start + step * i + noise)));
    arr.push(val);
  }
  arr[length - 1] = end; // ensure last element matches current price
  return arr;
};

export const MOCK_MARKETS: MockMarket[] = [
  {
    id: "eth-10k-timeline",
    question: "Will Ethereum (ETH) hit $10,000 in 2026?",
    description: "This market resolves to YES for the respective outcome if Coinbase Exchange (ETH-USD) reports a trade price of $10,000.00 or higher at any time on or before the specified date. Each timeline node resolves independently.",
    category: "crypto",
    status: "active",
    yesPrice: 45,
    noPrice: 55,
    volume: 1420500,
    volume24h: 184000,
    liquidity: 500000,
    feeBps: 200,
    bParam: 1200,
    resolutionDate: "Dec 31, 2026",
    resolutionSource: "Coinbase Exchange API",
    createdAt: "Jan 1, 2026",
    isFeatured: true,
    outcomes: [
      {
        id: "eth-10k-jun",
        name: "June 30, 2026",
        price: 22,
        history: generateHistory(10, 22, 30),
      },
      {
        id: "eth-10k-sep",
        name: "Sept 30, 2026",
        price: 45,
        history: generateHistory(25, 45, 30),
      },
      {
        id: "eth-10k-dec",
        name: "Dec 31, 2026",
        price: 67,
        history: generateHistory(40, 67, 30),
      },
    ],
    sparkline: generateHistory(30, 45),
  },
  {
    id: "sol-flip-eth",
    question: "Will Solana's market cap surpass Ethereum's in 2026?",
    description: "This market resolves to YES if on any day in 2026, Solana's market capitalization exceeds Ethereum's market capitalization based on CoinGecko's daily close data.",
    category: "crypto",
    status: "active",
    yesPrice: 31,
    noPrice: 69,
    volume: 875200,
    volume24h: 62400,
    liquidity: 220000,
    feeBps: 150,
    bParam: 800,
    resolutionDate: "Dec 31, 2026",
    resolutionSource: "CoinGecko API (Market Cap Close)",
    createdAt: "Jan 10, 2026",
    sparkline: generateHistory(18, 31),
    isLive: true,
  },
  {
    id: "gpt5-release",
    question: "Will OpenAI release GPT-5 before July 1, 2026?",
    description: "This market resolves to YES if OpenAI officially announces and makes publicly available a large language model explicitly named 'GPT-5' or designated as the direct successor to GPT-4 on or before 11:59 PM UTC, June 30, 2026.",
    category: "tech",
    status: "active",
    yesPrice: 73,
    noPrice: 27,
    volume: 980400,
    volume24h: 112000,
    liquidity: 340000,
    feeBps: 200,
    bParam: 1500,
    resolutionDate: "Jun 30, 2026",
    resolutionSource: "OpenAI Press Releases & Public Announcements",
    createdAt: "Feb 15, 2026",
    sparkline: generateHistory(55, 73),
  },
  {
    id: "fed-rate-cut",
    question: "Will the Fed cut interest rates below 3.5% by end of 2026?",
    description: "This market resolves to YES if the Federal Open Market Committee (FOMC) lowers the target range for the federal funds rate such that the upper bound is below 3.5% at any point during 2026.",
    category: "economics",
    status: "active",
    yesPrice: 65,
    noPrice: 35,
    volume: 1204000,
    volume24h: 94000,
    liquidity: 410000,
    feeBps: 100,
    bParam: 2500,
    resolutionDate: "Dec 18, 2026",
    resolutionSource: "Federal Reserve Board Public Announcements",
    createdAt: "Jan 15, 2026",
    sparkline: generateHistory(45, 65),
  },
  {
    id: "sports-celtics-mavs",
    question: "NBA Matchup: Boston Celtics vs Dallas Mavericks",
    description: "This market resolves to YES if the Boston Celtics win the live game against the Dallas Mavericks. If the game is postponed, standard settlement delay rules apply.",
    category: "sports",
    status: "active",
    yesPrice: 78,
    noPrice: 22,
    volume: 340900,
    volume24h: 87000,
    liquidity: 90000,
    feeBps: 250,
    bParam: 600,
    resolutionDate: "May 30, 2026",
    resolutionSource: "NBA Official Box Score",
    createdAt: "May 28, 2026",
    isLive: true,
    isSportsMatchup: true,
    teams: {
      home: { name: "Boston Celtics", score: 104, logo: "☘️" },
      away: { name: "Dallas Mavericks", score: 101, logo: "🐴" },
      homeYesPrice: 78,
      awayYesPrice: 22,
    },
    sparkline: generateHistory(62, 78),
  },
  {
    id: "sports-mancity-arsenal",
    question: "Premier League: Manchester City vs Arsenal",
    description: "This market resolves to YES (or home win) if Manchester City wins the match. Draw resolves to 50/50. Away win resolves to NO.",
    category: "sports",
    status: "active",
    yesPrice: 55,
    noPrice: 45,
    volume: 410300,
    volume24h: 124000,
    liquidity: 150000,
    feeBps: 250,
    bParam: 700,
    resolutionDate: "May 30, 2026",
    resolutionSource: "Premier League Official",
    createdAt: "May 27, 2026",
    isLive: true,
    isSportsMatchup: true,
    teams: {
      home: { name: "Manchester City", score: 2, logo: "🩵" },
      away: { name: "Arsenal", score: 2, logo: "🔴" },
      homeYesPrice: 55,
      awayYesPrice: 45,
    },
    sparkline: generateHistory(50, 55),
  },
  {
    id: "stablecoin-bill",
    question: "Will the US pass a federal stablecoin bill in 2026?",
    description: "This market resolves to YES if a federal stablecoin bill is signed into law by the President of the United States on or before December 31, 2026.",
    category: "politics",
    status: "active",
    yesPrice: 58,
    noPrice: 42,
    volume: 512000,
    volume24h: 31000,
    liquidity: 180000,
    feeBps: 200,
    bParam: 1000,
    resolutionDate: "Dec 31, 2026",
    resolutionSource: "Congress.gov / US Senate records",
    createdAt: "Feb 10, 2026",
    sparkline: generateHistory(40, 58),
  },
  {
    id: "btc-200k",
    question: "Will Bitcoin (BTC) touch $200,000 in 2026?",
    description: "Resolves to YES if BTC-USD on Binance or Coinbase hits $200,000.00 at any point during 2026.",
    category: "crypto",
    status: "active",
    yesPrice: 53,
    noPrice: 47,
    volume: 2450000,
    volume24h: 340000,
    liquidity: 800000,
    feeBps: 150,
    bParam: 3000,
    resolutionDate: "Dec 31, 2026",
    resolutionSource: "Coinbase BTC-USD API",
    createdAt: "Jan 1, 2026",
    sparkline: generateHistory(35, 53),
  },
  {
    id: "apple-robot",
    question: "Will Apple announce an AI-native smart home robot in 2026?",
    description: "Resolves to YES if Apple officially announces an autonomous or semi-autonomous robotics device designed for home usage, integrating Siri or other LLMs, in 2026.",
    category: "tech",
    status: "active",
    yesPrice: 42,
    noPrice: 58,
    volume: 389000,
    volume24h: 18000,
    liquidity: 100000,
    feeBps: 200,
    bParam: 900,
    resolutionDate: "Dec 31, 2026",
    resolutionSource: "Apple Newsroom / Official Press Releases",
    createdAt: "Mar 1, 2026",
    sparkline: generateHistory(25, 42),
  },
  {
    id: "uk-rejoin-eu",
    question: "Will the UK announce steps to rejoin the EU single market?",
    description: "Resolves to YES if the Prime Minister or UK Government officially announces an application or formal negotiations to rejoin the EU single market or customs union before December 31, 2026.",
    category: "politics",
    status: "active",
    yesPrice: 14,
    noPrice: 86,
    volume: 284000,
    volume24h: 8400,
    liquidity: 90000,
    feeBps: 200,
    bParam: 700,
    resolutionDate: "Dec 31, 2026",
    resolutionSource: "Official UK Parliament Records",
    createdAt: "Jan 20, 2026",
    sparkline: generateHistory(20, 14),
  },
  {
    id: "gdp-growth-q3",
    question: "Will annualized US GDP growth exceed 3.0% in Q3 2026?",
    description: "Resolves to YES if the advance estimate of third-quarter GDP growth for 2026 published by the BEA is 3.1% or higher.",
    category: "economics",
    status: "active",
    yesPrice: 48,
    noPrice: 52,
    volume: 395000,
    volume24h: 14000,
    liquidity: 110000,
    feeBps: 150,
    bParam: 1000,
    resolutionDate: "Oct 28, 2026",
    resolutionSource: "Bureau of Economic Analysis (BEA) Release",
    createdAt: "Apr 1, 2026",
    sparkline: generateHistory(50, 48),
  },
  {
    id: "global-cpi-drop",
    question: "Will US annual CPI inflation drop below 2.0% by December 2025?",
    description: "Resolves to YES if the year-over-year CPI-U rate for December 2025 (published in January 2026) is strictly less than 2.0%.",
    category: "economics",
    status: "resolved",
    yesPrice: 0,
    noPrice: 100,
    volume: 1890000,
    volume24h: 0,
    liquidity: 0,
    feeBps: 100,
    bParam: 2000,
    resolutionDate: "Jan 12, 2026",
    resolutionSource: "Bureau of Labor Statistics (BLS) Release",
    winningOutcome: "no",
    createdAt: "Jan 15, 2025",
    sparkline: generateHistory(45, 0),
  },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  crypto: "Crypto",
  politics: "Politics",
  sports: "Sports",
  tech: "Tech",
  economics: "Economics",
  custom: "Custom",
};

// ── Mock Portfolio Data ──────────────────────────────────────────────

export interface PortfolioPosition {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: Outcome;
  shares: number;
  entryPrice: number;  // in cents (0-100)
  currentPrice: number; // in cents (0-100)
  totalValue: number;  // in USDC
  pnl: number;         // P&L in USDC
  pnlPercent: number;  // P&L %
  createdAt: string;
}

export interface PendingBatchOrder {
  id: string;
  marketId: string;
  marketQuestion: string;
  side: "BUY" | "SELL";
  outcome: Outcome;
  amount: number;       // USDC amount
  expectedShares: number;
  queuePosition: number;
  batchCountdownSeconds: number; // e.g., 85 seconds
}

export interface HistoricalPosition {
  id: string;
  marketQuestion: string;
  outcome: Outcome;
  shares: number;
  payout: number;
  result: "won" | "lost";
  netProfit: number;
  date: string;
}

export const MOCK_PORTFOLIO = {
  summary: {
    totalValue: 8450.25,
    pnl: 1120.50,
    pnlPercent: 15.28,
    winRate: "72.5% (29 W / 11 L)",
    historicalRoi: 24.8,
  },
  riskMetrics: {
    profitFactor: 1.84,
    avgWin: 340.00,
    avgLoss: -180.00,
    bestPerformer: "OpenAI GPT-5 YES",
    worstPerformer: "Solana Flippening YES",
  },
  allocations: [
    { category: "crypto", percent: 45, amount: 3802.61 },
    { category: "tech", percent: 25, amount: 2112.56 },
    { category: "politics", percent: 15, amount: 1267.54 },
    { category: "sports", percent: 10, amount: 845.03 },
    { category: "economics", percent: 5, amount: 422.51 },
  ],
  performanceHistory: [
    { date: "May 01", value: 7330 },
    { date: "May 05", value: 7500 },
    { date: "May 10", value: 7420 },
    { date: "May 15", value: 7850 },
    { date: "May 20", value: 8120 },
    { date: "May 25", value: 8090 },
    { date: "May 30", value: 8450.25 },
  ],
  positions: [
    {
      id: "pos-1",
      marketId: "gpt5-release",
      marketQuestion: "Will OpenAI release GPT-5 before July 1, 2026?",
      outcome: "yes" as Outcome,
      shares: 3000,
      entryPrice: 58,
      currentPrice: 73,
      totalValue: 2190,
      pnl: 450.00,
      pnlPercent: 25.86,
      createdAt: "Feb 20, 2026",
    },
    {
      id: "pos-2",
      marketId: "fed-rate-cut",
      marketQuestion: "Will the Fed cut interest rates below 3.5% by end of 2026?",
      outcome: "yes" as Outcome,
      shares: 4000,
      entryPrice: 50,
      currentPrice: 65,
      totalValue: 2600,
      pnl: 600.00,
      pnlPercent: 30.00,
      createdAt: "Feb 10, 2026",
    },
    {
      id: "pos-3",
      marketId: "sol-flip-eth",
      marketQuestion: "Will Solana's market cap surpass Ethereum's in 2026?",
      outcome: "yes" as Outcome,
      shares: 2000,
      entryPrice: 38,
      currentPrice: 31,
      totalValue: 620,
      pnl: -140.00,
      pnlPercent: -18.42,
      createdAt: "Jan 12, 2026",
    },
  ],
  pendingOrders: [
    {
      id: "ord-1",
      marketId: "eth-10k-timeline",
      marketQuestion: "Will Ethereum (ETH) hit $10,000 in 2026?",
      side: "BUY" as const,
      outcome: "yes" as Outcome,
      amount: 500,
      expectedShares: 746,
      queuePosition: 4,
      batchCountdownSeconds: 85,
    },
    {
      id: "ord-2",
      marketId: "stablecoin-bill",
      marketQuestion: "Will the US pass a federal stablecoin bill in 2026?",
      side: "BUY" as const,
      outcome: "yes" as Outcome,
      amount: 250,
      expectedShares: 431,
      queuePosition: 2,
      batchCountdownSeconds: 85,
    },
  ],
  history: [
    {
      id: "hist-1",
      marketQuestion: "Will US annual CPI inflation drop below 2.0% by December 2025?",
      outcome: "no",
      shares: 1500,
      payout: 1500,
      result: "won",
      netProfit: 675.00,
      date: "Jan 12, 2026",
    },
    {
      id: "hist-2",
      marketQuestion: "Will BTC reach $100k by December 31, 2025?",
      outcome: "yes",
      shares: 2000,
      payout: 2000,
      result: "won",
      netProfit: 800.00,
      date: "Dec 31, 2025",
    },
    {
      id: "hist-3",
      marketQuestion: "Will Apple release Apple Glass in Q1 2026?",
      outcome: "yes",
      shares: 1000,
      payout: 0,
      result: "lost",
      netProfit: -450.00,
      date: "Apr 1, 2026",
    },
  ] as HistoricalPosition[],
};

// ── Mock Order Books ─────────────────────────────────────────────────

export interface OrderBookRow {
  price: number; // 0-100 (¢)
  quantity: number; // shares
  total: number; // cumulative USDC value
}

export const MOCK_ORDER_BOOKS: Record<string, { bids: OrderBookRow[]; asks: OrderBookRow[] }> = {
  default: {
    bids: [
      { price: 64, quantity: 12500, total: 8000 },
      { price: 63, quantity: 18000, total: 19340 },
      { price: 62, quantity: 34000, total: 40420 },
      { price: 60, quantity: 45000, total: 67420 },
      { price: 58, quantity: 60000, total: 102220 },
    ],
    asks: [
      { price: 66, quantity: 9500, total: 6270 },
      { price: 67, quantity: 15000, total: 16320 },
      { price: 68, quantity: 22000, total: 31280 },
      { price: 70, quantity: 55000, total: 69780 },
      { price: 72, quantity: 80000, total: 127380 },
    ],
  },
  "gpt5-release": {
    bids: [
      { price: 72, quantity: 24500, total: 17640 },
      { price: 71, quantity: 35000, total: 42490 },
      { price: 70, quantity: 88000, total: 104090 },
      { price: 68, quantity: 120000, total: 185690 },
    ],
    asks: [
      { price: 74, quantity: 12000, total: 8880 },
      { price: 75, quantity: 28500, total: 30255 },
      { price: 76, quantity: 64000, total: 78895 },
      { price: 78, quantity: 110000, total: 164695 },
    ],
  },
};

// ── Mock Activity Feed ───────────────────────────────────────────────

export interface ActivityTrade {
  id: string;
  marketId: string;
  marketQuestion: string;
  side: "BUY" | "SELL";
  outcome: Outcome;
  shares: number;
  amount: number; // USDC
  time: string;
  user: string;
}

export const MOCK_ACTIVITY: ActivityTrade[] = [
  {
    id: "act-1",
    marketId: "eth-10k-timeline",
    marketQuestion: "Will Ethereum (ETH) hit $10,000 in 2026?",
    side: "BUY",
    outcome: "yes",
    shares: 2450,
    amount: 1102.50,
    time: "24s ago",
    user: "7x9F…j5H",
  },
  {
    id: "act-2",
    marketId: "gpt5-release",
    marketQuestion: "Will OpenAI release GPT-5 before July 1, 2026?",
    side: "SELL",
    outcome: "no",
    shares: 1200,
    amount: 324.00,
    time: "1m 12s ago",
    user: "3mKp…6yA1",
  },
  {
    id: "act-3",
    marketId: "sol-flip-eth",
    marketQuestion: "Will Solana's market cap surpass Ethereum's in 2026?",
    side: "BUY",
    outcome: "yes",
    shares: 5000,
    amount: 1550.00,
    time: "2m 45s ago",
    user: "9rTp…3yH",
  },
  {
    id: "act-4",
    marketId: "fed-rate-cut",
    marketQuestion: "Will the Fed cut interest rates below 3.5% by end of 2026?",
    side: "BUY",
    outcome: "yes",
    shares: 800,
    amount: 520.00,
    time: "3m 15s ago",
    user: "2cFh…kJ6",
  },
  {
    id: "act-5",
    marketId: "stablecoin-bill",
    marketQuestion: "Will the US pass a federal stablecoin bill in 2026?",
    side: "SELL",
    outcome: "yes",
    shares: 3200,
    amount: 1856.00,
    time: "5m 4s ago",
    user: "6pWm…gY",
  },
];
