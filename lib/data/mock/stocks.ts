import type { Position, Sector, Stock } from "../types";
import { hashString, mulberry32 } from "./rng";

type Seed = [ticker: string, name: string, sector: Sector, position: Position, credits: number, price: number, ownership: number, mint: string];

/**
 * The stock universe: 41 xStocks that have a reliable reference price on
 * Solana mainnet (Jupiter Price API, xStocks issuer price). `price` is a
 * snapshot from Nov 21 2026 used before the first live fetch lands. `mint` is
 * the mainnet token mint used to look up live prices.
 */
const SEEDS: Seed[] = [
  // ETF (goalkeepers)
  ["SPYx", "S&P 500 ETF", "Index", "ETF", 5.5, 697.43, 41.2, "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W"],
  ["QQQx", "Nasdaq 100 ETF", "Index", "ETF", 6.0, 617.73, 28.7, "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ"],
  ["VTIx", "Total US Market ETF", "Index", "ETF", 5.0, 343.15, 9.4, "XsssYEQjzxBCFgvYFFNuhJFBeHNdLWYeUSP8F45cDr9"],
  ["IWMx", "Russell 2000 ETF", "Index", "ETF", 4.5, 258.7, 12.8, "XsbELVbLGBkn7xfMfyYuUipKGt1iRUc2B7pYRvFTFu3"],
  ["GLDx", "Gold ETF", "Index", "ETF", 4.5, 324.38, 18.3, "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re"],
  ["TLTx", "Long Treasury ETF", "Index", "ETF", 4.0, 81.08, 4.2, "XsqD2nwDfGHYNUisQiPWmhQo2xAPLJY51tC2wyxDV4v"],
  // Blue Chip (defenders)
  ["MSFTx", "Microsoft", "Big Tech", "BLUE", 8.5, 489.53, 33.5, "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX"],
  ["AAPLx", "Apple", "Big Tech", "BLUE", 8.0, 344.9, 38.9, "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp"],
  ["AMZNx", "Amazon", "Big Tech", "BLUE", 8.0, 250.97, 24.6, "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"],
  ["GOOGLx", "Alphabet", "Big Tech", "BLUE", 7.5, 270.18, 21.3, "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN"],
  ["METAx", "Meta", "Big Tech", "BLUE", 7.5, 567.99, 19.8, "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu"],
  ["JPMx", "JPMorgan Chase", "Finance", "BLUE", 6.5, 312.88, 14.1, "XsMAqkcKsUewDrzVkait4e5u4y8REgtyS7jWgCpLV2C"],
  ["Vx", "Visa", "Finance", "BLUE", 6.0, 404.71, 10.7, "XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p"],
  ["UNHx", "UnitedHealth", "Health", "BLUE", 5.5, 335.25, 7.9, "XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe"],
  ["WMTx", "Walmart", "Consumer", "BLUE", 5.5, 127.98, 15.4, "Xs151QeqTCiuKtinzfRATnUESM2xTU6V9Wy8Vy538ci"],
  ["JNJx", "Johnson & Johnson", "Health", "BLUE", 5.0, 270.75, 8.8, "XsGVi5eo1Dh2zUpic4qACcjuWGjNv8GCt3dm5XcX6Dn"],
  ["XOMx", "Exxon Mobil", "Energy", "BLUE", 5.0, 160.47, 9.6, "XsaHND8sHyfMfsWPj6kSdd5VwvCayZvjYgKmmcNL5qh"],
  ["KOx", "Coca-Cola", "Consumer", "BLUE", 4.5, 96.92, 11.2, "XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ"],
  ["PGx", "Procter & Gamble", "Consumer", "BLUE", 4.5, 169.4, 6.5, "XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV"],
  // Growth (midfielders)
  ["NVDAx", "Nvidia", "Chips", "GROWTH", 12.5, 130.01, 52.4, "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh"],
  ["AVGOx", "Broadcom", "Chips", "GROWTH", 10.0, 311.55, 22.9, "XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo"],
  ["PLTRx", "Palantir", "Software", "GROWTH", 9.0, 145.72, 31.6, "XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4"],
  ["LLYx", "Eli Lilly", "Health", "GROWTH", 8.5, 1347, 13.2, "Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH"],
  ["TSMx", "TSMC", "Chips", "GROWTH", 8.0, 328.59, 17.5, "XsafvsGtzFqqHgTnA3aPC83EAMkacU5mcGtcSayhpVV"],
  ["AMDx", "AMD", "Chips", "GROWTH", 7.5, 439.45, 26.8, "XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF"],
  ["NFLXx", "Netflix", "Consumer", "GROWTH", 7.5, 56.99, 12.3, "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL"],
  ["ORCLx", "Oracle", "Software", "GROWTH", 7.0, 103.28, 14.9, "XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL"],
  ["CRWDx", "CrowdStrike", "Software", "GROWTH", 6.5, 218, 8.4, "Xs7xXqkcK7K8urEqGg52SECi79dRp2cEKKuYjUePYDw"],
  ["SHOPx", "Shopify", "Consumer", "GROWTH", 6.0, 126.52, 9.1, "XsRN7n3AZDs577pgQSGbrbgznY5T9xERcjr4dK6vHnX"],
  ["CRMx", "Salesforce", "Software", "GROWTH", 5.5, 182.49, 5.7, "XsczbcQ3zfcgAEt9qHQES8pxKAVG5rujPSHQEXi4kaN"],
  ["UBERx", "Uber", "Mobility", "GROWTH", 5.0, 64.25, 10.2, "XsAsZLF4MmsvS1sDxRMrUz7REjHfwbC9UAMXSRBqgEB"],
  // High Risk (forwards)
  ["TSLAx", "Tesla", "Mobility", "RISK", 11.0, 351.05, 47.8, "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"],
  ["MSTRx", "Strategy", "Crypto", "RISK", 8.5, 79.38, 21.4, "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ"],
  ["COINx", "Coinbase", "Crypto", "RISK", 8.0, 102.28, 24.1, "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu"],
  ["HOODx", "Robinhood", "Finance", "RISK", 7.0, 64.11, 29.3, "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg"],
  ["CRCLx", "Circle", "Crypto", "RISK", 6.0, 48.931, 15.6, "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1"],
  ["SMCIx", "Super Micro", "Chips", "RISK", 5.5, 22.179, 7.2, "XsMxAoJP47FQGLsVUvSS2QfBaHdNsd7DRU6nWRL8RSa"],
  ["MARAx", "MARA Holdings", "Crypto", "RISK", 5.0, 5.289, 8.9, "XsguBZPkM9BDmxspmWe29EmrYZBv21ENcC27Pqh7grB"],
  ["SOFIx", "SoFi", "Finance", "RISK", 5.0, 12.755, 13.7, "Xsipo31rLh5EqPMR2cArn6kVPAD83C6rxbmCrT9Wu5u"],
  ["RIVNx", "Rivian", "Mobility", "RISK", 4.5, 10.504, 6.3, "XsoxDMY8s3ZV7zD4Yd87wAvURyxA8VXkd7w6HNuQkzj"],
  ["GMEx", "GameStop", "Consumer", "RISK", 4.5, 26.714, 11.8, "Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc"],
];

const VOLATILITY: Record<Position, number> = { ETF: 0.3, BLUE: 0.55, GROWTH: 0.85, RISK: 1.3 };

export function volatilityOf(position: Position): number {
  return VOLATILITY[position];
}

function buildStocks(): Stock[] {
  return SEEDS.map(([ticker, name, sector, position, credits, price, ownership, mint]) => {
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
      mint,
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
