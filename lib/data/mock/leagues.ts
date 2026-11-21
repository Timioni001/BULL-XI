import type { GameweekHistoryEntry, League, Manager } from "../types";
import { autoPick } from "@/lib/game/autopick";
import { defaultLineup, emptySquad } from "@/lib/game/rules";
import { MOCK_STOCKS, MOCK_STOCKS_BY_ID } from "./stocks";
import { hashString, mulberry32 } from "./rng";

export const YOU_ID = "you";

const FIRST = ["Sam", "Priya", "Jordan", "Ade", "Mia", "Luca", "Chen", "Tom", "Zara", "Dev", "Nina", "Kofi", "Ellie", "Raf", "Hana", "Ben", "Ola", "Marco", "Aisha", "Finn", "Leo", "Ivy", "Theo", "Yusuf"];
const LAST = ["K.", "R.", "M.", "O.", "S.", "B.", "W.", "T.", "A.", "D.", "L.", "P."];
const TEAMS = [
  "Bulls on Parade", "Dividend FC", "Short Squeeze Utd", "Real Mad Gains", "Inter Margin", "Paper Hands XI",
  "Diamond Feet", "Blue Chip City", "Sporting Spread", "Ath. Leverage", "Borussia Dip", "Red Candle Rovers",
  "Moonwalk Wanderers", "Bear Necessities", "Stop Loss Albion", "Theta Gang FC", "Vol Crush Villa", "Hedge Hogs",
  "Liquidity Lions", "Bid Ask Town", "Tick Tock Toon", "Gap Up Galaxy", "Market Makers", "The Overnighters",
];

/** Season points before the current gameweek. Your total comes from your history. */
export const MOCK_HISTORY: GameweekHistoryEntry[] = [
  { gameweek: 8, kind: "daily", points: 61, rank: 6, bestCaptain: { ticker: "NVDAx", points: 34 } },
  { gameweek: 9, kind: "daily", points: 48, rank: 8, bestCaptain: { ticker: "TSLAx", points: 22 } },
  { gameweek: 10, kind: "flash", points: 73, rank: 3, bestCaptain: { ticker: "COINx", points: 46 }, chip: "tripleCaptain" },
  { gameweek: 11, kind: "daily", points: 39, rank: 9, bestCaptain: { ticker: "PLTRx", points: 18 } },
  { gameweek: 12, kind: "daily", points: 66, rank: 5, bestCaptain: { ticker: "AVGOx", points: 30 } },
];

const YOUR_SEASON = MOCK_HISTORY.reduce((a, g) => a + g.points, 0);

function makeManager(leagueId: string, i: number, spread: number, teamOffset: number): Manager {
  const seed = hashString(`${leagueId}:${i}`);
  const rng = mulberry32(seed);
  const slots = autoPick(MOCK_STOCKS, emptySquad(), rng);
  const lineup = defaultLineup(slots, (id) => MOCK_STOCKS_BY_ID[id]?.credits ?? 0);
  // Rivals sometimes captain someone other than the priciest stock.
  if (rng() < 0.45) {
    const alt = lineup.starters[1 + Math.floor(rng() * 10)];
    if (alt !== lineup.viceId) lineup.captainId = alt;
  }
  return {
    id: `${leagueId}-m${i}`,
    name: `${FIRST[(seed >>> 3) % FIRST.length]} ${LAST[(seed >>> 7) % LAST.length]}`,
    team: TEAMS[(teamOffset + i) % TEAMS.length],
    seasonPoints: Math.round(YOUR_SEASON + (rng() - 0.5) * spread),
    lastRank: 0,
    lineup,
  };
}

function makeLeague(id: string, name: string, code: string, kind: League["kind"], size: number, spread: number): Omit<League, "managers"> & { rivals: Manager[] } {
  const offset = hashString(id) % TEAMS.length;
  const rivals = Array.from({ length: size - 1 }, (_, i) => makeManager(id, i, spread, offset));
  return { id, name, code, kind, rivals };
}

export const MOCK_LEAGUES = [
  makeLeague("office", "Office Legends", "OFC-7Q2", "private", 12, 70),
  makeLeague("sunday", "Sunday League", "SUN-4K9", "private", 8, 50),
  makeLeague("global", "BULL-XI Global", "GLOBAL", "global", 20, 110),
];

export const DEFAULT_LEAGUE_ID = "office";
export const YOUR_SEASON_POINTS = YOUR_SEASON;

export function rankManagers(managers: Manager[]): Manager[] {
  const sorted = [...managers].sort((a, b) => b.seasonPoints - a.seasonPoints);
  return sorted.map((m, i) => ({ ...m, lastRank: i + 1 }));
}
