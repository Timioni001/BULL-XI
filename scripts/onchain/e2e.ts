/**
 * End-to-end check of the checkpoint 2 game loop on devnet + the MagicBlock TEE.
 * Creates a 5-minute test gameweek and a brand-new player, then:
 *   join -> create entry -> seal squad (private) -> privacy check -> kickoff
 *   -> reveal -> opening TWAP -> closing TWAP -> settle + commit -> read on Solana
 * Prices keep flowing via the pusher during the test.
 *
 *   npx tsx scripts/onchain/e2e.ts
 */
import { createSolanaRpc, generateKeyPairSigner, signBytes, type KeyPairSigner } from "@solana/kit";
import { config, explorer, PRICE_SOURCE } from "../../lib/config";
import { MOCK_STOCKS, MOCK_STOCKS_BY_ID } from "../../lib/data/mock/stocks";
import { mulberry32 } from "../../lib/data/mock/rng";
import { autoPick } from "../../lib/game/autopick";
import { defaultLineup, emptySquad, squadIds } from "../../lib/game/rules";
import { findEntryPda, findManagerPda } from "../../lib/onchain/bullxi";
import { ENTRY_STATUS, GW_STATUS, NO_STOCK, VRF_STATE, createGameweekIxs, decodeName, entryIxs, goldenDue, joinIxs, readEntry, readGameweek, readManager, requestGoldenIx, revealIx, scheduleTicksIx, sealIx, settleIx, snapshotDue, snapshotIx, stockId } from "../../lib/onchain/game";
import { decodePriceBook, priceBookAddress } from "../../lib/onchain/price-book";
import { pushOnce } from "../../lib/onchain/pusher";
import { sendAndConfirm } from "../../lib/onchain/send";
import { teeLogin, teeRpcUrl } from "../../lib/onchain/tee-auth";
import { loadSigner } from "./common";

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tee = (s: KeyPairSigner) => teeLogin(config.teeRpc, s.address, (m) => signBytes(s.keyPair.privateKey, m)).then((t) => teeRpcUrl(config.teeRpc, t.token));

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

async function main() {
  const admin = await loadSigner("deployer");
  const crank = await loadSigner("pusher");
  const player = await generateKeyPairSigner();
  const adminTee = await tee(admin);
  const crankTee = await tee(crank);
  log("player", player.address);

  // Test gameweek: deadline in 100s, 5 minutes long.
  const now = Date.now();
  const id = 900_000_000 + (Math.floor(now / 1000) % 10_000_000);
  const deadline = now + 100_000;
  const end = deadline + 300_000;
  let sig = await sendAndConfirm(config.solanaRpc, admin, await createGameweekIxs(admin, id, 0, deadline, end));
  log("gameweek", id, "created + delegated", explorer("tx", sig));

  sig = await sendAndConfirm(config.solanaRpc, admin, await joinIxs(player, admin, "Test Manager", "E2E XI"));
  log("manager created + delegated", explorer("tx", sig));
  sig = await sendAndConfirm(config.solanaRpc, admin, await entryIxs(player, admin, id));
  log("entry created + delegated", explorer("tx", sig));

  await waitFor("gameweek on TEE", () => readGameweek(config.teeRpc, id));
  // MagicBlock crank: the rollup itself ticks the gameweek every 10 s.
  sig = await sendAndConfirm(crankTee, crank, [await scheduleTicksIx(crank, id, { intervalMs: 10_000, iterations: 60 })]);
  log("MagicBlock crank scheduled (tick every 10 s)", explorer("tx", sig, { tee: true }));
  await waitFor("entry on TEE", () => readEntry(adminTee, id, player.address));

  // Auto-picked squad and lineup, same as the app.
  const slots = autoPick(MOCK_STOCKS, emptySquad(), mulberry32(7));
  const lineup = defaultLineup(slots, (sid) => MOCK_STOCKS_BY_ID[sid]?.credits ?? 0);
  // A gameweek created seconds ago may not be writable in the TEE yet: retry briefly.
  for (let attempt = 1; ; attempt++) {
    try {
      sig = await sendAndConfirm(adminTee, admin, [await sealIx(player, id, { squad: squadIds(slots), starters: lineup.starters, bench: lineup.bench, captainId: lineup.captainId, viceId: lineup.viceId })]);
      break;
    } catch (e) {
      if (attempt >= 6) throw e;
      await sleep(5000);
    }
  }
  log("squad sealed in the TEE", explorer("tx", sig, { tee: true }), "captain", lineup.captainId);

  // Privacy: a stranger can't read it, the player can.
  const [entryPda] = await findEntryPda({ gameweek: id, authority: player.address });
  const stranger = await generateKeyPairSigner();
  const asStranger = await readEntry(await tee(stranger), id, player.address).catch(() => null);
  const asPlayer = await readEntry(await tee(player), id, player.address);
  log("privacy: stranger sees entry?", !!asStranger, "| player sees entry?", !!asPlayer, "status", asPlayer?.status);

  // Run the gameweek: keep prices flowing, take snapshots, reveal, settle.
  let lastPush = 0;
  let lastStatus = -1;
  let dueSince = 0;
  for (;;) {
    if (Date.now() - lastPush > 20_000) {
      await pushOnce({ signer: crank, erRpc: config.teeRpc, priceUrl: PRICE_SOURCE.url }).catch((e) => log("push failed", e.message));
      lastPush = Date.now();
    }
    const g = await readGameweek(config.teeRpc, id);
    if (!g) throw new Error("gameweek vanished");
    const nowSec = Math.floor(Date.now() / 1000);
    if (g.status !== lastStatus) {
      if (lastStatus >= 0) log(`gameweek -> ${Object.keys(GW_STATUS)[g.status]} (advanced by the MagicBlock crank)`);
      lastStatus = g.status;
      dueSince = 0;
    }
    if (snapshotDue(g, nowSec, await bookLastTs())) {
      dueSince ||= Date.now();
      if (Date.now() - dueSince > 40_000) {
        // Fallback if the crank is late.
        sig = await sendAndConfirm(crankTee, crank, [await snapshotIx(id)]);
        log("fallback snapshot ->", Object.keys(GW_STATUS)[g.status + 1], explorer("tx", sig, { tee: true }));
        continue;
      }
    }
    if (goldenDue(g, nowSec)) {
      sig = await sendAndConfirm(crankTee, crank, [await requestGoldenIx(crank, id)]);
      log("golden stock requested from MagicBlock VRF", explorer("tx", sig, { tee: true }));
      continue;
    }
    const e = await readEntry(crankTee, id, player.address);
    if (g.status >= GW_STATUS.kickedOff && e?.status === ENTRY_STATUS.sealed) {
      sig = await sendAndConfirm(crankTee, crank, [await revealIx(entryPda, id)]);
      log("entry revealed", explorer("tx", sig, { tee: true }));
      const pub = await readEntry(await tee(stranger), id, player.address).catch(() => null);
      log("privacy after kickoff: stranger sees entry?", !!pub);
      continue;
    }
    if (g.status === GW_STATUS.final && e?.status === ENTRY_STATUS.revealed) {
      sig = await sendAndConfirm(crankTee, crank, [await settleIx(crank, entryPda, id, player.address)]);
      log("settled + commit scheduled", explorer("tx", sig, { tee: true }));
      break;
    }
    await sleep(5000);
  }

  const finalGw = await readGameweek(config.teeRpc, id);
  log("VRF:", finalGw?.vrfState === VRF_STATE.fulfilled ? `golden stock ${finalGw.golden === NO_STOCK ? "none" : stockId(finalGw.golden)}` : `state ${finalGw?.vrfState}`, "| top gainer", finalGw && finalGw.topGainer !== NO_STOCK ? stockId(finalGw.topGainer) : "none");
  const settled = await readEntry(config.teeRpc, id, player.address);
  log("points (TEE):", settled?.points);
  const [managerPda] = await findManagerPda({ authority: player.address });
  const onSolana = await waitFor("manager commit on Solana", async () => {
    const m = await readManager(config.solanaRpc, player.address);
    return m && m.gameweeks > 0 ? m : null;
  }, 120_000);
  log("manager on Solana:", decodeName(onSolana.name), "| gameweeks", onSolana.gameweeks, "| points", onSolana.totalPoints.toString(), explorer("address", managerPda));
  const entryOnSolana = await waitFor("entry commit on Solana", () => readEntry(config.solanaRpc, id, player.address), 120_000);
  log("entry on Solana: points", entryOnSolana.points, explorer("address", entryPda));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
