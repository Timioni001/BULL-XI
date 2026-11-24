/**
 * BULL-XI game rules. Pure functions only: no I/O, no randomness, no dates.
 * This module is the single source of truth for squads, lineups, scoring,
 * captaincy, chips and transfers. See CLAUDE.md section 3.
 */
import type { ChipId, Lineup, Position, Sector, SquadSlots, Stock } from "@/lib/data/types";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Season calendar position for the prototype (mock). */
export const CURRENT_GAMEWEEK = 13;

export const BUDGET = 100;
export const SQUAD_SIZE = 15;
export const XI_SIZE = 11;
export const BENCH_SIZE = 4;
export const MAX_PER_SECTOR = 3;

export const POSITIONS: Position[] = ["ETF", "BLUE", "GROWTH", "RISK"];

export const SQUAD_QUOTA: Record<Position, number> = { ETF: 2, BLUE: 5, GROWTH: 5, RISK: 3 };

export const XI_LIMITS: Record<Position, { min: number; max: number }> = {
  ETF: { min: 1, max: 1 },
  BLUE: { min: 3, max: 5 },
  GROWTH: { min: 2, max: 5 },
  RISK: { min: 1, max: 3 },
};

export const POSITION_META: Record<Position, { label: string; plural: string; short: string; football: string }> = {
  ETF: { label: "ETF", plural: "ETFs", short: "ETF", football: "Goalkeeper" },
  BLUE: { label: "Blue Chip", plural: "Blue Chips", short: "BLU", football: "Defender" },
  GROWTH: { label: "Growth", plural: "Growth", short: "GRO", football: "Midfielder" },
  RISK: { label: "High Risk", plural: "High Risk", short: "RSK", football: "Forward" },
};

export const POINTS_PER_PERCENT = 10;
export const POINT_CAP = 50;
export const BEAT_BENCHMARK_BONUS = 2;
/** A stock must beat SPYx by at least this many percentage points to earn the bonus. */
export const BEAT_BENCHMARK_MARGIN = 0.5;
export const TOP_GAINER_BONUS = 2;
/** The golden stock, drawn by MagicBlock VRF at kickoff, scores double for everyone who has it. */
export const GOLDEN_MULTIPLIER = 2;
export const CAPTAIN_MULTIPLIER = 2;
export const TRIPLE_CAPTAIN_MULTIPLIER = 3;

export const FREE_TRANSFERS_PER_GAMEWEEK = 1;
export const MAX_BANKED_TRANSFERS = 2;
export const TRANSFER_HIT = 4;

export const CHIPS: ChipId[] = ["wildcard", "freeHit", "tripleCaptain", "benchBoost", "hedge"];

export const CHIP_META: Record<ChipId, { name: string; effect: string }> = {
  wildcard: { name: "Wildcard", effect: "Unlimited free transfers this gameweek." },
  freeHit: { name: "Free Hit", effect: "One-gameweek squad. Reverts after." },
  tripleCaptain: { name: "Triple Captain", effect: "Your captain scores 3x." },
  benchBoost: { name: "Bench Boost", effect: "Your bench points count." },
  hedge: { name: "Hedge", effect: "Pick one stock. Its negative points become 0." },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Credits are tenths. Work in integers to avoid float drift (0.1 + 0.2). */
const toTenths = (credits: number) => Math.round(credits * 10);
const fromTenths = (tenths: number) => tenths / 10;

export function sumCredits(stocks: Pick<Stock, "credits">[]): number {
  return fromTenths(stocks.reduce((acc, s) => acc + toTenths(s.credits), 0));
}

export function emptySquad(): SquadSlots {
  return {
    ETF: Array(SQUAD_QUOTA.ETF).fill(null),
    BLUE: Array(SQUAD_QUOTA.BLUE).fill(null),
    GROWTH: Array(SQUAD_QUOTA.GROWTH).fill(null),
    RISK: Array(SQUAD_QUOTA.RISK).fill(null),
  };
}

export function squadIds(slots: SquadSlots): string[] {
  return POSITIONS.flatMap((p) => slots[p].filter((id): id is string => id !== null));
}

export function countByPosition(stocks: Pick<Stock, "position">[]): Record<Position, number> {
  const out: Record<Position, number> = { ETF: 0, BLUE: 0, GROWTH: 0, RISK: 0 };
  for (const s of stocks) out[s.position]++;
  return out;
}

export function countBySector(stocks: Pick<Stock, "sector">[]): Partial<Record<Sector, number>> {
  const out: Partial<Record<Sector, number>> = {};
  for (const s of stocks) out[s.sector] = (out[s.sector] ?? 0) + 1;
  return out;
}

/* ------------------------------------------------------------------ */
/* Squad validation                                                    */
/* ------------------------------------------------------------------ */

export type SquadIssue =
  | { code: "need_position"; position: Position; missing: number }
  | { code: "too_many_position"; position: Position; extra: number }
  | { code: "over_budget"; over: number }
  | { code: "sector_limit"; sector: Sector; count: number }
  | { code: "duplicate"; id: string };

export interface SquadValidation {
  valid: boolean;
  complete: boolean;
  size: number;
  creditsUsed: number;
  creditsLeft: number;
  counts: Record<Position, number>;
  issues: SquadIssue[];
}

export function validateSquad(stocks: Stock[]): SquadValidation {
  const issues: SquadIssue[] = [];
  const seen = new Set<string>();
  for (const s of stocks) {
    if (seen.has(s.id)) issues.push({ code: "duplicate", id: s.id });
    seen.add(s.id);
  }

  const counts = countByPosition(stocks);
  for (const p of POSITIONS) {
    const diff = SQUAD_QUOTA[p] - counts[p];
    if (diff > 0) issues.push({ code: "need_position", position: p, missing: diff });
    if (diff < 0) issues.push({ code: "too_many_position", position: p, extra: -diff });
  }

  const sectors = countBySector(stocks);
  for (const [sector, count] of Object.entries(sectors) as [Sector, number][]) {
    if (count > MAX_PER_SECTOR) issues.push({ code: "sector_limit", sector, count });
  }

  const creditsUsed = sumCredits(stocks);
  const creditsLeft = fromTenths(toTenths(BUDGET) - toTenths(creditsUsed));
  if (creditsLeft < 0) issues.push({ code: "over_budget", over: -creditsLeft });

  return {
    valid: issues.length === 0,
    complete: stocks.length === SQUAD_SIZE,
    size: stocks.length,
    creditsUsed,
    creditsLeft,
    counts,
    issues,
  };
}

/** Plain-English hints for the squad builder, most urgent first. */
export function squadHints(v: SquadValidation): string[] {
  const order: SquadIssue["code"][] = ["over_budget", "sector_limit", "too_many_position", "duplicate", "need_position"];
  return [...v.issues]
    .sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))
    .map((i) => {
      switch (i.code) {
        case "need_position": {
          const m = POSITION_META[i.position];
          return `Need ${i.missing} more ${i.missing === 1 ? m.label : m.plural}`;
        }
        case "too_many_position":
          return `${i.extra} too many ${POSITION_META[i.position].plural}`;
        case "over_budget":
          return `${i.over.toFixed(1)} credits over budget`;
        case "sector_limit":
          return `Max ${MAX_PER_SECTOR} from ${i.sector}. You have ${i.count}`;
        case "duplicate":
          return `Duplicate stock in squad`;
      }
    });
}

export type AddCheck =
  | { ok: true }
  | { ok: false; code: "in_squad" | "position_full" | "sector_full" | "over_budget"; reason: string };

/**
 * Can `stock` be added to `current`? To check a replacement, pass `current`
 * without the stock being replaced.
 */
export function canAddToSquad(current: Stock[], stock: Stock): AddCheck {
  if (current.some((s) => s.id === stock.id)) return { ok: false, code: "in_squad", reason: "In your squad" };
  const counts = countByPosition(current);
  if (counts[stock.position] >= SQUAD_QUOTA[stock.position]) {
    return { ok: false, code: "position_full", reason: `${POSITION_META[stock.position].plural} full` };
  }
  const sectorCount = current.filter((s) => s.sector === stock.sector).length;
  if (sectorCount >= MAX_PER_SECTOR) {
    return { ok: false, code: "sector_full", reason: `3 from ${stock.sector}` };
  }
  const left = toTenths(BUDGET) - toTenths(sumCredits(current));
  if (toTenths(stock.credits) > left) {
    return { ok: false, code: "over_budget", reason: `${fromTenths(toTenths(stock.credits) - left).toFixed(1)} over` };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Lineup (starting XI, captain, bench)                                */
/* ------------------------------------------------------------------ */

export type PositionOf = (id: string) => Position | undefined;

export function xiCounts(starters: string[], posOf: PositionOf): Record<Position, number> {
  const out: Record<Position, number> = { ETF: 0, BLUE: 0, GROWTH: 0, RISK: 0 };
  for (const id of starters) {
    const p = posOf(id);
    if (p) out[p]++;
  }
  return out;
}

export function isValidFormation(starters: string[], posOf: PositionOf): boolean {
  if (starters.length !== XI_SIZE) return false;
  const c = xiCounts(starters, posOf);
  return POSITIONS.every((p) => c[p] >= XI_LIMITS[p].min && c[p] <= XI_LIMITS[p].max);
}

/** Football-style formation string: Blue Chip - Growth - High Risk, e.g. "4-4-2". */
export function formation(starters: string[], posOf: PositionOf): string {
  const c = xiCounts(starters, posOf);
  return `${c.BLUE}-${c.GROWTH}-${c.RISK}`;
}

export type LineupIssue =
  | "starters_size"
  | "bench_size"
  | "duplicate"
  | "formation"
  | "captain_not_starter"
  | "vice_not_starter"
  | "captain_is_vice";

export function validateLineup(lineup: Lineup, posOf: PositionOf): { valid: boolean; issues: LineupIssue[] } {
  const issues: LineupIssue[] = [];
  if (lineup.starters.length !== XI_SIZE) issues.push("starters_size");
  if (lineup.bench.length !== BENCH_SIZE) issues.push("bench_size");
  const all = [...lineup.starters, ...lineup.bench];
  if (new Set(all).size !== all.length) issues.push("duplicate");
  if (lineup.starters.length === XI_SIZE && !isValidFormation(lineup.starters, posOf)) issues.push("formation");
  if (!lineup.starters.includes(lineup.captainId)) issues.push("captain_not_starter");
  if (!lineup.starters.includes(lineup.viceId)) issues.push("vice_not_starter");
  if (lineup.captainId === lineup.viceId) issues.push("captain_is_vice");
  return { valid: issues.length === 0, issues };
}

/**
 * Sensible default XI for a complete squad: 4-4-2, strongest by credits.
 * Captain = most expensive starter, vice = second.
 */
export function defaultLineup(slots: SquadSlots, creditsOf: (id: string) => number): Lineup {
  const byCredits = (ids: (string | null)[]) =>
    ids.filter((id): id is string => id !== null).sort((a, b) => creditsOf(b) - creditsOf(a));
  const etf = byCredits(slots.ETF);
  const blue = byCredits(slots.BLUE);
  const growth = byCredits(slots.GROWTH);
  const risk = byCredits(slots.RISK);

  const starters = [...etf.slice(0, 1), ...blue.slice(0, 4), ...growth.slice(0, 4), ...risk.slice(0, 2)];
  const bench = [...etf.slice(1), ...blue.slice(4), ...growth.slice(4), ...risk.slice(2)];
  const ranked = [...starters].sort((a, b) => creditsOf(b) - creditsOf(a));
  return { starters, bench, captainId: ranked[0], viceId: ranked[1] };
}

/** Swap any two squad members. Returns null if the result is not a legal lineup. */
export function swapInLineup(lineup: Lineup, a: string, b: string, posOf: PositionOf): Lineup | null {
  if (a === b) return null;
  const aStarter = lineup.starters.includes(a);
  const bStarter = lineup.starters.includes(b);
  const aBench = lineup.bench.indexOf(a);
  const bBench = lineup.bench.indexOf(b);

  if (aStarter && bStarter) return null;

  if (!aStarter && !bStarter) {
    if (aBench < 0 || bBench < 0) return null;
    // Reserve ETF stays in bench slot 0; only outfield order is set by the manager.
    if (posOf(a) === "ETF" || posOf(b) === "ETF") return null;
    const bench = [...lineup.bench];
    bench[aBench] = b;
    bench[bBench] = a;
    return { ...lineup, bench };
  }

  const out = aStarter ? a : b;
  const inn = aStarter ? b : a;
  if (!lineup.bench.includes(inn)) return null;
  const starters = lineup.starters.map((id) => (id === out ? inn : id));
  const bench = lineup.bench.map((id) => (id === inn ? out : id));
  if (!isValidFormation(starters, posOf)) return null;
  // The incoming stock inherits the armband.
  const captainId = lineup.captainId === out ? inn : lineup.captainId;
  const viceId = lineup.viceId === out ? inn : lineup.viceId;
  return { starters, bench, captainId, viceId };
}

/** Make `id` captain. If it was vice, the old captain becomes vice. */
export function setCaptain(lineup: Lineup, id: string): Lineup {
  if (!lineup.starters.includes(id) || lineup.captainId === id) return lineup;
  const viceId = lineup.viceId === id ? lineup.captainId : lineup.viceId;
  return { ...lineup, captainId: id, viceId };
}

/** Make `id` vice. If it was captain, the old vice becomes captain. */
export function setVice(lineup: Lineup, id: string): Lineup {
  if (!lineup.starters.includes(id) || lineup.viceId === id) return lineup;
  const captainId = lineup.captainId === id ? lineup.viceId : lineup.captainId;
  return { ...lineup, viceId: id, captainId };
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export function percentChange(open: number, close: number): number {
  if (open <= 0) return 0;
  return ((close - open) / open) * 100;
}

/**
 * Time-weighted average price. Each sample's price holds until the next
 * sample's timestamp. The last sample holds until `endT` (defaults to its own
 * time, so it carries no weight unless `endT` is given).
 */
export function twap(samples: { t: number; price: number }[], endT?: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const end = endT ?? sorted[sorted.length - 1].t;
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    const next = i + 1 < sorted.length ? sorted[i + 1].t : end;
    const dt = Math.max(0, next - sorted[i].t);
    weighted += sorted[i].price * dt;
    total += dt;
  }
  return total === 0 ? sorted[sorted.length - 1].price : weighted / total;
}

/** Round half away from zero so +0.05% and -0.05% are symmetric. */
function roundHalfAway(x: number): number {
  const r = Math.round(Math.abs(x) * 1e6) / 1e6; // strip float noise (1.8 * 10 = 18.000000000000004)
  return Math.sign(x) * Math.round(r) || 0;
}

/** +1.8% = 18 pts, -2.0% = -20 pts, capped at +/-50. */
export function basePoints(pct: number): number {
  const raw = roundHalfAway(pct * POINTS_PER_PERCENT);
  return Math.max(-POINT_CAP, Math.min(POINT_CAP, raw));
}

export interface StockScoreInput {
  pct: number;
  benchmarkPct: number;
  /** The benchmark itself (SPYx) can't beat itself */
  isBenchmark?: boolean;
  isTopGainer?: boolean;
  hedged?: boolean;
  /** Golden stock this gameweek: points doubled (after hedge, before the captain's armband) */
  golden?: boolean;
}

export interface StockScore {
  base: number;
  bonus: number;
  /** base + bonus, after hedge. Before captain multiplier. */
  points: number;
}

export function scoreStock(input: StockScoreInput): StockScore {
  const base = basePoints(input.pct);
  let bonus = 0;
  if (!input.isBenchmark && input.pct - input.benchmarkPct >= BEAT_BENCHMARK_MARGIN - 1e-9) bonus += BEAT_BENCHMARK_BONUS;
  if (input.isTopGainer) bonus += TOP_GAINER_BONUS;
  let points = base + bonus;
  if (input.hedged && points < 0) points = 0;
  if (input.golden) points *= GOLDEN_MULTIPLIER;
  return { base, bonus, points };
}

/** Captain if active, else vice, else nobody. */
export function effectiveCaptain(lineup: Lineup, halted: ReadonlySet<string> = new Set()): string | null {
  if (!halted.has(lineup.captainId)) return lineup.captainId;
  if (!halted.has(lineup.viceId)) return lineup.viceId;
  return null;
}

export function captainMultiplier(chip?: ChipId | null): number {
  return chip === "tripleCaptain" ? TRIPLE_CAPTAIN_MULTIPLIER : CAPTAIN_MULTIPLIER;
}

/**
 * Auto-subs: each halted starter is replaced by the first active bench stock
 * (in bench order) that keeps the formation legal.
 */
export function applyAutoSubs(lineup: Lineup, halted: ReadonlySet<string>, posOf: PositionOf): { starters: string[]; bench: string[] } {
  let starters = [...lineup.starters];
  let bench = [...lineup.bench];
  for (const out of lineup.starters) {
    if (!halted.has(out)) continue;
    for (const inn of bench) {
      if (halted.has(inn)) continue;
      const next = starters.map((id) => (id === out ? inn : id));
      if (isValidFormation(next, posOf)) {
        starters = next;
        bench = bench.map((id) => (id === inn ? out : id));
        break;
      }
    }
  }
  return { starters, bench };
}

export interface GameweekScoreInput {
  lineup: Lineup;
  posOf: PositionOf;
  /** % change over the gameweek (TWAP based), keyed by stock id */
  pct: Record<string, number>;
  benchmarkId: string;
  topGainerId?: string | null;
  /** Golden stock drawn by VRF for this gameweek, if any */
  goldenId?: string | null;
  halted?: ReadonlySet<string>;
  chip?: ChipId | null;
  hedgeId?: string | null;
  transferHit?: number;
}

export interface GameweekScore {
  total: number;
  starters: string[];
  bench: string[];
  captainId: string | null;
  perStock: Record<string, StockScore & { multiplier: number; counted: number }>;
  transferHit: number;
}

export function scoreGameweek(input: GameweekScoreInput): GameweekScore {
  const halted = input.halted ?? new Set<string>();
  const { starters, bench } = applyAutoSubs(input.lineup, halted, input.posOf);
  const captainId = effectiveCaptain(input.lineup, halted);
  const capMult = captainMultiplier(input.chip);
  const benchmarkPct = input.pct[input.benchmarkId] ?? 0;
  const benchCounts = input.chip === "benchBoost";

  const perStock: GameweekScore["perStock"] = {};
  let total = 0;
  for (const id of [...starters, ...bench]) {
    const s = scoreStock({
      pct: halted.has(id) ? 0 : input.pct[id] ?? 0,
      benchmarkPct,
      isBenchmark: id === input.benchmarkId,
      isTopGainer: id === input.topGainerId,
      hedged: input.chip === "hedge" && input.hedgeId === id,
      golden: !!input.goldenId && id === input.goldenId,
    });
    const isStarter = starters.includes(id);
    const active = !halted.has(id) && (isStarter || benchCounts);
    const multiplier = id === captainId && isStarter ? capMult : 1;
    const counted = active ? s.points * multiplier : 0;
    perStock[id] = { ...s, multiplier, counted };
    total += counted;
  }
  const transferHit = input.transferHit ?? 0;
  return { total: total - transferHit, starters, bench, captainId, perStock, transferHit };
}

/* ------------------------------------------------------------------ */
/* Transfers                                                           */
/* ------------------------------------------------------------------ */

/** Points cost of making `made` transfers with `free` free transfers available. */
export function transferCost(made: number, free: number, chip?: ChipId | null): number {
  if (chip === "wildcard" || chip === "freeHit") return 0;
  return Math.max(0, made - free) * TRANSFER_HIT;
}

/** Free transfers available next gameweek. Unused ones bank, up to 2. */
export function nextFreeTransfers(free: number, made: number, chip?: ChipId | null): number {
  const left = chip === "wildcard" || chip === "freeHit" ? free : Math.max(0, free - made);
  return Math.min(MAX_BANKED_TRANSFERS, left + FREE_TRANSFERS_PER_GAMEWEEK);
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

export type ChipCheck = { ok: true } | { ok: false; reason: string };

export function canPlayChip(args: {
  chip: ChipId;
  used: ChipId[];
  activeThisGameweek?: ChipId | null;
  hedgeId?: string | null;
  lineup?: Lineup | null;
}): ChipCheck {
  const { chip, used, activeThisGameweek, hedgeId, lineup } = args;
  if (used.includes(chip)) return { ok: false, reason: "Already used this season" };
  if (activeThisGameweek && activeThisGameweek !== chip) return { ok: false, reason: "One chip per gameweek" };
  if (chip === "hedge") {
    if (!hedgeId) return { ok: false, reason: "Pick a stock to hedge" };
    if (lineup && !lineup.starters.includes(hedgeId)) return { ok: false, reason: "Hedge a stock in your starting XI" };
  }
  return { ok: true };
}

/** Free Hit squads revert after the gameweek. Every other squad carries over. */
export function squadAfterGameweek<T>(args: { chip?: ChipId | null; before: T; during: T }): T {
  return args.chip === "freeHit" ? args.before : args.during;
}
