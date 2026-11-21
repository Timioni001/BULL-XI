import type { ChipId, Gameweek, Lineup, LiveEvent, LiveGameweekSnapshot, LiveStanding, LiveStockScore, Manager } from "../types";
import { percentChange, scoreGameweek } from "@/lib/game/rules";
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
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

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
  const events: LiveEvent[] = [];
  const announced: Record<string, { points: number; counted: number }> = {};
  // Rank commentary only fires once a new rank holds for a few seconds.
  let announcedRank = managers.find((m) => m.isYou)!.lastRank;
  let candidateRank = announcedRank;
  let candidateTicks = 0;
  let seq = 0;
  let first = true;

  const push = (e: Omit<LiveEvent, "id">) => {
    events.unshift({ ...e, id: `e${seq++}` });
    if (events.length > 30) events.pop();
  };

  push({ at: input.kickoffAt, kind: "kickoff", text: `Gameweek ${input.gameweek.number} kicked off` });

  const tick = () => {
    const now = Math.min(Date.now(), end);
    const pct: Record<string, number> = {};
    for (const id of ids) pct[id] = percentChange(open[id], priceAt(id, now));
    const prevPct: Record<string, number> = {};
    for (const id of input.lineup.starters.concat(input.lineup.bench)) prevPct[id] = percentChange(open[id], priceAt(id, now - 1000));

    // League top gainer among every starter in the league.
    let topGainerId: string | null = null;
    for (const m of managers) for (const id of m.lineup.starters) if (!topGainerId || pct[id] > pct[topGainerId]) topGainerId = id;

    const scored = managers.map((m) => {
      const r = scoreGameweek({
        lineup: m.lineup,
        posOf,
        pct,
        benchmarkId: BENCHMARK_ID,
        topGainerId,
        chip: m.isYou ? input.chip : null,
        hedgeId: m.isYou ? input.hedgeId : null,
        transferHit: m.isYou ? input.transferHit : 0,
      });
      return { m, r };
    });

    const standings: LiveStanding[] = scored
      .map(({ m, r }) => ({
        managerId: m.id,
        name: m.name,
        team: m.team,
        gwPoints: r.total,
        total: m.seasonPoints + r.total,
        rank: 0,
        lastRank: m.lastRank,
        isYou: !!m.isYou,
      }))
      .sort((a, b) => b.total - a.total || b.gwPoints - a.gwPoints || a.name.localeCompare(b.name))
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const mine = scored.find((s) => s.m.isYou)!.r;
    const scores: Record<string, LiveStockScore> = {};
    for (const [id, s] of Object.entries(mine.perStock)) {
      const d = pct[id] - prevPct[id];
      scores[id] = { id, pct: pct[id], base: s.base, bonus: s.bonus, points: s.points, counted: s.counted, multiplier: s.multiplier, dir: d > 0.0005 ? 1 : d < -0.0005 ? -1 : 0 };
    }

    // Commentary for your starters. A stock is called out when its points
    // move far enough from the last call, so small wobbles stay quiet.
    for (const id of mine.starters) {
      const s = scores[id];
      const isCap = id === mine.captainId;
      const prev = announced[id];
      if (prev === undefined) {
        announced[id] = { points: s.points, counted: s.counted };
        continue;
      }
      const step = isCap ? 5 : 8;
      if (Math.abs(s.points - prev.points) < step) continue;
      if (!isCap && Math.abs(s.points) < 10 && Math.abs(prev.points) < 10) continue;
      const up = s.points > prev.points;
      const delta = s.counted - prev.counted;
      announced[id] = { points: s.points, counted: s.counted };
      const name = tickerOf(id);
      if (isCap) {
        const worth = s.counted === 0 ? `${signed(s.points)} pts` : `${signed(s.points)}, ${s.multiplier === 3 ? "tripled" : "doubled"} to ${signed(s.counted)}`;
        push({ at: now, kind: "captain", stockId: id, delta, text: `Captain ${name} ${up ? "climbs" : "slips"} to ${worth}` });
      } else {
        push({ at: now, kind: up ? "surge" : "drop", stockId: id, delta, text: `${name} ${up ? "surges" : "drops"} to ${signed(s.points)} pts` });
      }
    }

    const yourRank = standings.find((s) => s.isYou)!.rank;
    if (yourRank === candidateRank) candidateTicks++;
    else {
      candidateRank = yourRank;
      candidateTicks = 1;
    }
    if (!first && candidateTicks >= 4 && candidateRank !== announcedRank) {
      const up = candidateRank < announcedRank;
      push({ at: now, kind: "rank", delta: announcedRank - candidateRank, text: up ? `You move up to ${ordinal(candidateRank)}` : `You drop to ${ordinal(candidateRank)}` });
      announcedRank = candidateRank;
    }
    first = false;

    onSnapshot({
      gameweek: input.gameweek,
      startedAt: input.kickoffAt,
      endsAt: end,
      totalPoints: mine.total,
      scores,
      effectiveCaptainId: mine.captainId ?? input.lineup.captainId,
      standings,
      yourRank,
      yourLastRank: managers.find((m) => m.isYou)!.lastRank,
      leagueName: league.name,
      events: [...events],
      benchmarkPct: pct[BENCHMARK_ID],
      chip: input.chip ?? undefined,
    });
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

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}
