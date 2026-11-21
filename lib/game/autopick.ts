import type { Position, SquadSlots, Stock } from "@/lib/data/types";
import { BUDGET, MAX_PER_SECTOR, POSITIONS, canAddToSquad, emptySquad, sumCredits } from "./rules";

/**
 * Fill every empty slot with a valid pick, keeping the manager's existing picks.
 * Pure: randomness comes from `rng` so tests can seed it.
 *
 * Strategy: randomized greedy. For each empty slot, the most it may spend is
 * whatever leaves enough credits to fill the remaining slots with the cheapest
 * legal stocks. Within that ceiling it prefers in-form, popular stocks that use
 * the budget well. Retries a few times, then falls back to a cheapest fill.
 */
export function autoPick(stocks: Stock[], current: SquadSlots, rng: () => number = Math.random): SquadSlots {
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = tryFill(stocks, current, rng, attempt >= 30);
    if (result) return result;
  }
  // Existing picks make a valid squad impossible (e.g. over budget). Start fresh.
  return tryFill(stocks, emptySquad(), rng, true) ?? current;
}

function tryFill(stocks: Stock[], current: SquadSlots, rng: () => number, cheapest: boolean): SquadSlots | null {
  const byId = new Map(stocks.map((s) => [s.id, s]));
  const slots: SquadSlots = {
    ETF: [...current.ETF],
    BLUE: [...current.BLUE],
    GROWTH: [...current.GROWTH],
    RISK: [...current.RISK],
  };
  const picked: Stock[] = POSITIONS.flatMap((p) => slots[p].flatMap((id) => (id && byId.get(id) ? [byId.get(id)!] : [])));

  // Fill expensive positions first so premiums get a chance.
  const order: Position[] = ["RISK", "GROWTH", "BLUE", "ETF"];
  const empties: { pos: Position; idx: number }[] = [];
  for (const pos of order) slots[pos].forEach((id, idx) => id === null && empties.push({ pos, idx }));
  // Interleave a little so one position doesn't eat the whole budget.
  shuffleInPlace(empties, rng, 0.35);

  for (let i = 0; i < empties.length; i++) {
    const { pos, idx } = empties[i];
    const remaining = empties.slice(i + 1);
    const left = BUDGET - sumCredits(picked);
    const reserve = minCostToFill(stocks, picked, remaining.map((e) => e.pos));
    const ceiling = left - reserve;

    const candidates = stocks.filter((s) => s.position === pos && s.credits <= ceiling + 1e-9 && canAddToSquad(picked, s).ok);
    if (candidates.length === 0) return null;

    let choice: Stock;
    if (cheapest) {
      choice = candidates.reduce((a, b) => (b.credits < a.credits ? b : a));
    } else {
      const target = Math.min(ceiling, (left / (remaining.length + 1)) * 1.12);
      const weights = candidates.map((s) => {
        const quality = 1 + Math.max(0, s.form) / 12 + s.ownership / 25;
        const fit = Math.exp(-Math.abs(s.credits - target) / 2.2);
        return quality * (0.25 + fit) * (0.5 + rng());
      });
      choice = weightedPick(candidates, weights, rng);
    }
    slots[pos][idx] = choice.id;
    picked.push(choice);
  }
  return slots;
}

/** Cheapest way to fill `positions` given what's already picked (respects sector caps greedily). */
function minCostToFill(stocks: Stock[], picked: Stock[], positions: Position[]): number {
  if (positions.length === 0) return 0;
  const need: Record<Position, number> = { ETF: 0, BLUE: 0, GROWTH: 0, RISK: 0 };
  for (const p of positions) need[p]++;
  const pickedIds = new Set(picked.map((s) => s.id));
  const sectorCount = new Map<string, number>();
  for (const s of picked) sectorCount.set(s.sector, (sectorCount.get(s.sector) ?? 0) + 1);

  let total = 0;
  for (const pos of POSITIONS) {
    if (need[pos] === 0) continue;
    const pool = stocks.filter((s) => s.position === pos && !pickedIds.has(s.id)).sort((a, b) => a.credits - b.credits);
    let got = 0;
    for (const s of pool) {
      if (got === need[pos]) break;
      const c = sectorCount.get(s.sector) ?? 0;
      if (c >= MAX_PER_SECTOR) continue;
      sectorCount.set(s.sector, c + 1);
      total += s.credits;
      got++;
    }
    if (got < need[pos]) return Infinity;
  }
  return total;
}

function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shuffleInPlace<T>(arr: T[], rng: () => number, strength: number) {
  for (let i = arr.length - 1; i > 0; i--) {
    if (rng() > strength) continue;
    const j = Math.max(0, i - 1 - Math.floor(rng() * 3));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
