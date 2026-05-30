import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { AegisProject } from "@/target/types/aegis_project";
import { formatUsdc, bpsToPercent, slotToCountdown } from "./utils";

export interface MarketView {
  address: string;
  yesPriceBps: number;
  noPriceBps: number;
  yesPercent: string;
  noPercent: string;
  totalLiquidity: string;
  status: string;
  resolutionSlot: number;
  countdown: string;
}

/** Fetch all markets and shape them for display */
export async function fetchAllMarkets(
  program: Program<AegisProject>,
  currentSlot: number,
): Promise<MarketView[]> {
  const markets = await program.account.market.all();

  return markets.map(({ publicKey, account }) => {
    const yesBps =
      account.yes_qty === 0 && account.no_qty === 0
        ? 5000
        : Math.round(
            (account.yes_qty / (account.yes_qty + account.no_qty)) * 10_000,
          );
    const noBps = 10_000 - yesBps;

    return {
      address: publicKey.toBase58(),
      yesPriceBps: yesBps,
      noPriceBps: noBps,
      yesPercent: bpsToPercent(yesBps),
      noPercent: bpsToPercent(noBps),
      totalLiquidity: formatUsdc(account.total_fees_collected),
      status: Object.keys(account.status)[0],
      resolutionSlot: account.resolution_slot.toNumber(),
      countdown: slotToCountdown(account.resolution_slot, currentSlot),
    };
  });
}

/** Subscribe to live market account changes */
export function subscribeToMarket(
  connection: Connection,
  program: Program<AegisProject>,
  marketPDA: PublicKey,
  onUpdate: (market: any) => void,
): number {
  return connection.onAccountChange(marketPDA, (info) => {
    try {
      const market = program.coder.accounts.decode("Market", info.data);
      onUpdate(market);
    } catch (e) {
      console.error("Failed to decode market account:", e);
    }
  });
}
