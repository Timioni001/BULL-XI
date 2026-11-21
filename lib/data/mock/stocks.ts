import type { Position, Sector, Stock } from "../types";
import { hashString, mulberry32 } from "./rng";

type Seed = [ticker: string, name: string, sector: Sector, position: Position, credits: number, price: number, ownership: number];

/** ~42 tokenized stocks. Credits are game prices; price is a reference USD price. */
const SEEDS: Seed[] = [
  // ETF (goalkeepers)
  ["SPYx", "S&P 500 ETF", "Index", "ETF", 5.5, 672.4, 41.2],
  ["QQQx", "Nasdaq 100 ETF", "Index", "ETF", 6.0, 601.8, 28.7],
  ["VTIx", "Total US Market ETF", "Index", "ETF", 5.0, 331.5, 9.4],
  ["DIAx", "Dow Jones ETF", "Index", "ETF", 5.0, 468.2, 6.1],
  ["IWMx", "Russell 2000 ETF", "Index", "ETF", 4.5, 241.9, 12.8],
  ["GLDx", "Gold ETF", "Index", "ETF", 4.5, 382.6, 18.3],
  ["TLTx", "Long Treasury ETF", "Index", "ETF", 4.0, 91.3, 4.2],
  // Blue Chip (defenders)
  ["MSFTx", "Microsoft", "Big Tech", "BLUE", 8.5, 512.7, 33.5],
  ["AAPLx", "Apple", "Big Tech", "BLUE", 8.0, 268.1, 38.9],
  ["AMZNx", "Amazon", "Big Tech", "BLUE", 8.0, 231.4, 24.6],
  ["GOOGLx", "Alphabet", "Big Tech", "BLUE", 7.5, 284.9, 21.3],
  ["METAx", "Meta", "Big Tech", "BLUE", 7.5, 702.3, 19.8],
  ["JPMx", "JPMorgan Chase", "Finance", "BLUE", 6.5, 309.6, 14.1],
  ["Vx", "Visa", "Finance", "BLUE", 6.0, 345.2, 10.7],
  ["UNHx", "UnitedHealth", "Health", "BLUE", 5.5, 338.4, 7.9],
  ["WMTx", "Walmart", "Consumer", "BLUE", 5.5, 103.8, 15.4],
  ["JNJx", "Johnson & Johnson", "Health", "BLUE", 5.0, 191.2, 8.8],
  ["XOMx", "Exxon Mobil", "Energy", "BLUE", 5.0, 116.7, 9.6],
  ["KOx", "Coca-Cola", "Consumer", "BLUE", 4.5, 69.4, 11.2],
  ["PGx", "Procter & Gamble", "Consumer", "BLUE", 4.5, 152.3, 6.5],
  // Growth (midfielders)
  ["NVDAx", "Nvidia", "Chips", "GROWTH", 12.5, 188.6, 52.4],
  ["AVGOx", "Broadcom", "Chips", "GROWTH", 10.0, 352.1, 22.9],
  ["PLTRx", "Palantir", "Software", "GROWTH", 9.0, 178.3, 31.6],
  ["LLYx", "Eli Lilly", "Health", "GROWTH", 8.5, 868.9, 13.2],
  ["TSMx", "TSMC", "Chips", "GROWTH", 8.0, 296.4, 17.5],
  ["AMDx", "AMD", "Chips", "GROWTH", 7.5, 241.7, 26.8],
  ["NFLXx", "Netflix", "Consumer", "GROWTH", 7.5, 1121.5, 12.3],
  ["ORCLx", "Oracle", "Software", "GROWTH", 7.0, 248.2, 14.9],
  ["CRWDx", "CrowdStrike", "Software", "GROWTH", 6.5, 521.6, 8.4],
  ["SHOPx", "Shopify", "Consumer", "GROWTH", 6.0, 158.9, 9.1],
  ["CRMx", "Salesforce", "Software", "GROWTH", 5.5, 247.3, 5.7],
  ["UBERx", "Uber", "Mobility", "GROWTH", 5.0, 94.6, 10.2],
  // High Risk (forwards)
  ["TSLAx", "Tesla", "Mobility", "RISK", 11.0, 438.2, 47.8],
  ["MSTRx", "Strategy", "Crypto", "RISK", 8.5, 284.7, 21.4],
  ["COINx", "Coinbase", "Crypto", "RISK", 8.0, 331.9, 24.1],
  ["HOODx", "Robinhood", "Finance", "RISK", 7.0, 128.5, 29.3],
  ["CRCLx", "Circle", "Crypto", "RISK", 6.0, 124.8, 15.6],
  ["SMCIx", "Super Micro", "Chips", "RISK", 5.5, 47.3, 7.2],
  ["MARAx", "MARA Holdings", "Crypto", "RISK", 5.0, 18.9, 8.9],
  ["SOFIx", "SoFi", "Finance", "RISK", 5.0, 27.4, 13.7],
  ["RIVNx", "Rivian", "Mobility", "RISK", 4.5, 14.2, 6.3],
  ["GMEx", "GameStop", "Consumer", "RISK", 4.5, 23.6, 11.8],
];

const VOLATILITY: Record<Position, number> = { ETF: 0.3, BLUE: 0.55, GROWTH: 0.85, RISK: 1.3 };

export function volatilityOf(position: Position): number {
  return VOLATILITY[position];
}

function buildStocks(): Stock[] {
  return SEEDS.map(([ticker, name, sector, position, credits, price, ownership]) => {
    const rng = mulberry32(hashString(ticker));
    const vol = VOLATILITY[position];
    const recentPoints = Array.from({ length: 5 }, () => {
      const raw = Math.round((rng() - 0.42) * 40 * vol + credits * 0.6);
      return Math.max(-50, Math.min(50, raw));
    });
    const form = Math.round((recentPoints.slice(-3).reduce((a, b) => a + b, 0) / 3) * 10) / 10;
    const change24h = Math.round((rng() - 0.45) * 6 * vol * 100) / 100;
    return {
      id: ticker.toLowerCase(),
      ticker,
      name,
      sector,
      position,
      credits,
      price,
      change24h,
      ownership,
      form,
      recentPoints,
    };
  });
}

export const MOCK_STOCKS: Stock[] = buildStocks();
export const MOCK_STOCKS_BY_ID: Record<string, Stock> = Object.fromEntries(MOCK_STOCKS.map((s) => [s.id, s]));
export const BENCHMARK_ID = "spyx";
