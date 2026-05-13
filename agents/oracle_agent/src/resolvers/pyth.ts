import { HermesClient } from "@pythnetwork/hermes-client";

const hermes = new HermesClient("https://hermes.pyth.network");

export async function resolvePythMarket(
  feedId: string,
  strike: number,
  above: boolean,
): Promise<boolean> {
  // Fetch latest price from Pyth's Hermes service
  const priceUpdates = await hermes.getLatestPriceUpdates([feedId]);
  const feed = priceUpdates.parsed?.[0];

  if (!feed) throw new Error(`No price data for feed ${feedId}`);

  // Convert to human-readable price
  const price = Number(feed.price.price) * Math.pow(10, feed.price.expo);
  const conf = Number(feed.price.conf) * Math.pow(10, feed.price.expo);

  console.log(`  Pyth price: $${price.toFixed(2)} ± $${conf.toFixed(2)}`);

  // Reject if confidence interval is too wide (possible manipulation)
  const confPct = (conf / price) * 100;
  if (confPct > 1) {
    throw new Error(
      `Price confidence too wide: ${confPct.toFixed(
        2,
      )}% — possible manipulation`,
    );
  }

  return above ? price >= strike : price < strike;
}
