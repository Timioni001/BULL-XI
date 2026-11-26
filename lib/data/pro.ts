/**
 * Pro preview and friends leagues on devnet (Private ER). Test dollars only:
 * "Devnet preview with test tokens priced from real market data."
 * Loaded on demand from lib/data/index.ts.
 */
import { address, type Instruction } from "@solana/kit";
import { config } from "@/lib/config";
import { findPortfolioPda } from "@/lib/onchain/bullxi";
import { ENTRY_STATUS, accountHome, decodeName, gameweekId, readEntry, readGameweek, readManager, stockId } from "@/lib/onchain/game";
import { MICRO, NO_WINNER, buySquadIx, claimIx, createLeagueIxs, joinLeagueIx, leagueCode, leagueIdFromCode, listLeagues, newLeagueId, portfolioIxs, readLeague, readPortfolio, sellAllIx } from "@/lib/onchain/pro";
import { teeRpcUrl } from "@/lib/onchain/tee-auth";
import { OnchainError, confirmOnSolana, playerSigner, relay, teeToken, waitFor } from "./onchain";
import type { FriendsLeague, FriendsLeagueMember, PlayerSigner, PortfolioView } from "./types";

const HOUR = 3_600_000;
const DAY = 86_400_000;

/* --------------------------------- Portfolio -------------------------------- */

async function privateRpc(p: PlayerSigner) {
  return teeRpcUrl(config.teeRpc, await teeToken(p));
}

/** Reads the player's private portfolio (needs their rollup login). null = no portfolio yet. */
export async function getPortfolio(p: PlayerSigner): Promise<PortfolioView | null> {
  const authority = address(p.address);
  const [pda] = await findPortfolioPda({ authority });
  if ((await accountHome(config.solanaRpc, pda)) === "missing") return null;
  const raw = await readPortfolio(await privateRpc(p), authority);
  if (!raw) return null;
  return {
    address: pda,
    claimed: raw.claimed,
    cash: Number(raw.cash) / MICRO,
    invested: Number(raw.invested) / MICRO,
    holdings: raw.shares.flatMap((s, i) => (s > BigInt(0) ? [{ stockId: stockId(i), shares: Number(s) / MICRO }] : [])),
    updatedAt: Number(raw.updatedTs) * 1000,
  };
}

/** Opens a Pro portfolio (sponsored) and claims the $1,000 of test dollars. */
export async function startPro(p: PlayerSigner): Promise<PortfolioView> {
  const authority = address(p.address);
  const signer = playerSigner(p);
  const [pda] = await findPortfolioPda({ authority });
  if ((await accountHome(config.solanaRpc, pda)) === "missing") {
    await confirmOnSolana(await relay("solana", (fee) => portfolioIxs(signer, fee)));
  }
  const raw = await waitFor(async () => readPortfolio(await privateRpc(p), authority));
  if (!raw.claimed) {
    await relay("tee", async () => [await claimIx(signer)]);
    await waitFor(async () => {
      const r = await readPortfolio(await privateRpc(p), authority);
      return r?.claimed ? r : null;
    });
  }
  const v = await getPortfolio(p);
  if (!v) throw new OnchainError("timeout", "Your portfolio is still opening. Try again in a minute.");
  return v;
}

async function trade(p: PlayerSigner, build: () => Promise<Instruction[]>): Promise<PortfolioView> {
  const before = (await getPortfolio(p))?.updatedAt ?? 0;
  await relay("tee", build);
  const v = await waitFor(async () => {
    const x = await getPortfolio(p);
    return x && x.updatedAt > before ? x : null;
  }, 30_000).catch(() => getPortfolio(p));
  if (!v) throw new OnchainError("timeout", "That took too long. Check your portfolio in a minute.");
  return v;
}

/** Buys `dollars` of the squad, equal dollars per stock, at the onchain price. */
export async function investSquad(p: PlayerSigner, squad: string[], dollars: number): Promise<PortfolioView> {
  const signer = playerSigner(p);
  return trade(p, async () => [await buySquadIx(signer, squad, dollars)]);
}

/** Sells every holding back to test dollars at the onchain price. */
export async function sellPortfolio(p: PlayerSigner): Promise<PortfolioView> {
  const signer = playerSigner(p);
  return trade(p, async () => [await sellAllIx(signer)]);
}

/* ---------------------------------- Leagues --------------------------------- */

/** The next gameweek of this kind with at least 5 minutes before its deadline. */
export function nextGameweek(kind: "daily" | "flash", now = Date.now()): { id: number; deadline: number } {
  if (kind === "flash") {
    let d = Math.floor(now / HOUR) * HOUR + HOUR;
    if (d - now < 5 * 60_000) d += HOUR;
    return { id: gameweekId("flash", d), deadline: d };
  }
  const t = new Date(now);
  t.setUTCHours(20, 0, 0, 0);
  let d = t.getTime();
  if (d - now < 5 * 60_000) d += DAY;
  return { id: gameweekId("daily", d), deadline: d };
}

async function ensureCash(p: PlayerSigner, fee: number) {
  let pf = await getPortfolio(p).catch(() => null);
  if (!pf || !pf.claimed) pf = await startPro(p);
  if (pf.cash < fee) throw new OnchainError("relay", `You need $${fee} in test dollars for the entry fee`);
}

/** Creates a league for the next gameweek, joins it, and returns its join code. */
export async function createFriendsLeague(p: PlayerSigner, input: { name: string; kind: "daily" | "flash"; fee: number }): Promise<string> {
  const gw = nextGameweek(input.kind);
  if (!(await readGameweek(config.teeRpc, gw.id))) throw new OnchainError("not-open", "That gameweek isn't open onchain yet");
  if (input.fee > 0) await ensureCash(p, input.fee);
  const signer = playerSigner(p);
  const id = newLeagueId();
  await confirmOnSolana(await relay("solana", (fee) => createLeagueIxs(signer, fee, id, input.name.trim().slice(0, 24) || "Friends", gw.id, input.fee)));
  const league = await waitFor(async () => readLeague(config.teeRpc, id));
  await relay("tee", async () => [await joinLeagueIx(signer, league)]);
  await waitFor(async () => {
    const l = await readLeague(config.teeRpc, id);
    return l && l.count > 0 ? l : null;
  });
  return leagueCode(id);
}

export async function joinFriendsLeague(p: PlayerSigner, code: string): Promise<FriendsLeague> {
  const id = leagueIdFromCode(code);
  if (id === null) throw new OnchainError("not-open", "That code doesn't look right");
  const league = await readLeague(config.teeRpc, id);
  if (!league) throw new OnchainError("not-open", "No league uses that code");
  const me = address(p.address);
  if (!league.members.slice(0, league.count).includes(me)) {
    if (league.fee > BigInt(0)) await ensureCash(p, Number(league.fee) / MICRO);
    const signer = playerSigner(p);
    await relay("tee", async () => [await joinLeagueIx(signer, league)]);
    await waitFor(async () => {
      const l = await readLeague(config.teeRpc, id);
      return l && l.members.slice(0, l.count).includes(me) ? l : null;
    });
  }
  const view = await getFriendsLeague(code);
  if (!view) throw new OnchainError("timeout", "Joined. The table will show in a moment.");
  return view;
}

const STATUS: FriendsLeagueMember["status"][] = ["none", "sealed", "revealed", "settled"];

export async function getFriendsLeague(code: string): Promise<FriendsLeague | null> {
  const id = leagueIdFromCode(code);
  if (id === null) return null;
  const l = await readLeague(config.teeRpc, id);
  if (!l) return null;
  const g = await readGameweek(config.teeRpc, l.gameweek).catch(() => null);
  const members = await Promise.all(
    l.members.slice(0, l.count).map(async (m): Promise<FriendsLeagueMember> => {
      const [mgr, entry] = await Promise.all([readManager(config.teeRpc, m).catch(() => null), readEntry(config.teeRpc, l.gameweek, m).catch(() => null)]);
      return {
        address: m,
        name: mgr ? decodeName(mgr.name) : null,
        points: entry && entry.status === ENTRY_STATUS.settled ? entry.points : null,
        // Sealed squads are private: the rollup hides them from everyone else until kickoff.
        status: entry ? STATUS[Math.min(3, entry.status)] : "none",
      };
    }),
  );
  const winner = l.status === 1 && l.winner !== NO_WINNER ? l.winner : null;
  return {
    id,
    code: leagueCode(id),
    name: decodeName(l.name),
    creator: l.creator,
    gameweek: l.gameweek,
    kind: l.gameweek >= 100_000_000 ? "flash" : "daily",
    deadline: g ? Number(g.deadlineTs) * 1000 : 0,
    end: g ? Number(g.endTs) * 1000 : 0,
    gameweekStatus: g?.status ?? 0,
    fee: Number(l.fee) / MICRO,
    pot: Number(l.pot) / MICRO,
    paidOut: Number(l.paidOut) / MICRO,
    settled: l.status === 1,
    winner,
    winnerPoints: winner ? l.winnerPoints : null,
    members,
  };
}

/** Friends leagues this player is in, newest gameweek first. */
export async function getMyFriendsLeagues(addr: string): Promise<FriendsLeague[]> {
  const me = address(addr);
  const all = (await listLeagues(config.teeRpc)).filter((l) => l.members.slice(0, l.count).includes(me));
  all.sort((a, b) => b.gameweek - a.gameweek || b.id - a.id);
  const out = await Promise.all(all.slice(0, 8).map((l) => getFriendsLeague(leagueCode(l.id))));
  return out.filter((x): x is FriendsLeague => !!x);
}
