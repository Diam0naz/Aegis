// agents/oracle-agent/src/market-registry.ts

export type DataSource =
  | { type: "pyth";   feedId: string;  strike: number; above: boolean }
  | { type: "sports"; league: string;  teamId: string }
  | { type: "custom"; endpoint: string; jsonPath: string; expectedValue: string };

// Maps question hash (hex) → data source config
export const MARKET_REGISTRY: Record<string, DataSource> = {
  // SHA-256 of "Will BTC hit $200k by end of 2025?"
  "a3f2c1...": {
    type:   "pyth",
    feedId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    strike: 200_000,
    above:  true,
  },

  // SHA-256 of "Will the Lagos Eagles win the 2025 cup?"
  "b7d9e4...": {
    type:   "sports",
    league: "nfl",
    teamId: "lagos-eagles",
  },

  // SHA-256 of "Will Solana TVL exceed Ethereum TVL by Jan 2026?"
  "c2a8f5...": {
    type:     "custom",
    endpoint: "https://api.defillama.com/v2/chains",
    jsonPath: "$.chains[?(@.name=='Solana')].tvl",
    expectedValue: ">ethereum",
  },
};