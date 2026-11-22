/**
 * Shows a gameweek and one manager's entry on the TEE (as the crank).
 *   npx tsx scripts/onchain/inspect.ts <gameweekId> <playerAddress>
 */
import { address, signBytes } from "@solana/kit";
import { config } from "../../lib/config";
import { readEntry, readGameweek } from "../../lib/onchain/game";
import { teeLogin, teeRpcUrl } from "../../lib/onchain/tee-auth";
import { loadSigner } from "./common";

async function main() {
  const [id, player] = process.argv.slice(2);
  const crank = await loadSigner("pusher");
  const tee = teeRpcUrl(config.teeRpc, (await teeLogin(config.teeRpc, crank.address, (m) => signBytes(crank.keyPair.privateKey, m))).token);
  const g = await readGameweek(config.teeRpc, Number(id));
  console.log("gameweek", id, g ? { status: g.status, deadline: new Date(Number(g.deadlineTs) * 1000).toISOString(), end: new Date(Number(g.endTs) * 1000).toISOString(), window: Number(g.window), tmpTs: Number(g.tmpTs) } : null);
  if (player) {
    const e = await readEntry(tee, Number(id), address(player));
    console.log("entry", e ? { status: e.status, points: e.points, captain: e.captain } : null);
  }
}
void main();
