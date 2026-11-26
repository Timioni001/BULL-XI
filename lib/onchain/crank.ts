/**
 * The game crank, run every minute by the Cloudflare Worker (or locally):
 *   1. push live prices to the price book (Private ER)
 *   2. make sure the next daily gameweek exists on Solana and is delegated
 *   3. move live gameweeks through their TWAP snapshots
 *   4. after kickoff, ask MagicBlock VRF to draw the golden stock
 *   5. reveal sealed entries after kickoff, settle and commit them at full time
 *   6. pay friends league pots to the winner
 * Covers daily gameweeks (20:00 UTC) and hourly flash gameweeks.
 * Runtime-agnostic; one key does it all (it is the config crank and the pusher).
 */
import { createSolanaRpc, signBytes, type KeyPairSigner } from "@solana/kit";
import { findGameweekPda } from "./bullxi";
import { ENTRY_STATUS, GW_STATUS, accountHome, createGameweekIxs, gameweekId, goldenDue, listEntries, readGameweek, requestGoldenIx, revealIx, scheduleTicksIx, settleIx, snapshotDue, snapshotIx } from "./game";
import { decodePriceBook, priceBookAddress } from "./price-book";
import { listLeagues, settleLeagueIx } from "./pro";
import { pushOnce } from "./pusher";
import { sendAndConfirm } from "./send";
import { teeLogin, teeRpcUrl } from "./tee-auth";

export interface CrankEnv {
  signer: KeyPairSigner;
  solanaRpc: string;
  teeRpc: string;
  priceUrl: string;
  /** Unix ms, for tests */
  now?: number;
}

export interface CrankReport {
  push?: string;
  created?: number;
  steps: string[];
  errors: string[];
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Daily deadlines are 20:00 UTC, same as the app. */
export function dailyDeadline(nowMs: number, offsetDays = 0): number {
  const d = new Date(nowMs);
  d.setUTCHours(20, 0, 0, 0);
  if (d.getTime() <= nowMs) d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime() + offsetDays * DAY;
}

const MAX_SETTLES_PER_RUN = 6;
const MAX_REVEALS_PER_TX = 4;

export async function runCrank(env: CrankEnv, opts: { commit?: boolean } = {}): Promise<CrankReport> {
  const now = env.now ?? Date.now();
  const report: CrankReport = { steps: [], errors: [] };
  const { signer } = env;
  const step = async (name: string, fn: () => Promise<string | void>) => {
    try {
      const r = await fn();
      if (r) report.steps.push(`${name}: ${r}`);
    } catch (e) {
      report.errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // One TEE login per run.
  const token = (await teeLogin(env.teeRpc, signer.address, (m) => signBytes(signer.keyPair.privateKey, m))).token;
  const tee = teeRpcUrl(env.teeRpc, token);

  await step("push", async () => {
    const r = await pushOnce({ signer, erRpc: env.teeRpc, priceUrl: env.priceUrl, commit: opts.commit });
    report.push = r.signature;
    return `${r.priced} prices${r.committed ? ", committed" : ""}`;
  });

  // Next daily gameweek, created ahead so players can seal anytime. Usually
  // already there (scripts/onchain/schedule.ts creates days in advance).
  await step("schedule", async () => {
    const deadline = dailyDeadline(now);
    const id = gameweekId("daily", deadline);
    if (await readGameweek(env.teeRpc, id)) return;
    const [pda] = await findGameweekPda({ id });
    if ((await accountHome(env.solanaRpc, pda)) !== "missing") return;
    await sendAndConfirm(env.solanaRpc, signer, await createGameweekIxs(signer, id, 0, deadline, deadline + DAY));
    report.created = id;
    return `created gameweek ${id}`;
  });

  // Arm MagicBlock's own crank on the rollup for the next gameweeks, so their
  // snapshots happen even without this Worker: the next flash gameweek at
  // minute 35 of each hour, the next daily one at 19:35 UTC.
  await step("arm", async () => {
    const t = new Date(now);
    if (t.getUTCMinutes() !== 35) return;
    const armed: string[] = [];
    const nextHour = Math.floor(now / HOUR) * HOUR + HOUR;
    const targets: [number, number][] = [[gameweekId("flash", nextHour), 100]];
    if (t.getUTCHours() === 19) targets.push([gameweekId("daily", dailyDeadline(now)), 1500]);
    for (const [id, iterations] of targets) {
      if (!(await readGameweek(env.teeRpc, id))) continue;
      await sendAndConfirm(tee, signer, [await scheduleTicksIx(signer, id, { intervalMs: 60_000, iterations })]);
      armed.push(String(id));
    }
    return armed.length ? `MagicBlock crank armed for ${armed.join(", ")}` : undefined;
  });

  // Gameweeks that can still need work: the daily that kicked off last and the
  // one before, and the last three hourly flash gameweeks.
  const bookInfo = await createSolanaRpc(env.teeRpc).getAccountInfo(await priceBookAddress(), { encoding: "base64" }).send();
  const bookLast = bookInfo.value ? decodePriceBook(Uint8Array.from(atob(bookInfo.value.data[0]), (c) => c.charCodeAt(0))).lastTs : 0;
  const lastKickoff = dailyDeadline(now) - DAY;
  const hour = Math.floor(now / HOUR) * HOUR;
  const ids = [
    ...[lastKickoff, lastKickoff - DAY].map((d) => gameweekId("daily", d)),
    ...[hour, hour - HOUR, hour - 2 * HOUR].map((d) => gameweekId("flash", d)),
  ];
  for (const id of ids) await step(`gw ${id}`, () => advance(id));
  return report;

  async function advance(id: number): Promise<string | void> {
    const g = await readGameweek(env.teeRpc, id);
    if (!g) return;
    const out: string[] = [];
    if (snapshotDue(g, Math.floor(now / 1000), bookLast)) {
      await sendAndConfirm(tee, signer, [await snapshotIx(id)]);
      out.push(`snapshot -> ${g.status + 1}`);
      g.status += 1;
    }
    if (g.status < GW_STATUS.kickedOff) return out.join(", ");
    if (goldenDue(g, Math.floor(now / 1000))) {
      await sendAndConfirm(tee, signer, [await requestGoldenIx(signer, id)]);
      out.push("golden stock requested (VRF)");
    }
    const entries = await listEntries(tee, id);
    const sealed = entries.filter((e) => e.data.status === ENTRY_STATUS.sealed);
    for (let i = 0; i < sealed.length; i += MAX_REVEALS_PER_TX) {
      const batch = sealed.slice(i, i + MAX_REVEALS_PER_TX);
      await sendAndConfirm(tee, signer, await Promise.all(batch.map((e) => revealIx(e.address, id))));
      out.push(`revealed ${batch.length}`);
    }
    if (g.status === GW_STATUS.final) {
      const ready = entries.filter((e) => e.data.status === ENTRY_STATUS.revealed || sealed.some((s) => s.address === e.address));
      for (const e of ready.slice(0, MAX_SETTLES_PER_RUN)) {
        await sendAndConfirm(tee, signer, [await settleIx(signer, e.address, id, e.data.authority)]);
        out.push("settled 1");
      }
      // Friends leagues pay out once every member's entry is scored.
      if (ready.length === 0) {
        for (const l of (await listLeagues(tee, id)).filter((x) => x.status === 0)) {
          try {
            await sendAndConfirm(tee, signer, [await settleLeagueIx(l)]);
            out.push(`league ${l.id} paid`);
          } catch {
            /* entries still being scored: next minute */
          }
        }
      }
    }
    return out.join(", ");
  }
}
