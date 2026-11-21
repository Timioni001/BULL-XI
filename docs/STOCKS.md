# Stock universe

41 xStocks (tokenized US stocks and ETFs on Solana mainnet). Every one has a reliable live price, checked on Nov 21 2026.

## Where prices come from

- **Live price:** Jupiter Price API v3 (`lite-api.jup.ag/price/v3`), free, no key, all 41 in one request. We use `stockData.price`, the xStocks issuer reference price. It tracks the real stock, updates within minutes and exists 24/7 even for tokens that rarely trade. We do not use the DEX trade price for scoring: on thinly traded tokens it drifts from the real stock.
- **Charts:** Jupiter chart data from onchain trades. Thinly traded stocks can have a short or empty chart; the app says so instead of drawing a fake one.
- **Onchain:** the Cloudflare pusher writes the same reference prices to the `bullxi` price book on the MagicBlock Ephemeral Rollup every minute, which builds the TWAP used for scoring.

## Changes from Phase 1

- **DIAx dropped.** There is no Dow Jones xStock on Solana.
- Reference prices updated to real values. Credits, positions and sectors unchanged.

## Squad feasibility

Position counts: ETF 6, Blue Chip 13, Growth 12, High Risk 10 (squads need 2 / 5 / 5 / 3, max 3 per sector). Every position still has enough sectors to fill a squad under the max-3 rule, and Auto-pick passes its tests on this list.

Liquidity matters only for Pro mode (buying real xStocks). If Pro ever buys real tokens, restrict Pro squads to stocks with deep liquidity (the ones over $100k below). Free mode only needs the reference price.

The order below is the price book order onchain (`lib/onchain/universe.ts`). Only ever append.

| # | Ticker | Name | Position | Sector | Credits | DEX liquidity | Mainnet mint |
|---|---|---|---|---|---|---|---|
| 0 | SPYx | S&P 500 ETF | ETF (keeper) | Index | 5.5 | $2.3M | `XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W` |
| 1 | QQQx | Nasdaq 100 ETF | ETF (keeper) | Index | 6.0 | $1.3M | `Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ` |
| 2 | VTIx | Total US Market ETF | ETF (keeper) | Index | 5.0 | under $1k | `XsssYEQjzxBCFgvYFFNuhJFBeHNdLWYeUSP8F45cDr9` |
| 3 | IWMx | Russell 2000 ETF | ETF (keeper) | Index | 4.5 | under $1k | `XsbELVbLGBkn7xfMfyYuUipKGt1iRUc2B7pYRvFTFu3` |
| 4 | GLDx | Gold ETF | ETF (keeper) | Index | 4.5 | $442k | `Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re` |
| 5 | TLTx | Long Treasury ETF | ETF (keeper) | Index | 4.0 | under $1k | `XsqD2nwDfGHYNUisQiPWmhQo2xAPLJY51tC2wyxDV4v` |
| 6 | MSFTx | Microsoft | Blue Chip (defender) | Big Tech | 8.5 | $625k | `XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX` |
| 7 | AAPLx | Apple | Blue Chip (defender) | Big Tech | 8.0 | $643k | `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp` |
| 8 | AMZNx | Amazon | Blue Chip (defender) | Big Tech | 8.0 | $295k | `Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg` |
| 9 | GOOGLx | Alphabet | Blue Chip (defender) | Big Tech | 7.5 | $390k | `XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN` |
| 10 | METAx | Meta | Blue Chip (defender) | Big Tech | 7.5 | $384k | `Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu` |
| 11 | JPMx | JPMorgan Chase | Blue Chip (defender) | Finance | 6.5 | under $1k | `XsMAqkcKsUewDrzVkait4e5u4y8REgtyS7jWgCpLV2C` |
| 12 | Vx | Visa | Blue Chip (defender) | Finance | 6.0 | $2k | `XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p` |
| 13 | UNHx | UnitedHealth | Blue Chip (defender) | Health | 5.5 | $3k | `XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe` |
| 14 | WMTx | Walmart | Blue Chip (defender) | Consumer | 5.5 | $6k | `Xs151QeqTCiuKtinzfRATnUESM2xTU6V9Wy8Vy538ci` |
| 15 | JNJx | Johnson & Johnson | Blue Chip (defender) | Health | 5.0 | under $1k | `XsGVi5eo1Dh2zUpic4qACcjuWGjNv8GCt3dm5XcX6Dn` |
| 16 | XOMx | Exxon Mobil | Blue Chip (defender) | Energy | 5.0 | $9k | `XsaHND8sHyfMfsWPj6kSdd5VwvCayZvjYgKmmcNL5qh` |
| 17 | KOx | Coca-Cola | Blue Chip (defender) | Consumer | 4.5 | $96k | `XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ` |
| 18 | PGx | Procter & Gamble | Blue Chip (defender) | Consumer | 4.5 | $2k | `XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV` |
| 19 | NVDAx | Nvidia | Growth (midfielder) | Chips | 12.5 | $1.7M | `Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh` |
| 20 | AVGOx | Broadcom | Growth (midfielder) | Chips | 10.0 | $134k | `XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo` |
| 21 | PLTRx | Palantir | Growth (midfielder) | Software | 9.0 | $151k | `XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4` |
| 22 | LLYx | Eli Lilly | Growth (midfielder) | Health | 8.5 | $2k | `Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH` |
| 23 | TSMx | TSMC | Growth (midfielder) | Chips | 8.0 | $31k | `XsafvsGtzFqqHgTnA3aPC83EAMkacU5mcGtcSayhpVV` |
| 24 | AMDx | AMD | Growth (midfielder) | Chips | 7.5 | $1k | `XsXcJ6GZ9kVnjqGsjBnktRcuwMBmvKWh8S93RefZ1rF` |
| 25 | NFLXx | Netflix | Growth (midfielder) | Consumer | 7.5 | $2k | `XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL` |
| 26 | ORCLx | Oracle | Growth (midfielder) | Software | 7.0 | under $1k | `XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL` |
| 27 | CRWDx | CrowdStrike | Growth (midfielder) | Software | 6.5 | under $1k | `Xs7xXqkcK7K8urEqGg52SECi79dRp2cEKKuYjUePYDw` |
| 28 | SHOPx | Shopify | Growth (midfielder) | Consumer | 6.0 | under $1k | `XsRN7n3AZDs577pgQSGbrbgznY5T9xERcjr4dK6vHnX` |
| 29 | CRMx | Salesforce | Growth (midfielder) | Software | 5.5 | under $1k | `XsczbcQ3zfcgAEt9qHQES8pxKAVG5rujPSHQEXi4kaN` |
| 30 | UBERx | Uber | Growth (midfielder) | Mobility | 5.0 | $1k | `XsAsZLF4MmsvS1sDxRMrUz7REjHfwbC9UAMXSRBqgEB` |
| 31 | TSLAx | Tesla | High Risk (forward) | Mobility | 11.0 | $1.2M | `XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB` |
| 32 | MSTRx | Strategy | High Risk (forward) | Crypto | 8.5 | $449k | `XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ` |
| 33 | COINx | Coinbase | High Risk (forward) | Crypto | 8.0 | $198k | `Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu` |
| 34 | HOODx | Robinhood | High Risk (forward) | Finance | 7.0 | $65k | `XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg` |
| 35 | CRCLx | Circle | High Risk (forward) | Crypto | 6.0 | $1.1M | `XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1` |
| 36 | SMCIx | Super Micro | High Risk (forward) | Chips | 5.5 | under $1k | `XsMxAoJP47FQGLsVUvSS2QfBaHdNsd7DRU6nWRL8RSa` |
| 37 | MARAx | MARA Holdings | High Risk (forward) | Crypto | 5.0 | under $1k | `XsguBZPkM9BDmxspmWe29EmrYZBv21ENcC27Pqh7grB` |
| 38 | SOFIx | SoFi | High Risk (forward) | Finance | 5.0 | under $1k | `Xsipo31rLh5EqPMR2cArn6kVPAD83C6rxbmCrT9Wu5u` |
| 39 | RIVNx | Rivian | High Risk (forward) | Mobility | 4.5 | under $1k | `XsoxDMY8s3ZV7zD4Yd87wAvURyxA8VXkd7w6HNuQkzj` |
| 40 | GMEx | GameStop | High Risk (forward) | Consumer | 4.5 | $550k | `Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc` |
