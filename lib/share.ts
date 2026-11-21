import type { GameweekResult } from "@/lib/data/types";
import { routes } from "@/lib/routes";

/** URL of the 1080x1350 share card image for a result. */
export function shareCardUrl(r: GameweekResult): string {
  const q = new URLSearchParams({
    gw: String(r.gameweek),
    pts: String(r.points),
    rank: String(r.rank),
    of: String(r.leagueSize),
    league: r.leagueName,
    team: r.teamName,
    best: `${r.bestPick.ticker}:${r.bestPick.points}`,
    cap: `${r.captain.ticker}:${r.captain.points}`,
  });
  if (r.chip) q.set("chip", r.chip);
  return `${routes.shareCard}?${q.toString()}`;
}

export const isBigWin = (r: GameweekResult) => r.points >= 60 || r.rank <= 3;
