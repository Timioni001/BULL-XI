/**
 * BULL-XI data layer. The UI only talks to these functions.
 *
 * Phase 1: mock implementations in ./mock (seeded data, simulated 24/7 market).
 * Phase 2: swap the bodies for MagicBlock / Solana calls. Signatures stay.
 */
import type {
  Badge,
  ChartRange,
  ChipId,
  FeaturedEntry,
  Fixture,
  GameweekStats,
  LeagueFixtures,
  LeaguePreview,
  Manager,
  ProLeague,
  ProofStats,
  Gameweek,
  GameweekHistoryEntry,
  GameweekKind,
  League,
  LeagueSummary,
  Lineup,
  LiveGameweekSnapshot,
  LockReceipt,
  PriceMap,
  PricePoint,
  Stock,
} from "./types";
import { MOCK_STOCKS, MOCK_STOCKS_BY_ID } from "./mock/stocks";
import { chartSeries, priceAt, setMarketSpeed, snapshotPrices } from "./mock/market";
import { DEFAULT_LEAGUE_ID, MOCK_HISTORY, YOUR_SEASON_POINTS, YOU_ID, mockLeague, mockLeagues, rankManagers, type MockLeague } from "./mock/leagues";
import { clearLocal, makeCode, readLocal, writeLocal } from "./mock/local";
import { computeBadges } from "@/lib/game/badges";
import { autoPick } from "@/lib/game/autopick";
import { defaultLineup, emptySquad } from "@/lib/game/rules";
import { mulberry32 } from "./mock/rng";
import { startLiveSession } from "./mock/live-engine";
import { CURRENT_GAMEWEEK } from "@/lib/game/rules";
import { latency, mockMode } from "./mock/config";

export type * from "./types";
export { DEFAULT_LEAGUE_ID };

/* ---------------- Stocks ---------------- */

export async function getStocks(): Promise<Stock[]> {
  await latency();
  const live = snapshotPrices(Date.now());
  return MOCK_STOCKS.map((s) => ({ ...s, price: live[s.id].price, change24h: live[s.id].change24h }));
}

export async function getStock(id: string): Promise<Stock | undefined> {
  await latency(150);
  const s = MOCK_STOCKS_BY_ID[id];
  if (!s) return undefined;
  const live = snapshotPrices(Date.now())[id];
  return { ...s, price: live.price, change24h: live.change24h };
}

export async function getStockChart(id: string, range: ChartRange): Promise<PricePoint[]> {
  await latency(250);
  return chartSeries(id, range, Date.now());
}

/** 24h sparkline per stock, 24 points each. */
export async function getSparklines(): Promise<Record<string, number[]>> {
  const now = Date.now();
  return Object.fromEntries(MOCK_STOCKS.map((s) => [s.id, chartSeries(s.id, "1D", now).filter((_, i) => i % 4 === 0).map((p) => p.price)]));
}

/* ---------------- Live prices ---------------- */

export async function getLivePrices(): Promise<PriceMap> {
  return snapshotPrices(Date.now());
}

const priceListeners = new Set<(p: PriceMap) => void>();
let priceTimer: ReturnType<typeof setInterval> | undefined;
let priceAlign: ReturnType<typeof setTimeout> | undefined;
let lastPrices: PriceMap | null = null;

function emitPrices() {
  lastPrices = snapshotPrices(Date.now());
  for (const l of priceListeners) l(lastPrices);
}

/** Live price feed, one update per second. Returns an unsubscribe function. */
export function subscribeLivePrices(listener: (p: PriceMap) => void): () => void {
  priceListeners.add(listener);
  listener(lastPrices ?? snapshotPrices(Date.now()));
  if (priceListeners.size === 1) {
    priceAlign = setTimeout(() => {
      emitPrices();
      priceTimer = setInterval(emitPrices, 1000);
    }, 1000 - (Date.now() % 1000));
  }
  return () => {
    priceListeners.delete(listener);
    if (priceListeners.size === 0) {
      clearTimeout(priceAlign);
      clearInterval(priceTimer);
      priceTimer = undefined;
    }
  };
}

/* ---------------- Gameweeks ---------------- */

const GW_NUMBER = CURRENT_GAMEWEEK;

/** The next gameweek you can enter. Daily: 24h from 20:00 UTC. Flash: 1h from the next hour. */
export async function getCurrentGameweek(kind: GameweekKind = "daily"): Promise<Gameweek> {
  await latency(200);
  const now = Date.now();
  let start: number;
  let length: number;
  if (kind === "daily") {
    const d = new Date(now);
    d.setUTCHours(20, 0, 0, 0);
    if (d.getTime() - now < 15 * 60_000) d.setUTCDate(d.getUTCDate() + 1);
    start = d.getTime();
    length = 24 * 3_600_000;
  } else {
    const h = new Date(now);
    h.setUTCMinutes(0, 0, 0);
    h.setUTCHours(h.getUTCHours() + 1);
    if (h.getTime() - now < 5 * 60_000) h.setUTCHours(h.getUTCHours() + 1);
    start = h.getTime();
    length = 3_600_000;
  }
  return {
    id: `gw${GW_NUMBER}-${kind}-${start}`,
    number: GW_NUMBER,
    kind,
    deadline: new Date(start).toISOString(),
    start: new Date(start).toISOString(),
    end: new Date(start + length).toISOString(),
    status: "upcoming",
  };
}

/**
 * Lock the squad for a gameweek. Later: commit the lineup into a Private
 * Ephemeral Rollup so rivals can't see it until kickoff.
 */
export async function lockSquad(input: { gameweekId: string; lineup: Lineup; chip?: ChipId | null }): Promise<LockReceipt> {
  await latency(900);
  const raw = `${input.gameweekId}:${input.lineup.starters.join(",")}:${input.lineup.captainId}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(h, 31) + raw.charCodeAt(i)) >>> 0;
  return {
    gameweekId: input.gameweekId,
    lockedAt: new Date().toISOString(),
    sealId: h.toString(16).toUpperCase().padStart(8, "0").slice(0, 8),
  };
}

/* ---------------- Leagues ---------------- */

const youIn = (lineup?: Lineup): Manager => ({
  id: YOU_ID,
  name: "You",
  team: "Your XI",
  seasonPoints: YOUR_SEASON_POINTS,
  lastRank: 0,
  lineup: lineup ?? mockLeague(DEFAULT_LEAGUE_ID)!.rivals[0].lineup,
  isYou: true,
});

/** All leagues you can see: built-in, created by you, or joined with a code. */
function allLeagues(): (MockLeague & { custom?: boolean })[] {
  const local = readLocal();
  const created = local.created.map((c) => ({ id: c.id, name: c.name, code: c.code, kind: "private" as const, rivals: [], member: true, custom: true }));
  const builtIn = mockLeagues().map((l) => ({ ...l, member: l.member || local.joined.includes(l.id) }));
  return [...created, ...builtIn];
}

export async function getLeagues(): Promise<LeagueSummary[]> {
  await latency();
  if (mockMode() === "empty") return [];
  return allLeagues()
    .filter((l) => l.member)
    .map((l) => {
      const ranked = rankManagers([...l.rivals, youIn()]);
      return { id: l.id, name: l.name, code: l.code, kind: l.kind, size: ranked.length, yourRank: ranked.find((m) => m.isYou)!.lastRank };
    });
}

export async function getLeague(id: string, yourLineup?: Lineup): Promise<League> {
  await latency();
  const l = allLeagues().find((x) => x.id === id);
  if (!l || !l.member) throw new Error("League not found");
  return { id: l.id, name: l.name, code: l.code, kind: l.kind, managers: rankManagers([...l.rivals, youIn(yourLineup)]) };
}

export async function getLeagueByCode(code: string): Promise<LeaguePreview | null> {
  await latency(300);
  const l = allLeagues().find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  if (!l) return null;
  const ranked = rankManagers([...l.rivals, youIn()]);
  const leader = ranked[0];
  return {
    id: l.id,
    name: l.name,
    code: l.code,
    size: l.member ? ranked.length : ranked.length - 1,
    leader: leader && !(l.rivals.length === 0) ? { team: leader.team, points: leader.seasonPoints } : null,
    member: l.member,
  };
}

/** Create a private league. Later: an account on the BULL-XI program. */
export async function createLeague(name: string): Promise<LeagueSummary> {
  await latency(500);
  const local = readLocal();
  const league = { id: `my-${Date.now().toString(36)}`, name: name.trim().slice(0, 32), code: makeCode(name), createdAt: Date.now() };
  writeLocal({ ...local, created: [league, ...local.created] });
  return { id: league.id, name: league.name, code: league.code, kind: "private", size: 1, yourRank: 1 };
}

export async function joinLeague(code: string): Promise<LeagueSummary> {
  await latency(500);
  const l = allLeagues().find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
  if (!l) throw new Error("League not found");
  const local = readLocal();
  if (!local.joined.includes(l.id) && !l.member) writeLocal({ ...local, joined: [...local.joined, l.id] });
  const ranked = rankManagers([...l.rivals, youIn()]);
  return { id: l.id, name: l.name, code: l.code, kind: l.kind, size: ranked.length, yourRank: ranked.find((m) => m.isYou)!.lastRank };
}

/** Head-to-head pairings, drawn per gameweek. Later: MagicBlock VRF. */
export async function getLeagueFixtures(id: string): Promise<LeagueFixtures> {
  await latency();
  const l = allLeagues().find((x) => x.id === id);
  if (!l) throw new Error("League not found");
  const people = [
    ...l.rivals.map((r) => ({ managerId: r.id, team: r.team, name: r.name, last: r.lastGwPoints, isYou: false })),
    { managerId: YOU_ID, team: "Your XI", name: "You", last: MOCK_HISTORY[MOCK_HISTORY.length - 1].points, isYou: true },
  ];
  const draw = (gw: number, withPoints: boolean): Fixture[] => {
    const rng = mulberry32(gw * 7919 + id.length * 31);
    const order = [...people].sort(() => rng() - 0.5);
    const out: Fixture[] = [];
    for (let i = 0; i + 1 < order.length; i += 2) {
      const side = (p: (typeof people)[number]) => ({ managerId: p.managerId, team: p.team, name: p.name, isYou: p.isYou, points: withPoints ? p.last : undefined });
      out.push({ home: side(order[i]), away: side(order[i + 1]) });
    }
    return out.sort((a, b) => Number(b.home.isYou || b.away.isYou) - Number(a.home.isYou || a.away.isYou));
  };
  return {
    current: { gameweek: GW_NUMBER, fixtures: draw(GW_NUMBER, false) },
    previous: { gameweek: GW_NUMBER - 1, fixtures: draw(GW_NUMBER - 1, true) },
  };
}

/* ---------------- History, badges, stats ---------------- */

export async function getHistory(): Promise<GameweekHistoryEntry[]> {
  await latency();
  return mockMode() === "empty" ? [] : MOCK_HISTORY;
}

export async function getBadges(locks: number): Promise<Badge[]> {
  await latency(200);
  return computeBadges(mockMode() === "empty" ? [] : MOCK_HISTORY, locks);
}

/** Headline numbers for the landing page. Mock until mainnet. */
export async function getGameweekStats(): Promise<GameweekStats> {
  const top = [...MOCK_STOCKS].sort((a, b) => b.ownership - a.ownership).slice(0, 3);
  return {
    managers: 1284,
    squadsLocked: 962,
    mostPicked: top.map((s) => ({ ticker: s.ticker, ownership: s.ownership })),
    leader: { team: "Inter Margin", points: 361 },
  };
}

export async function getProLeagues(): Promise<ProLeague[]> {
  await latency(300);
  return [
    { id: "pro-daily-5", name: "Daily Starter", entryUsdc: 5, spots: 50, filled: 31, poolUsdc: 139.5, kind: "daily" },
    { id: "pro-daily-25", name: "Daily Pro", entryUsdc: 25, spots: 20, filled: 12, poolUsdc: 270, kind: "daily" },
    { id: "pro-flash-10", name: "Flash Hour", entryUsdc: 10, spots: 16, filled: 9, poolUsdc: 81, kind: "flash" },
  ];
}

export const PRO_PLATFORM_CUT = 10;

export const ORACLE_PROGRAM_ID = "PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd";

export async function getProofStats(): Promise<ProofStats> {
  return {
    preview: true,
    counters: { settled: 12, locked: 962, sessions: 4310, vrf: 186 },
    stack: [
      { moment: "Squads sealed until kickoff", tech: "Private Ephemeral Rollup", status: "planned" },
      { moment: "Live points every second", tech: "Ephemeral Rollup + Pyth Lazer oracle", status: "building" },
      { moment: "Deadline lock and settlement", tech: "Cranks", status: "planned" },
      { moment: "Final standings", tech: "Commit / Undelegate", status: "planned" },
      { moment: "Prize payouts", tech: "Magic Actions", status: "planned" },
      { moment: "Entry fees and prize pool", tech: "Ephemeral SPL Token", status: "planned" },
      { moment: "No pop-ups for captain and transfers", tech: "Session Keys", status: "planned" },
      { moment: "Head-to-head draws", tech: "VRF", status: "planned" },
      { moment: "Season rank and badges", tech: "SOAR", status: "planned" },
      { moment: "Transaction routing", tech: "Magic Router", status: "planned" },
    ],
    oracleProgram: ORACLE_PROGRAM_ID,
    gameProgram: null,
  };
}

/* ---------------- Demo controls ---------------- */

/** Demo mode runs the simulated market fast. Real mode runs it at real speed. */
export function configureMarket(opts: { fast: boolean }) {
  setMarketSpeed(opts.fast);
  lastPrices = null;
}

export function resetLocalData() {
  clearLocal();
}

/** A sample entry for the landing page's live preview. */
export function getFeaturedEntry(nowMs: number): FeaturedEntry {
  const slots = autoPick(MOCK_STOCKS, emptySquad(), mulberry32(2026));
  const lineup = defaultLineup(slots, (id) => MOCK_STOCKS_BY_ID[id]?.credits ?? 0);
  const hour = Math.floor(nowMs / 3_600_000) * 3_600_000;
  return {
    teamName: "Bulls on Parade",
    leagueId: "sunday",
    kickoffAt: hour,
    stocks: Object.fromEntries([...lineup.starters, ...lineup.bench].map((id) => [id, MOCK_STOCKS_BY_ID[id]])),
    lineup,
    gameweek: {
      id: `featured-${hour}`,
      number: GW_NUMBER,
      kind: "flash",
      deadline: new Date(hour).toISOString(),
      start: new Date(hour).toISOString(),
      end: new Date(hour + 3_600_000).toISOString(),
      status: "live",
    },
  };
}

/** Latest price for one stock, used by the live ticker. */
export function priceNow(id: string): number {
  return priceAt(id, Date.now());
}

/* ---------------- Live gameweek ---------------- */

export interface LiveGameweekInput {
  gameweek: Gameweek;
  lineup: Lineup;
  chip?: ChipId | null;
  hedgeId?: string | null;
  leagueId?: string;
  kickoffAt: number;
  teamName?: string;
  transferHit?: number;
}

/**
 * Live points, ranks and commentary, pushed every second.
 * Later: Ephemeral Rollup + price oracle stream.
 */
export function subscribeLiveGameweek(
  input: LiveGameweekInput,
  listener: (s: LiveGameweekSnapshot) => void,
  onError?: (e: Error) => void,
): () => void {
  let stop: (() => void) | undefined;
  let cancelled = false;
  latency(400)
    .then(() => {
      if (cancelled) return;
      stop = startLiveSession({ ...input, leagueId: input.leagueId ?? DEFAULT_LEAGUE_ID }, listener);
    })
    .catch((e: Error) => !cancelled && onError?.(e));
  return () => {
    cancelled = true;
    stop?.();
  };
}
