import type { ChartRange, PriceMap, PricePoint } from "../types";
import { MOCK_STOCKS, volatilityOf } from "./stocks";
import { hash01, hashString, mulberry32 } from "./rng";

/**
 * Simulated 24/7 market.
 *
 * Price is a pure function of (stock, time): a sum of sine "octaves" with
 * seeded phases plus per-second jitter. That makes the feed look like a random
 * walk while staying identical across reloads and components, so a live
 * gameweek keeps its points after a refresh.
 *
 * Moves are deliberately faster than real markets so the demo feels alive.
 */

interface Octave {
  period: number; // seconds
  amp: number; // fraction of price
  phase: number;
}

interface Profile {
  base: number;
  octaves: Octave[];
  jitter: number;
  seed: number;
}

const PERIODS = [37, 173, 661, 2711, 14_407, 86_413];
const AMPS = [0.0016, 0.0032, 0.0062, 0.011, 0.018, 0.026];

const PROFILES: Record<string, Profile> = Object.fromEntries(
  MOCK_STOCKS.map((s) => {
    const seed = hashString(s.ticker);
    const rng = mulberry32(seed ^ 0xa5a5a5);
    const vol = volatilityOf(s.position);
    const octaves = PERIODS.map((period, i) => ({
      period: period * (0.8 + rng() * 0.4),
      amp: AMPS[i] * vol * (0.6 + rng() * 0.8),
      phase: rng() * Math.PI * 2,
    }));
    return [s.id, { base: s.price, octaves, jitter: 0.0006 * vol, seed }];
  }),
);

export function priceAt(id: string, tMs: number): number {
  const p = PROFILES[id];
  if (!p) return 0;
  const t = tMs / 1000;
  let x = 0;
  for (const o of p.octaves) x += o.amp * Math.sin((2 * Math.PI * t) / o.period + o.phase);
  const sec = Math.floor(t);
  const j0 = hash01(p.seed, sec) - 0.5;
  const j1 = hash01(p.seed, sec + 1) - 0.5;
  const f = t - sec;
  x += p.jitter * (j0 + (j1 - j0) * f) * 2;
  return round(p.base * (1 + x), p.base < 50 ? 3 : 2);
}

export function snapshotPrices(tMs: number): PriceMap {
  const out: PriceMap = {};
  const sec = Math.floor(tMs / 1000) * 1000;
  for (const s of MOCK_STOCKS) {
    const now = priceAt(s.id, sec);
    const prev = priceAt(s.id, sec - 1000);
    const dayAgo = priceAt(s.id, sec - 86_400_000);
    out[s.id] = {
      id: s.id,
      price: now,
      change24h: round(((now - dayAgo) / dayAgo) * 100, 2),
      dir: now > prev ? 1 : now < prev ? -1 : 0,
    };
  }
  return out;
}

export function chartSeries(id: string, range: ChartRange, nowMs: number): PricePoint[] {
  const span = range === "1D" ? 86_400_000 : 7 * 86_400_000;
  const points = range === "1D" ? 96 : 168;
  const step = span / points;
  const end = Math.floor(nowMs / 1000) * 1000;
  return Array.from({ length: points + 1 }, (_, i) => {
    const t = end - span + i * step;
    return { t, price: priceAt(id, t) };
  });
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
