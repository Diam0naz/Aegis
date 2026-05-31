import { Connection, PublicKey } from "@solana/web3.js";
import { AegisProgram } from "@aegis/sdk";
import { bpsToPercent, slotToCountdown } from "./utils";

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

export async function fetchAllMarketsForDisplay(
  program: AegisProgram,
  currentSlot: number,
): Promise<MarketView[]> {
  const markets = await (program.account as any).market.all();

  return markets.map(({ publicKey, account }: any) => {
    const yq = account.yes_qty ?? 0;
    const nq = account.no_qty ?? 0;
    const yesBps = yq === 0 && nq === 0 ? 5000 : Math.round((yq / (yq + nq)) * 10_000);
    const noBps = 10_000 - yesBps;

    return {
      address: publicKey.toBase58(),
      yesPriceBps: yesBps,
      noPriceBps: noBps,
      yesPercent: bpsToPercent(yesBps),
      noPercent: bpsToPercent(noBps),
      totalLiquidity: ((account.total_fees_collected?.toNumber?.() ?? 0) / 1_000_000).toFixed(2),
      status: Object.keys(account.status ?? { active: {} })[0],
      resolutionSlot: account.resolution_slot?.toNumber?.() ?? 0,
      countdown: slotToCountdown(account.resolution_slot?.toNumber?.() ?? 0, currentSlot),
    };
  });
}

export function subscribeToMarket(
  connection: Connection,
  program: AegisProgram,
  marketPDA: PublicKey,
  onUpdate: (market: any) => void,
): number {
  return connection.onAccountChange(marketPDA, (info) => {
    try {
      const market = (program.coder as any).accounts.decode("Market", info.data);
      onUpdate(market);
    } catch (e) {
      console.error("Failed to decode market account:", e);
    }
  });
}
