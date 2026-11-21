"use client";

import { useEffect, useMemo } from "react";
import type { Lineup, Position } from "@/lib/data/types";
import { defaultLineup, squadIds, validateLineup } from "@/lib/game/rules";
import { useGame } from "@/lib/store/game";
import { useSquad } from "./use-squad";

/** The manager's lineup, created from the squad when missing or stale. */
export function useLineup() {
  const squadState = useSquad();
  const { slots, validation, stocks } = squadState;
  const stored = useGame((s) => s.lineup);
  const setLineup = useGame((s) => s.setLineup);
  const hydrated = useGame((s) => s.hydrated);

  const posOf = useMemo(() => (id: string): Position | undefined => stocks.byId.get(id)?.position, [stocks.byId]);

  const lineup: Lineup | null = useMemo(() => {
    if (!validation.valid || stocks.status !== "success") return null;
    const ids = new Set(squadIds(slots));
    const fresh = stored && [...stored.starters, ...stored.bench].every((id) => ids.has(id)) && validateLineup(stored, posOf).valid;
    return fresh ? stored : defaultLineup(slots, (id) => stocks.byId.get(id)?.credits ?? 0);
  }, [stored, slots, validation.valid, stocks.status, stocks.byId, posOf]);

  useEffect(() => {
    if (hydrated && lineup && lineup !== stored) setLineup(lineup);
  }, [hydrated, lineup, stored, setLineup]);

  return { ...squadState, lineup, posOf, setLineup };
}
