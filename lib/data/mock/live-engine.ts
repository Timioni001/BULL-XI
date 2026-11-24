import type { ChipId, Gameweek, Lineup, LiveGameweekSnapshot, Manager } from "../types";
import { percentChange } from "@/lib/game/rules";
import { createLiveScorer } from "../live-scorer";
import { BENCHMARK_ID, MOCK_STOCKS_BY_ID } from "./stocks";
import { priceAt } from "./market";
import { DEFAULT_LEAGUE_ID, YOUR_SEASON_POINTS, YOU_ID, mockLeague, rankManagers } from "./leagues";

export interface LiveSessionInput {
  gameweek: Gameweek;
  lineup: Lineup;
  chip?: ChipId | null;
  hedgeId?: string | null;
  leagueId: string;
  kickoffAt: number;
  teamName?: string;
  transferHit?: number;
}

const posOf = (id: string) => MOCK_STOCKS_BY_ID[id]?.position;
const tickerOf = (id: string) => MOCK_STOCKS_BY_ID[id]?.ticker ?? id;

/**
 * Mock live gameweek. Every second it prices every stock in the league,
 * scores every manager with the real rules and ranks the table.
 * Live points use the current price vs the kickoff price. Final settlement
 * uses TWAP (see rules.twap).
 */
export function startLiveSession(input: LiveSessionInput, onSnapshot: (s: LiveGameweekSnapshot) => void): () => void {
  const league = mockLeague(input.leagueId) ?? mockLeague(DEFAULT_LEAGUE_ID)!;
  const you: Manager = {
    id: YOU_ID,
    name: "You",
    team: input.teamName ?? "Your XI",
    seasonPoints: YOUR_SEASON_POINTS,
    lastRank: 0,
    lineup: input.lineup,
    isYou: true,
  };
  const managers = rankManagers([...league.rivals, you]);
  const ids = new Set<string>([BENCHMARK_ID]);
  for (const m of managers) for (const id of [...m.lineup.starters, ...m.lineup.bench]) ids.add(id);

  const open: Record<string, number> = {};
  for (const id of ids) open[id] = priceAt(id, input.kickoffAt);

  const end = new Date(input.gameweek.end).getTime();
  const scorer = createLiveScorer(
    { ...input, benchmarkId: BENCHMARK_ID, leagueName: league.name, posOf, tickerOf },
    managers,
  );
  const tick = () => {
    const now = Date.now();
    const pct: Record<string, number> = {};
    for (const id of ids) pct[id] = percentChange(open[id], priceAt(id, now));
    const prevPct: Record<string, number> = {};
    for (const id of input.lineup.starters.concat(input.lineup.bench)) prevPct[id] = percentChange(open[id], priceAt(id, now - 1000));
    onSnapshot(scorer.snapshot(pct, prevPct, Math.min(now, end)));
  };

  tick();
  // Align ticks to the wall-clock second so every component flashes together.
  let interval: ReturnType<typeof setInterval> | undefined;
  const align = setTimeout(() => {
    tick();
    interval = setInterval(tick, 1000);
  }, 1000 - (Date.now() % 1000));

  return () => {
    clearTimeout(align);
    if (interval) clearInterval(interval);
  };
}
