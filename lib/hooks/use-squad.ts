"use client";

import { useMemo } from "react";
import type { Stock } from "@/lib/data/types";
import { POSITIONS, squadHints, validateSquad } from "@/lib/game/rules";
import { useGame } from "@/lib/store/game";
import { useStocks } from "./use-stocks";

/** Current squad resolved against the stock list, plus validation. */
export function useSquad() {
  const slots = useGame((s) => s.slots);
  const stocks = useStocks();
  return useMemo(() => {
    const squad: Stock[] = POSITIONS.flatMap((p) => slots[p].flatMap((id) => (id && stocks.byId.get(id) ? [stocks.byId.get(id)!] : [])));
    const validation = validateSquad(squad);
    return { slots, squad, validation, hints: squadHints(validation), stocks };
  }, [slots, stocks]);
}
