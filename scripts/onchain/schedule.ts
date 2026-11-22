/**
 * Creates the next N daily gameweeks (deadline 20:00 UTC, 24h long) on Solana
 * and delegates them to the Private ER. The Worker can't write to Solana's
 * public devnet RPC (it blocks Cloudflare), so gameweeks are created ahead.
 *   npx tsx scripts/onchain/schedule.ts 8
 */
import { config, explorer } from "../../lib/config";
import { findGameweekPda } from "../../lib/onchain/bullxi";
import { dailyDeadline } from "../../lib/onchain/crank";
import { accountHome, createGameweekIxs, gameweekId } from "../../lib/onchain/game";
import { sendAndConfirm } from "../../lib/onchain/send";
import { loadSigner } from "./common";

const DAY = 86_400_000;

async function main() {
  const days = Number(process.argv[2] ?? 8);
  const crank = await loadSigner("pusher");
  for (let i = 0; i < days; i++) {
    const deadline = dailyDeadline(Date.now(), i);
    const id = gameweekId("daily", deadline);
    const [pda] = await findGameweekPda({ id });
    if ((await accountHome(config.solanaRpc, pda)) !== "missing") {
      console.log(id, new Date(deadline).toISOString(), "exists");
      continue;
    }
    const sig = await sendAndConfirm(config.solanaRpc, crank, await createGameweekIxs(crank, id, 0, deadline, deadline + DAY));
    console.log(id, new Date(deadline).toISOString(), "created", explorer("tx", sig));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
