/**
 * Creates upcoming gameweeks on Solana and delegates them to the Private ER.
 * The Worker can't write to Solana's public devnet RPC (it blocks Cloudflare),
 * so gameweeks are created ahead from here.
 *   npm run onchain:schedule -- --daily 8 --flash 72
 * Daily: deadline 20:00 UTC, 24 h. Flash: every hour on the hour, 1 h.
 */
import { config, explorer } from "../../lib/config";
import { findGameweekPda } from "../../lib/onchain/bullxi";
import { dailyDeadline } from "../../lib/onchain/crank";
import { TEE_VALIDATOR, accountHome, createGameweekIxs, gameweekId } from "../../lib/onchain/game";
import { getDelegateGameweekInstructionAsync } from "../../lib/onchain/bullxi";
import { withRemaining } from "../../lib/onchain/send";
import { sendAndConfirm } from "../../lib/onchain/send";
import { loadSigner } from "./common";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const arg = (name: string, dflt: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function create(admin: Awaited<ReturnType<typeof loadSigner>>, kind: "daily" | "flash", deadline: number, length: number) {
  const id = gameweekId(kind, deadline);
  const [pda] = await findGameweekPda({ id });
  for (let attempt = 1; ; attempt++) {
    const home = await accountHome(config.solanaRpc, pda);
    if (home === "delegated") return console.log(kind, id, new Date(deadline).toISOString(), "exists");
    try {
      // Created but not handed over (an earlier attempt timed out midway): delegate only.
      const ixs =
        home === "solana"
          ? [withRemaining(await getDelegateGameweekInstructionAsync({ payer: admin, id, pda }), TEE_VALIDATOR)]
          : await createGameweekIxs(admin, id, kind === "daily" ? 0 : 1, deadline, deadline + length);
      const sig = await sendAndConfirm(config.solanaRpc, admin, ixs);
      return console.log(kind, id, new Date(deadline).toISOString(), "created", explorer("tx", sig));
    } catch (e) {
      if (attempt >= 4) throw e;
      await sleep(4000 * attempt); // public RPC rate limits
    }
  }
}

async function main() {
  const admin = await loadSigner("deployer");
  const now = Date.now();
  for (let i = 0; i < arg("daily", 8); i++) await create(admin, "daily", dailyDeadline(now, i), DAY);
  const firstHour = Math.floor(now / HOUR) * HOUR + HOUR;
  for (let i = 0; i < arg("flash", 72); i++) {
    await create(admin, "flash", firstHour + i * HOUR, HOUR);
    await sleep(800);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
