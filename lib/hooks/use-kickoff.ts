"use client";

import type { LockedEntry } from "@/lib/store/game";
import { useNow } from "./use-now";

/**
 * When a locked gameweek starts. A demo kickoff starts it early; otherwise
 * it starts at its scheduled time. Returns null before kickoff.
 */
export function useKickoff(locked: LockedEntry | null): { kickoffAt: number | null; ended: boolean; now: number } {
  const now = useNow();
  if (!locked) return { kickoffAt: null, ended: false, now };
  const start = new Date(locked.start).getTime();
  const length = new Date(locked.end).getTime() - start;
  const kickoffAt = locked.kickoffAt ?? (now && now >= start ? start : null);
  const ended = !!kickoffAt && !!now && now >= kickoffAt + length;
  return { kickoffAt, ended, now };
}
