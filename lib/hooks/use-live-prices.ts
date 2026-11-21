"use client";

import { useSyncExternalStore } from "react";
import { subscribeLivePrices, type PriceMap } from "@/lib/data";

let latest: PriceMap | null = null;

const subscribe = (cb: () => void) =>
  subscribeLivePrices((p) => {
    latest = p;
    cb();
  });

/** Live prices, updated every second. null during server render. */
export function useLivePrices(): PriceMap | null {
  return useSyncExternalStore(subscribe, () => latest, () => null);
}
