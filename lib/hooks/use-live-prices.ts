"use client";

import { useCallback, useSyncExternalStore } from "react";
import { configureMarket, subscribeLivePrices, type PriceMap } from "@/lib/data";
import { useGame } from "@/lib/store/game";

let latest: PriceMap | null = null;

/**
 * Live prices. Real prices refresh every few seconds; demo mode uses the
 * simulated market, which ticks every second. null during server render.
 */
export function useLivePrices(): PriceMap | null {
  const demo = useGame((s) => s.demoMode);
  const subscribe = useCallback(
    (cb: () => void) => {
      configureMarket({ fast: demo });
      return subscribeLivePrices((p) => {
        latest = p;
        cb();
      });
    },
    [demo],
  );
  return useSyncExternalStore(subscribe, () => latest, () => null);
}
