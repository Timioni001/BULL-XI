import type { Badge, BadgeId, GameweekHistoryEntry } from "@/lib/data/types";

/** Pure badge rules. Later these mirror SOAR achievements. */
export function computeBadges(history: GameweekHistoryEntry[], locks: number): Badge[] {
  const has: Record<BadgeId, boolean> = {
    lockedIn: locks > 0 || history.length > 0,
    captainsCall: history.some((g) => g.bestCaptain.points >= 30),
    podium: history.some((g) => g.rank <= 3),
    ironXI: history.length >= 5,
    centurion: history.some((g) => g.points >= 100),
    champion: history.some((g) => g.rank === 1),
  };
  return (Object.keys(has) as BadgeId[]).map((id) => ({ id, earned: has[id] }));
}
