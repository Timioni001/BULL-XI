import type { ChipId, Gameweek, Lineup, LiveEvent, LiveGameweekSnapshot, LiveStanding, LiveStockScore, Manager, Position } from "./types";
import { scoreGameweek } from "@/lib/game/rules";

/**
 * Turns per-stock % moves into a live gameweek snapshot: scores every manager
 * with the real rules (lib/game/rules.ts), ranks the table and writes the
 * commentary. Shared by the simulated session and the onchain session; only
 * where the % moves and the managers come from differs.
 */
export interface LiveScorerInput {
  gameweek: Gameweek;
  lineup: Lineup;
  chip?: ChipId | null;
  hedgeId?: string | null;
  kickoffAt: number;
  transferHit?: number;
  benchmarkId: string;
  leagueName: string;
  posOf: (id: string) => Position | undefined;
  tickerOf: (id: string) => string;
}

export type ScoredManager = Manager & { chip?: ChipId | null; hedgeId?: string | null; transferHit?: number };

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function createLiveScorer(input: LiveScorerInput, initialManagers: ScoredManager[]) {
  let managers = initialManagers;
  const { posOf, tickerOf } = input;
  const end = new Date(input.gameweek.end).getTime();
  const events: LiveEvent[] = [];
  const announced: Record<string, { points: number; counted: number }> = {};
  // Rank commentary only fires once a new rank holds for a few seconds.
  let announcedRank = managers.find((m) => m.isYou)?.lastRank ?? 0;
  let candidateRank = announcedRank;
  let candidateTicks = 0;
  let seq = 0;
  let first = true;

  const push = (e: Omit<LiveEvent, "id">) => {
    events.unshift({ ...e, id: `e${seq++}` });
    if (events.length > 30) events.pop();
  };
  push({ at: input.kickoffAt, kind: "kickoff", text: `Gameweek ${input.gameweek.number} kicked off` });

  return {
    /** Replace the table (onchain: new entries revealed). */
    setManagers(next: ScoredManager[]) {
      managers = next;
    },
    /** Every stock id any manager holds, plus the benchmark. */
    stockIds(): string[] {
      const ids = new Set<string>([input.benchmarkId]);
      for (const m of managers) for (const id of [...m.lineup.starters, ...m.lineup.bench]) ids.add(id);
      return [...ids];
    },
    snapshot(pct: Record<string, number>, prevPct: Record<string, number>, nowMs: number): LiveGameweekSnapshot {
      const now = Math.min(nowMs, end);
      // League top gainer among every starter in the league.
      let topGainerId: string | null = null;
      for (const m of managers) for (const id of m.lineup.starters) if (!topGainerId || (pct[id] ?? 0) > (pct[topGainerId] ?? 0)) topGainerId = id;

      const scored = managers.map((m) => {
        const r = scoreGameweek({
          lineup: m.lineup,
          posOf,
          pct,
          benchmarkId: input.benchmarkId,
          topGainerId,
          chip: m.isYou ? input.chip : (m.chip ?? null),
          hedgeId: m.isYou ? input.hedgeId : (m.hedgeId ?? null),
          transferHit: m.isYou ? input.transferHit : (m.transferHit ?? 0),
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
        const d = (pct[id] ?? 0) - (prevPct[id] ?? pct[id] ?? 0);
        scores[id] = { id, pct: pct[id] ?? 0, base: s.base, bonus: s.bonus, points: s.points, counted: s.counted, multiplier: s.multiplier, dir: d > 0.0005 ? 1 : d < -0.0005 ? -1 : 0 };
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

        return {
        gameweek: input.gameweek,
        startedAt: input.kickoffAt,
        endsAt: end,
        totalPoints: mine.total,
        scores,
        effectiveCaptainId: mine.captainId ?? input.lineup.captainId,
        standings,
        yourRank,
        yourLastRank: managers.find((m) => m.isYou)?.lastRank ?? 0,
        leagueName: input.leagueName,
        events: [...events],
        benchmarkPct: pct[input.benchmarkId] ?? 0,
        chip: input.chip ?? undefined,
      };
    },
  };
}
