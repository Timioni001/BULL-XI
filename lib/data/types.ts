/**
 * Domain types shared by the data layer, game rules and UI.
 * Phase 2 implementations (MagicBlock / Solana) must return these same shapes.
 */

export type Position = "ETF" | "BLUE" | "GROWTH" | "RISK";

export type Sector =
  | "Index"
  | "Big Tech"
  | "Chips"
  | "Software"
  | "Consumer"
  | "Finance"
  | "Health"
  | "Energy"
  | "Crypto"
  | "Mobility";

export interface Stock {
  id: string;
  /** Display ticker, e.g. "NVDAx" */
  ticker: string;
  /** Mainnet token mint of the xStock, used for live prices */
  mint: string;
  name: string;
  sector: Sector;
  position: Position;
  /** Game price in credits, e.g. 12.5 */
  credits: number;
  /** Reference market price in USD (shown on detail only) */
  price: number;
  /** 24h % change, e.g. 1.84 means +1.84%. null when no trustworthy figure exists */
  change24h: number | null;
  /** % of managers who picked this stock */
  ownership: number;
  /** Average points over the last 3 gameweeks */
  form: number;
  /** Points from the last 5 gameweeks, oldest first */
  recentPoints: number[];
}

export interface PriceTick {
  id: string;
  price: number;
  change24h: number | null;
  /** Direction of the last tick, for flashes */
  dir: -1 | 0 | 1;
}

export type PriceMap = Record<string, PriceTick>;

export interface PricePoint {
  t: number;
  price: number;
}

export type ChartRange = "1D" | "1W";

export type GameweekKind = "daily" | "flash";

export interface Gameweek {
  id: string;
  number: number;
  kind: GameweekKind;
  /** ISO timestamps */
  deadline: string;
  start: string;
  end: string;
  status: "upcoming" | "live" | "finished";
}

export type ChipId = "wildcard" | "freeHit" | "tripleCaptain" | "benchBoost" | "hedge";

/** A full 15 stock squad, grouped by position. null = empty slot. */
export type SquadSlots = Record<Position, (string | null)[]>;

export interface Lineup {
  /** 11 stock ids */
  starters: string[];
  /** 4 stock ids, ordered. Index 0 is the reserve ETF. */
  bench: string[];
  captainId: string;
  viceId: string;
}

export interface Manager {
  id: string;
  name: string;
  team: string;
  /** Season points before the current gameweek */
  seasonPoints: number;
  /** Rank before the current gameweek */
  lastRank: number;
  lineup: Lineup;
  isYou?: boolean;
}

export interface League {
  id: string;
  name: string;
  code: string;
  kind: "private" | "global";
  managers: Manager[];
}

export interface LeagueSummary {
  id: string;
  name: string;
  code: string;
  kind: "private" | "global";
  size: number;
  yourRank: number;
}

export interface GameweekHistoryEntry {
  gameweek: number;
  kind: GameweekKind;
  points: number;
  rank: number;
  bestCaptain: { ticker: string; points: number };
  chip?: ChipId;
}

export interface LockReceipt {
  gameweekId: string;
  lockedAt: string;
  /** Short code shown on the seal. Later: Private Ephemeral Rollup commitment. */
  sealId: string;
}

/* ---------------- Live gameweek ---------------- */

export interface LiveStockScore {
  id: string;
  pct: number;
  base: number;
  bonus: number;
  /** After cap, bonus and hedge, before captain multiplier */
  points: number;
  /** After captain multiplier; 0 for bench unless Bench Boost */
  counted: number;
  multiplier: number;
  dir: -1 | 0 | 1;
}

export interface LiveStanding {
  managerId: string;
  name: string;
  team: string;
  gwPoints: number;
  total: number;
  rank: number;
  lastRank: number;
  isYou: boolean;
}

export type LiveEventKind = "surge" | "drop" | "captain" | "rank" | "kickoff" | "bonus";

export interface LiveEvent {
  id: string;
  at: number;
  kind: LiveEventKind;
  text: string;
  /** Points swing, signed, if relevant */
  delta?: number;
  stockId?: string;
}

export interface LiveGameweekSnapshot {
  gameweek: Gameweek;
  startedAt: number;
  endsAt: number;
  totalPoints: number;
  scores: Record<string, LiveStockScore>;
  effectiveCaptainId: string;
  standings: LiveStanding[];
  yourRank: number;
  yourLastRank: number;
  leagueName: string;
  events: LiveEvent[];
  benchmarkPct: number;
  chip?: ChipId;
}

/* ---------------- Step 4 additions ---------------- */

export interface GameweekResult {
  gameweek: number;
  kind: GameweekKind;
  points: number;
  rank: number;
  leagueName: string;
  leagueSize: number;
  bestPick: { ticker: string; points: number };
  captain: { ticker: string; points: number };
  teamName: string;
  chip?: ChipId;
  finishedAt: number;
}

export interface Fixture {
  home: { managerId: string; team: string; name: string; points?: number; isYou: boolean };
  away: { managerId: string; team: string; name: string; points?: number; isYou: boolean };
}

export interface LeagueFixtures {
  current: { gameweek: number; fixtures: Fixture[] };
  previous: { gameweek: number; fixtures: Fixture[] };
}

export interface LeaguePreview {
  id: string;
  name: string;
  code: string;
  size: number;
  leader: { team: string; points: number } | null;
  member: boolean;
}

export interface GameweekStats {
  managers: number;
  squadsLocked: number;
  mostPicked: { ticker: string; ownership: number }[];
  leader: { team: string; points: number };
}

export interface ProLeague {
  id: string;
  name: string;
  entryUsdc: number;
  spots: number;
  filled: number;
  poolUsdc: number;
  kind: GameweekKind;
}

export type ProofStatus = "live" | "building" | "planned";

export interface ProofStats {
  preview: boolean;
  counters: { settled: number; locked: number; sessions: number; vrf: number };
  stack: { moment: string; tech: string; status: ProofStatus }[];
  oracleProgram: string;
  gameProgram: string | null;
}

export type BadgeId = "lockedIn" | "captainsCall" | "podium" | "ironXI" | "centurion" | "champion";

export interface Badge {
  id: BadgeId;
  earned: boolean;
}

export interface FeaturedEntry {
  gameweek: Gameweek;
  lineup: Lineup;
  kickoffAt: number;
  teamName: string;
  /** The 15 stocks in the lineup */
  stocks: Record<string, Stock>;
  leagueId: string;
}
