/**
 * Local fallback for the game Worker's cron: prices, schedule, snapshots,
 * reveals and settlement.
 *   npm run onchain:crank            run once
 *   npm run onchain:crank -- --loop  every minute
 */
import { config, PRICE_SOURCE } from "../../lib/config";
import { runCrank } from "../../lib/onchain/crank";
import { loadSigner } from "./common";

async function tick(signer: Awaited<ReturnType<typeof loadSigner>>) {
  const r = await runCrank({ signer, solanaRpc: config.solanaRpc, teeRpc: config.teeRpc, priceUrl: PRICE_SOURCE.url }).catch((e) => ({ steps: [], errors: [String(e)] }));
  console.log(new Date().toISOString(), JSON.stringify(r));
}

async function main() {
  const signer = await loadSigner("pusher");
  await tick(signer);
  if (process.argv.includes("--loop")) setInterval(() => void tick(signer), 60_000);
}
void main();
