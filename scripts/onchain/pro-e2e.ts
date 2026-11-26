/**
 * End-to-end check of Pro preview and friends leagues on devnet + MagicBlock TEE.
 * Two brand-new players:
 *   open portfolios -> claim $1,000 test dollars (private) -> A invests $300 in
 *   their squad -> A creates a $10 league, B joins (pot $20) -> both seal squads
 *   -> 4-minute test gameweek runs (MagicBlock crank) -> reveal, settle
 *   -> settle_league pays the pot to the winner's portfolio.
 *
 *   npx tsx scripts/onchain/pro-e2e.ts
 */
import { createSolanaRpc, generateKeyPairSigner, signBytes, type KeyPairSigner } from "@solana/kit";
import { config, explorer, PRICE_SOURCE } from "../../lib/config";
import { MOCK_STOCKS, MOCK_STOCKS_BY_ID } from "../../lib/data/mock/stocks";
import { mulberry32 } from "../../lib/data/mock/rng";
import { autoPick } from "../../lib/game/autopick";
import { defaultLineup, emptySquad, squadIds } from "../../lib/game/rules";
import { findEntryPda } from "../../lib/onchain/bullxi";
import { ENTRY_STATUS, GW_STATUS, createGameweekIxs, entryIxs, goldenDue, joinIxs, readEntry, readGameweek, requestGoldenIx, revealIx, scheduleTicksIx, sealIx, settleIx, snapshotDue, snapshotIx, stockId } from "../../lib/onchain/game";
import { decodePriceBook, priceBookAddress } from "../../lib/onchain/price-book";
import { MICRO, buySquadIx, claimIx, createLeagueIxs, joinLeagueIx, leagueCode, newLeagueId, portfolioIxs, readLeague, readPortfolio, settleLeagueIx } from "../../lib/onchain/pro";
import { pushOnce } from "../../lib/onchain/pusher";
import { sendAndConfirm } from "../../lib/onchain/send";
import { teeLogin, teeRpcUrl } from "../../lib/onchain/tee-auth";
import { loadSigner } from "./common";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tee = (s: KeyPairSigner) => teeLogin(config.teeRpc, s.address, (m) => signBytes(s.keyPair.privateKey, m)).then((t) => teeRpcUrl(config.teeRpc, t.token));
const usd = (v: bigint) => `$${(Number(v) / MICRO).toFixed(2)}`;

async function bookLastTs() {
  const info = await createSolanaRpc(config.teeRpc).getAccountInfo(await priceBookAddress(), { encoding: "base64" }).send();
  return decodePriceBook(Uint8Array.from(Buffer.from(info.value!.data[0], "base64"))).lastTs;
}

async function waitFor<T>(what: string, fn: () => Promise<T | null | undefined | false>, ms = 90_000): Promise<T> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await sleep(2000);
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function retry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(5000);
    }
  }
}

async function main() {
  const admin = await loadSigner("deployer");
  const crank = await loadSigner("pusher");
  const crankTee = await tee(crank);
  const A = await generateKeyPairSigner();
  const B = await generateKeyPairSigner();
  log("player A", A.address);
  log("player B", B.address);

  // Test gameweek: deadline in 150s, 4 minutes long.
  const now = Date.now();
  const id = 900_000_000 + (Math.floor(now / 1000) % 10_000_000);
  const deadline = now + 150_000;
  let sig = await sendAndConfirm(config.solanaRpc, admin, await createGameweekIxs(admin, id, 0, deadline, deadline + 240_000));
  log("gameweek", id, "created + delegated", explorer("tx", sig));

  // Portfolios (sponsor pays), managers and entries.
  for (const [p, name] of [[A, "Alice"], [B, "Bola"]] as const) {
    sig = await retry(async () => sendAndConfirm(config.solanaRpc, crank, await portfolioIxs(p, crank)));
    log(name, "portfolio created + delegated", explorer("tx", sig));
    sig = await retry(async () => sendAndConfirm(config.solanaRpc, crank, [...(await joinIxs(p, crank, name, `${name} XI`)), ...(await entryIxs(p, crank, id))]));
    log(name, "manager + entry created + delegated", explorer("tx", sig));
  }

  await waitFor("gameweek on TEE", () => readGameweek(config.teeRpc, id));
  sig = await sendAndConfirm(crankTee, crank, [await scheduleTicksIx(crank, id, { intervalMs: 10_000, iterations: 60 })]);
  log("MagicBlock crank scheduled", explorer("tx", sig, { tee: true }));

  const aTee = await tee(A);
  const bTee = await tee(B);
  await waitFor("portfolio A on TEE", () => readPortfolio(aTee, A.address));
  await waitFor("portfolio B on TEE", () => readPortfolio(bTee, B.address));
  sig = await retry(async () => sendAndConfirm(aTee, A, [await claimIx(A)]));
  log("A claimed test dollars (portfolio now private)", explorer("tx", sig, { tee: true }));
  sig = await retry(async () => sendAndConfirm(bTee, B, [await claimIx(B)]));
  log("B claimed test dollars", explorer("tx", sig, { tee: true }));

  // A invests $300 in an auto-picked squad.
  const slotsA = autoPick(MOCK_STOCKS, emptySquad(), mulberry32(7));
  const slotsB = autoPick(MOCK_STOCKS, emptySquad(), mulberry32(11));
  sig = await sendAndConfirm(aTee, A, [await buySquadIx(A, squadIds(slotsA), 300)]);
  log("A invested $300 in their 15 stocks", explorer("tx", sig, { tee: true }));
  const pa = (await readPortfolio(aTee, A.address))!;
  log("A portfolio: cash", usd(pa.cash), "| invested", usd(pa.invested), "| holdings", pa.shares.flatMap((s, i) => (s > BigInt(0) ? [`${stockId(i)} ${(Number(s) / MICRO).toFixed(4)}`] : [])).slice(0, 4).join(", "), "...");
  const stranger = await generateKeyPairSigner();
  const peek = await readPortfolio(await tee(stranger), A.address).catch(() => null);
  log("privacy: stranger sees A's portfolio?", !!peek);

  // A creates a $10 friends league for this gameweek, both join.
  const leagueId = newLeagueId();
  sig = await retry(async () => sendAndConfirm(config.solanaRpc, crank, await createLeagueIxs(A, crank, leagueId, "Desk Bulls", id, 10)));
  log("league", leagueCode(leagueId), "created + delegated ($10 entry)", explorer("tx", sig));
  const league0 = await waitFor("league on TEE", () => readLeague(config.teeRpc, leagueId));
  sig = await retry(async () => sendAndConfirm(aTee, A, [await joinLeagueIx(A, league0)]));
  log("A joined, paid $10 from portfolio", explorer("tx", sig, { tee: true }));
  sig = await retry(async () => sendAndConfirm(bTee, B, [await joinLeagueIx(B, league0)]));
  log("B joined, paid $10 from portfolio", explorer("tx", sig, { tee: true }));
  log("pot:", usd((await readLeague(config.teeRpc, leagueId))!.pot));

  // Both seal squads.
  for (const [p, t, slots] of [[A, aTee, slotsA], [B, bTee, slotsB]] as const) {
    const lineup = defaultLineup(slots, (sid) => MOCK_STOCKS_BY_ID[sid]?.credits ?? 0);
    await waitFor("entry on TEE", () => readEntry(t, id, p.address));
    sig = await retry(async () => sendAndConfirm(t, p, [await sealIx(p, id, { squad: squadIds(slots), starters: lineup.starters, bench: lineup.bench, captainId: lineup.captainId, viceId: lineup.viceId })]));
    log(p === A ? "A" : "B", "sealed squad", explorer("tx", sig, { tee: true }));
  }

  // Run the gameweek.
  let lastPush = 0;
  let lastStatus = -1;
  let dueSince = 0;
  const settled = new Set<string>();
  for (;;) {
    if (Date.now() - lastPush > 20_000) {
      await pushOnce({ signer: crank, erRpc: config.teeRpc, priceUrl: PRICE_SOURCE.url }).catch((e) => log("push failed", e.message));
      lastPush = Date.now();
    }
    const g = (await readGameweek(config.teeRpc, id))!;
    const nowSec = Math.floor(Date.now() / 1000);
    if (g.status !== lastStatus) {
      if (lastStatus >= 0) log(`gameweek -> ${Object.keys(GW_STATUS)[g.status]}`);
      lastStatus = g.status;
      dueSince = 0;
    }
    if (snapshotDue(g, nowSec, await bookLastTs())) {
      dueSince ||= Date.now();
      if (Date.now() - dueSince > 40_000) {
        await sendAndConfirm(crankTee, crank, [await snapshotIx(id)]);
        continue;
      }
    }
    if (goldenDue(g, nowSec)) {
      await sendAndConfirm(crankTee, crank, [await requestGoldenIx(crank, id)]);
      continue;
    }
    for (const p of [A, B]) {
      const [entryPda] = await findEntryPda({ gameweek: id, authority: p.address });
      const e = await readEntry(crankTee, id, p.address);
      if (g.status >= GW_STATUS.kickedOff && e?.status === ENTRY_STATUS.sealed) await sendAndConfirm(crankTee, crank, [await revealIx(entryPda, id)]);
      if (g.status === GW_STATUS.final && e?.status === ENTRY_STATUS.revealed) {
        await sendAndConfirm(crankTee, crank, [await settleIx(crank, entryPda, id, p.address)]);
        settled.add(p.address);
      }
      if (e?.status === ENTRY_STATUS.settled) settled.add(p.address);
    }
    if (settled.size === 2) break;
    await sleep(5000);
  }
  const ea = (await readEntry(config.teeRpc, id, A.address))!;
  const eb = (await readEntry(config.teeRpc, id, B.address))!;
  log("points: A", ea.points, "| B", eb.points);

  const before = { a: (await readPortfolio(aTee, A.address))!.cash, b: (await readPortfolio(bTee, B.address))!.cash };
  const league = (await readLeague(config.teeRpc, leagueId))!;
  sig = await sendAndConfirm(crankTee, crank, [await settleLeagueIx(league)]);
  log("league settled: pot paid to the winner", explorer("tx", sig, { tee: true }));
  const after = { a: (await readPortfolio(aTee, A.address))!.cash, b: (await readPortfolio(bTee, B.address))!.cash };
  const done = (await readLeague(config.teeRpc, leagueId))!;
  log("winner", done.winner === A.address ? "A" : done.winner === B.address ? "B" : done.winner, "with", done.winnerPoints, "pts | paid", usd(done.paidOut));
  log("cash A", usd(before.a), "->", usd(after.a), "| cash B", usd(before.b), "->", usd(after.b));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
