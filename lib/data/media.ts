/**
 * Company logos and photos. Tiny and dependency-free so any component can use
 * it without pulling in the rest of the data layer. Phase 2 can point these at
 * a CDN without changing callers.
 */
import { DARK_LOGOS, FULL_BLEED_LOGOS, PHOTOS } from "./mock/media";

export interface Logo {
  src: string;
  /** Tile colour that keeps the logo visible */
  tone: "light" | "dark";
  /** Logo already has its own square background */
  fill: boolean;
}

const LOGO_TICKERS = new Set([
  "SPY", "QQQ", "VTI", "DIA", "IWM", "GLD", "TLT", "MSFT", "AAPL", "AMZN", "GOOGL", "META", "JPM", "V", "UNH", "WMT", "JNJ", "XOM", "KO", "PG",
  "NVDA", "AVGO", "PLTR", "LLY", "TSM", "AMD", "NFLX", "ORCL", "CRWD", "SHOP", "CRM", "UBER", "TSLA", "MSTR", "COIN", "HOOD", "CRCL", "SMCI", "MARA", "SOFI", "RIVN", "GME",
]);

/** Logo for an xStock ticker such as "NVDAx". */
export function logoFor(ticker: string): Logo | null {
  const base = ticker.replace(/x$/, "");
  if (!LOGO_TICKERS.has(base)) return null;
  return { src: `/logos/${base}.webp`, tone: DARK_LOGOS.has(base) ? "dark" : "light", fill: FULL_BLEED_LOGOS.has(base) };
}

/** Editorial photo for a stock id such as "nvdax", if we have one. */
export function photoFor(id: string): string | null {
  return PHOTOS[id] ?? null;
}
