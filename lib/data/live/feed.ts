import type { PriceMap } from "../types";
import { PRICE_SOURCE } from "@/lib/config";
import { fetchQuotes } from "./jupiter";

/**
 * Polls real prices while anyone is listening and shares one result with
 * every screen. Keeps the last good prices if a poll fails.
 */
export function createRealFeed(stocks: { id: string; mint: string }[]) {
  const byMint = Object.fromEntries(stocks.map((s) => [s.mint, s.id]));
  const mints = stocks.map((s) => s.mint);
  const listeners = new Set<(p: PriceMap) => void>();
  let last: PriceMap | null = null;
  let lastAt = 0;
  let inflight: Promise<PriceMap> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let delay: number = PRICE_SOURCE.pollMs;

  async function poll(): Promise<PriceMap> {
    inflight ??= fetchQuotes(mints)
      .then((quotes) => {
        const next: PriceMap = {};
        for (const [mint, q] of Object.entries(quotes)) {
          const id = byMint[mint];
          if (!id) continue;
          const prev = last?.[id]?.price;
          next[id] = { id, price: q.price, change24h: q.change24h, dir: prev === undefined || prev === q.price ? 0 : q.price > prev ? 1 : -1 };
        }
        // Keep stocks the API skipped this round.
        last = { ...(last ?? {}), ...next };
        lastAt = Date.now();
        for (const l of listeners) l(last);
        return last;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  /** Polls every second while visible. Doubles the wait after a failure (e.g. rate limit), resets on success. */
  function loop() {
    clearTimeout(timer);
    if (listeners.size === 0) return;
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    const run = hidden
      ? Promise.resolve()
      : poll().then(
          () => {
            delay = PRICE_SOURCE.pollMs;
          },
          () => {
            delay = Math.min(delay * 2, PRICE_SOURCE.maxPollMs);
          },
        );
    void run.then(() => {
      if (listeners.size > 0) timer = setTimeout(loop, hidden ? 2000 : delay);
    });
  }

  return {
    /** Latest prices, fetched if missing or stale. Rejects only if nothing was ever loaded. */
    async latest(): Promise<PriceMap> {
      if (last && Date.now() - lastAt < PRICE_SOURCE.pollMs) return last;
      try {
        return await poll();
      } catch (e) {
        if (last) return last;
        throw e;
      }
    },
    peek: () => last,
    subscribe(listener: (p: PriceMap) => void): () => void {
      listeners.add(listener);
      if (last) listener(last);
      if (listeners.size === 1) loop();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) clearTimeout(timer);
      };
    },
  };
}
