/**
 * Local fallback for the Cloudflare price pusher.
 *   npm run onchain:push            push once
 *   npm run onchain:push -- --loop  push every minute, commit daily at 00:00 UTC
 *   npm run onchain:push -- --commit  push once and commit to Solana
 */
import { config, explorer, PRICE_SOURCE } from "../../lib/config";
import { pushOnce } from "../../lib/onchain/pusher";
import { loadSigner } from "./common";

async function tick(signer: Awaited<ReturnType<typeof loadSigner>>) {
  const now = new Date();
  const commit = (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) || process.argv.includes("--commit");
  try {
    const r = await pushOnce({ signer, erRpc: config.erRpc, priceUrl: PRICE_SOURCE.url, commit });
    console.log(new Date().toISOString(), `priced ${r.priced}`, r.missing.length ? `missing ${r.missing.join(",")}` : "", r.committed ? "committed" : "", explorer("tx", r.signature, { er: true }));
  } catch (e) {
    console.error(new Date().toISOString(), "push failed:", e instanceof Error ? e.message : e);
  }
}

async function main() {
  const signer = await loadSigner("pusher");
  await tick(signer);
  if (!process.argv.includes("--loop")) return;
  setInterval(() => void tick(signer), 60_000);
}

void main();
