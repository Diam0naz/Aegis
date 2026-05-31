"use client";

import { useState, useEffect } from "react";
import { fetchAllMarkets } from "@aegis/sdk";
import { useAegisProgram } from "./useAegisProgram";
import { bpsToPercent } from "@/lib/utils";

export interface ChainMarketView {
  address: string;
  yesPriceBps: number;
  noPriceBps: number;
  yesPercent: string;
  noPercent: string;
  bParam: number;
  feeBps: number;
  resolutionSlot: number;
  status: string;
  totalFeesCollected: number;
}

export function useChainMarkets() {
  const program = useAegisProgram();
  const [markets, setMarkets] = useState<ChainMarketView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program) {
      setMarkets([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetchAllMarkets(program)
      .then((raw) => {
        const views: ChainMarketView[] = raw.map(({ publicKey, account }: any) => {
          const yq = account.yes_qty ?? 0;
          const nq = account.no_qty ?? 0;
          const yesBps = yq === 0 && nq === 0 ? 5000 : Math.round((yq / (yq + nq)) * 10000);
          const noBps = 10000 - yesBps;
          return {
            address: publicKey.toBase58(),
            yesPriceBps: yesBps,
            noPriceBps: noBps,
            yesPercent: bpsToPercent(yesBps),
            noPercent: bpsToPercent(noBps),
            bParam: account.b_param?.toNumber?.() ?? 0,
            feeBps: account.fee_bps ?? 0,
            resolutionSlot: account.resolution_slot?.toNumber?.() ?? 0,
            status: Object.keys(account.status ?? { active: {} })[0],
            totalFeesCollected: account.total_fees_collected?.toNumber?.() ?? 0,
          };
        });
        setMarkets(views);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [program]);

  return { markets, loading, error };
}
