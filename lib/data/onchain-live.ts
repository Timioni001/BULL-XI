/**
 * Live gameweek from real onchain data, for managers whose squad is sealed
 * onchain. Same scoring as the simulated session (live-scorer.ts), but:
 *   - the table is every squad revealed in this gameweek on the Private ER
 *   - opening prices are the gameweek's onchain opening TWAP (provisional
 *     until the opening window closes)
 *   - current prices are the live xStock prices; at full time the onchain
 *     closing TWAP, exactly what settlement uses
 */
import { address } from "@solana/kit";
import { config } from "@/lib/config";
import { ENTRY_STATUS, GW_STATUS, NO_STOCK, decodeName, listEntries, readGameweek, readManager, stockId } from "@/lib/onchain/game";
import { PRICE_BOOK_STOCKS } from "@/lib/onchain/universe";
import { percentChange } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { createLiveScorer, type ScoredManager } from "./live-scorer";
import { BENCHMARK_ID, MOCK_STOCKS_BY_ID } from "./mock/stocks";
import type { ChipId, Gameweek, Lineup, LiveGameweekSnapshot, PriceMap } from "./types";

export interface OnchainLiveInput {
  gameweek: Gameweek;
  lineup: Lineup;
  chip?: ChipId | null;
  hedgeId?: string | null;
  kickoffAt: number;
  teamName?: string;
  transferHit?: number;
  onchain: { gameweek: number; address: string };
}

const CHIPS: (ChipId | null)[] = [null, "tripleCaptain", "benchBoost", "hedge", "wildcard", "freeHit"];
const REFRESH_MS = 20_000;
const posOf = (id: string) => MOCK_STOCKS_BY_ID[id]?.position;
const tickerOf = (id: string) => MOCK_STOCKS_BY_ID[id]?.ticker ?? id;
const micro = (v: bigint | number) => Number(v) / 1_000_000;

export function startOnchainLiveSession(
  input: OnchainLiveInput,
  subscribePrices: (l: (p: PriceMap) => void) => () => void,
  onSnapshot: (s: LiveGameweekSnapshot) => void,
  onError?: (e: Error) => void,
): () => void {
  const me = input.onchain.address;
  const you: ScoredManager = { id: me, name: "You", team: input.teamName ?? "Your XI", seasonPoints: 0, lastRank: 0, lineup: input.lineup, isYou: true };
  const scorer = createLiveScorer(
    { ...input, benchmarkId: BENCHMARK_ID, leagueName: copy.live.everyone, posOf, tickerOf },
    [you],
  );
  const names = new Map<string, { name: string; team: string; season: number }>();
  let open: Record<string, number> | null = null;
  let close: Record<string, number> | null = null;
  const provisional: Record<string, number> = {};
  let live: PriceMap | null = null;
  let prevPct: Record<string, number> = {};
  let stopped = false;

  const twapMap = (arr: ArrayLike<bigint | number>) => {
    const out: Record<string, number> = {};
    PRICE_BOOK_STOCKS.forEach(([t], i) => {
      const v = micro(arr[i] ?? 0);
      if (v > 0) out[t.toLowerCase()] = v;
    });
    return out;
  };

  const emit = () => {
    if (stopped) return;
    const pct: Record<string, number> = {};
    for (const id of scorer.stockIds()) {
      const now = close?.[id] ?? live?.[id]?.price;
      if (now === undefined) continue;
      if (!open?.[id] && provisional[id] === undefined) provisional[id] = now;
      pct[id] = percentChange(open?.[id] ?? provisional[id], now);
    }
    onSnapshot(scorer.snapshot(pct, prevPct, Date.now()));
    prevPct = pct;
  };

  async function refresh() {
    try {
      const g = await readGameweek(config.teeRpc, input.onchain.gameweek);
      if (!g) throw new Error("This gameweek isn't onchain yet");
      if (g.status >= GW_STATUS.live) open = twapMap(g.openTwap);
      if (g.status === GW_STATUS.final) close = twapMap(g.closeTwap);
      scorer.setGolden(g.golden !== NO_STOCK ? stockId(g.golden) : null);

      const entries = await listEntries(config.teeRpc, input.onchain.gameweek);
      const rivals = entries.filter((e) => e.data.status >= ENTRY_STATUS.revealed && e.data.authority !== me);
      await Promise.all(
        rivals
          .filter((e) => !names.has(e.data.authority))
          .map(async (e) => {
            const m = await readManager(config.teeRpc, address(e.data.authority)).catch(() => null);
            names.set(e.data.authority, m ? { name: decodeName(m.name), team: decodeName(m.team), season: Number(m.totalPoints) } : { name: "Manager", team: "XI", season: 0 });
          }),
      );
      const managers: ScoredManager[] = rivals.map((e) => {
        const n = names.get(e.data.authority)!;
        const ids = (a: ArrayLike<number>) => Array.from(a, stockId);
        return {
          id: e.data.authority,
          name: n.name,
          team: n.team,
          // A settled entry is already in the season total.
          seasonPoints: n.season - (e.data.status === ENTRY_STATUS.settled ? e.data.points : 0),
          lastRank: 0,
          lineup: { starters: ids(e.data.starters), bench: ids(e.data.bench), captainId: stockId(e.data.captain), viceId: stockId(e.data.vice) },
          chip: CHIPS[e.data.chip] ?? null,
          hedgeId: e.data.chip === 3 ? stockId(e.data.hedge) : null,
          transferHit: e.data.transferHit,
        };
      });
      scorer.setManagers([you, ...managers]);
      emit();
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  const unsubscribe = subscribePrices((p) => {
    live = p;
    emit();
  });
  void refresh();
  const timer = setInterval(() => void refresh(), REFRESH_MS);
  return () => {
    stopped = true;
    unsubscribe();
    clearInterval(timer);
  };
}
