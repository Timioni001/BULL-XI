/**
 * Runs the app's onchain live session (lib/data/onchain-live.ts) against a
 * gameweek on the Private ER and prints the table, like the live screen sees it.
 *   npx tsx scripts/onchain/live-check.ts [gameweekId]
 * Without an id it picks the latest test gameweek.
 */
import { createSolanaRpc, getBase58Decoder } from "@solana/kit";
import { config } from "../../lib/config";
import { BULLXI_PROGRAM_ADDRESS, GAMEWEEK_DISCRIMINATOR, getGameweekDecoder } from "../../lib/onchain/bullxi";
import { startOnchainLiveSession } from "../../lib/data/onchain-live";
import { createRealFeed } from "../../lib/data/live/feed";
import { MOCK_STOCKS } from "../../lib/data/mock/stocks";
import { listEntries } from "../../lib/onchain/game";

async function latestTestGameweek(): Promise<number> {
  const b58 = getBase58Decoder();
  const res = await createSolanaRpc(config.teeRpc)
    .getProgramAccounts(BULLXI_PROGRAM_ADDRESS, { encoding: "base64", filters: [{ memcmp: { offset: BigInt(0), bytes: b58.decode(GAMEWEEK_DISCRIMINATOR) as never, encoding: "base58" } }] })
    .send();
  const dec = getGameweekDecoder();
  // Old v1 gameweeks share the discriminator but are shorter: skip what doesn't decode.
  const ids = res
    .map((a) => {
      try {
        return dec.decode(Buffer.from(a.account.data[0], "base64")).id;
      } catch {
        return 0;
      }
    })
    .filter((id) => id >= 900_000_000);
  return Math.max(...ids);
}

async function main() {
  const id = Number(process.argv[2] ?? (await latestTestGameweek()));
  const feed = createRealFeed(MOCK_STOCKS);
  for (const e of await listEntries(config.teeRpc, id)) console.log(`onchain: ${e.data.authority.slice(0, 6)}… status ${e.data.status}, settled points ${e.data.points}`);
  const lineup = { starters: ["spyx", "msftx", "aaplx", "amznx", "nvdax", "avgox", "pltrx", "tslax", "coinx", "googlx", "metax"], bench: ["qqqx", "jpmx", "llyx", "mstrx"], captainId: "nvdax", viceId: "msftx" };
  const now = Date.now();
  const gameweek = { id: String(id), number: 1, kind: "daily" as const, deadline: new Date(now).toISOString(), start: new Date(now).toISOString(), end: new Date(now + 3_600_000).toISOString(), status: "live" as const };
  let n = 0;
  const stop = startOnchainLiveSession(
    { gameweek, lineup, kickoffAt: now, onchain: { gameweek: id, address: "11111111111111111111111111111111" } },
    feed.subscribe,
    (s) => {
      if (++n % 2) return;
      console.log(`gameweek ${id} | ${s.leagueName} | you: ${s.totalPoints} pts, rank ${s.yourRank}/${s.standings.length}`);
      for (const r of s.standings) console.log(`  ${r.rank}. ${r.team.padEnd(14)} ${r.name.padEnd(14)} gw ${String(r.gwPoints).padStart(4)}  season ${r.total}`);
    },
    (e) => console.error("error:", e.message),
  );
  setTimeout(() => {
    stop();
    process.exit(0);
  }, 12_000);
}
void main();
