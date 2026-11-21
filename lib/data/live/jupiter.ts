import type { ChartRange, PricePoint } from "../types";
import { PRICE_SOURCE } from "@/lib/config";

/**
 * Real xStock prices from Solana mainnet via the free Jupiter APIs (no key).
 *
 * Live price = `stockData.price`, the xStocks issuer reference price. It
 * tracks the real stock, is fresh within minutes and exists 24/7, even for
 * tokens that rarely trade. The DEX price (`usdPrice`) is only a fallback.
 */

export interface Quote {
  price: number;
  /** 24h % move of the onchain price, e.g. 1.84 */
  change24h: number;
  /** When the reference price was last updated (ms) */
  updatedAt: number;
}

interface JupPrice {
  usdPrice?: number;
  priceChange24h?: number;
  stockData?: { price?: number; updatedAt?: string };
}

const CHART_URL = "https://datapi.jup.ag/v2/charts";

export async function fetchQuotes(mints: string[], signal?: AbortSignal): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  // The API takes up to 50 ids per call.
  for (let i = 0; i < mints.length; i += 50) {
    const ids = mints.slice(i, i + 50).join(",");
    const res = await fetch(`${PRICE_SOURCE.url}?ids=${ids}`, { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Price API ${res.status}`);
    const body = (await res.json()) as Record<string, JupPrice | null>;
    for (const [mint, p] of Object.entries(body)) {
      const price = p?.stockData?.price ?? p?.usdPrice;
      if (!p || !price || !Number.isFinite(price)) continue;
      const change = p.priceChange24h ?? 0;
      out[mint] = {
        price,
        change24h: Math.round(Math.max(-30, Math.min(30, change)) * 100) / 100,
        updatedAt: p.stockData?.updatedAt ? Date.parse(p.stockData.updatedAt) : Date.now(),
      };
    }
  }
  return out;
}

const RANGES: Record<ChartRange, { interval: string; candles: number; span: number }> = {
  "1D": { interval: "15_MINUTE", candles: 96, span: 86_400_000 },
  "1W": { interval: "1_HOUR", candles: 168, span: 7 * 86_400_000 },
};

/** Price history from onchain trades. Thinly traded stocks can come back short or empty. */
export async function fetchCandles(mint: string, range: ChartRange, nowMs = Date.now()): Promise<PricePoint[]> {
  const r = RANGES[range];
  const url = `${CHART_URL}/${mint}?interval=${r.interval}&to=${nowMs}&candles=${r.candles}&type=price&quote=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Chart API ${res.status}`);
  const body = (await res.json()) as { candles?: { time: number; close: number }[] };
  const from = nowMs - r.span;
  return (body.candles ?? []).map((c) => ({ t: c.time * 1000, price: c.close })).filter((p) => p.t >= from && Number.isFinite(p.price));
}
