/**
 * Reads the price book from the Ephemeral Rollup (live copy) and from Solana
 * (last committed copy).
 *   npm run onchain:read
 */
import { createSolanaRpc } from "@solana/kit";
import { config, explorer } from "../../lib/config";
import { decodePriceBook, priceBookAddress } from "../../lib/onchain/price-book";
import { PRICE_BOOK_STOCKS } from "../../lib/onchain/universe";

async function main() {
  const address = await priceBookAddress();
  for (const [label, url] of [
    ["Ephemeral Rollup", config.erRpc],
    ["Solana devnet", config.solanaRpc],
  ] as const) {
    const info = await createSolanaRpc(url).getAccountInfo(address, { encoding: "base64" }).send();
    if (!info.value) {
      console.log(`${label}: not found`);
      continue;
    }
    const b = decodePriceBook(Uint8Array.from(Buffer.from(info.value.data[0], "base64")));
    const last = b.lastTs ? new Date(b.lastTs * 1000).toISOString() : "never";
    console.log(`${label}: owner ${info.value.owner}, ${b.updates} pushes, last ${last}`);
    console.log("  " + PRICE_BOOK_STOCKS.slice(0, 5).map(([t], i) => `${t} $${b.prices[i]}`).join("  "));
    if (b.lastTs > b.startTs) {
      const i = PRICE_BOOK_STOCKS.findIndex(([t]) => t === "NVDAx");
      console.log(`  NVDAx TWAP since start: $${(Number(b.cum[i]) / (b.lastTs - b.startTs) / 1e6).toFixed(3)}`);
    }
  }
  console.log(explorer("address", address));
}

void main();
