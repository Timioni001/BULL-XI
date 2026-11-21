/**
 * BULL-XI data layer. The UI only talks to these functions.
 *
 * Phase 1: mock implementations in ./mock (seeded data, simulated 24/7 market).
 * Phase 2: swap the bodies for MagicBlock / Solana calls. Signatures stay.
 */
import type {
  ChartRange,
  ChipId,
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
import { chartSeries, snapshotPrices } from "./mock/market";
import { DEFAULT_LEAGUE_ID, MOCK_HISTORY, MOCK_LEAGUES, YOUR_SEASON_POINTS, YOU_ID, rankManagers } from "./mock/leagues";
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

/* ---------------- Leagues & history ---------------- */

export async function getLeagues(): Promise<LeagueSummary[]> {
  await latency();
  if (mockMode() === "empty") return [];
  return MOCK_LEAGUES.map((l) => {
    const ranked = rankManagers([...l.rivals, { id: YOU_ID, name: "You", team: "Your XI", seasonPoints: YOUR_SEASON_POINTS, lastRank: 0, lineup: l.rivals[0].lineup, isYou: true }]);
    return { id: l.id, name: l.name, code: l.code, kind: l.kind, size: ranked.length, yourRank: ranked.find((m) => m.isYou)!.lastRank };
  });
}

export async function getLeague(id: string, yourLineup?: Lineup): Promise<League> {
  await latency();
  const l = MOCK_LEAGUES.find((x) => x.id === id);
  if (!l) throw new Error("League not found");
  const you = { id: YOU_ID, name: "You", team: "Your XI", seasonPoints: YOUR_SEASON_POINTS, lastRank: 0, lineup: yourLineup ?? l.rivals[0].lineup, isYou: true };
  return { id: l.id, name: l.name, code: l.code, kind: l.kind, managers: rankManagers([...l.rivals, you]) };
}

export async function getHistory(): Promise<GameweekHistoryEntry[]> {
  await latency();
  return mockMode() === "empty" ? [] : MOCK_HISTORY;
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
