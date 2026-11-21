import { describe, expect, it } from "vitest";
import type { Lineup, Position, SquadSlots, Stock } from "@/lib/data/types";
import { MOCK_STOCKS } from "@/lib/data/mock/stocks";
import { mulberry32 } from "@/lib/data/mock/rng";
import {
  applyAutoSubs,
  basePoints,
  canAddToSquad,
  canPlayChip,
  defaultLineup,
  effectiveCaptain,
  emptySquad,
  formation,
  isValidFormation,
  nextFreeTransfers,
  percentChange,
  scoreGameweek,
  scoreStock,
  setCaptain,
  setVice,
  squadAfterGameweek,
  squadHints,
  squadIds,
  swapInLineup,
  transferCost,
  twap,
  validateLineup,
  validateSquad,
} from "./rules";
import { autoPick } from "./autopick";

/* ---------------- fixtures ---------------- */

let n = 0;
function stock(position: Position, credits: number, sector: Stock["sector"] = "Big Tech", id?: string): Stock {
  n++;
  return {
    id: id ?? `s${n}`,
    mint: "",
    ticker: `T${n}x`,
    name: `Stock ${n}`,
    sector,
    position,
    credits,
    price: 100,
    change24h: 0,
    ownership: 10,
    form: 5,
    recentPoints: [0, 0, 0, 0, 0],
  };
}

/** A valid 15 stock squad costing 85.0 credits across 6 sectors. */
function validSquad(): Stock[] {
  return [
    stock("ETF", 5.5, "Index", "etf1"),
    stock("ETF", 4.5, "Index", "etf2"),
    stock("BLUE", 8.0, "Big Tech", "b1"),
    stock("BLUE", 7.0, "Big Tech", "b2"),
    stock("BLUE", 6.0, "Finance", "b3"),
    stock("BLUE", 5.0, "Health", "b4"),
    stock("BLUE", 4.5, "Consumer", "b5"),
    stock("GROWTH", 9.0, "Chips", "g1"),
    stock("GROWTH", 7.0, "Chips", "g2"),
    stock("GROWTH", 6.0, "Software", "g3"),
    stock("GROWTH", 5.5, "Software", "g4"),
    stock("GROWTH", 5.0, "Health", "g5"),
    stock("RISK", 4.5, "Crypto", "r1"),
    stock("RISK", 4.0, "Crypto", "r2"),
    stock("RISK", 3.5, "Finance", "r3"),
  ];
}

function slotsOf(stocks: Stock[]): SquadSlots {
  const slots = emptySquad();
  const idx: Record<Position, number> = { ETF: 0, BLUE: 0, GROWTH: 0, RISK: 0 };
  for (const s of stocks) slots[s.position][idx[s.position]++] = s.id;
  return slots;
}

function ctx(stocks: Stock[]) {
  const byId = new Map(stocks.map((s) => [s.id, s]));
  return {
    posOf: (id: string) => byId.get(id)?.position,
    creditsOf: (id: string) => byId.get(id)?.credits ?? 0,
  };
}

/* ---------------- squad validation ---------------- */

describe("validateSquad", () => {
  it("accepts a valid 15 stock squad", () => {
    const v = validateSquad(validSquad());
    expect(v.valid).toBe(true);
    expect(v.complete).toBe(true);
    expect(v.creditsUsed).toBe(85);
    expect(v.creditsLeft).toBe(15);
  });

  it("reports missing positions with plain hints", () => {
    const squad = validSquad().filter((s) => s.id !== "g5" && s.id !== "r3");
    const v = validateSquad(squad);
    expect(v.valid).toBe(false);
    expect(squadHints(v)).toEqual(["Need 1 more Growth", "Need 1 more High Risk"]);
  });

  it("pluralises hints", () => {
    const v = validateSquad([]);
    expect(squadHints(v)).toContain("Need 2 more ETFs");
    expect(squadHints(v)).toContain("Need 5 more Blue Chips");
  });

  it("flags more than 3 from one sector", () => {
    const squad = validSquad();
    squad[4] = { ...squad[4], sector: "Big Tech" }; // b3 -> 3rd Big Tech
    squad[5] = { ...squad[5], sector: "Big Tech" }; // b4 -> 4th Big Tech
    const v = validateSquad(squad);
    expect(v.issues).toContainEqual({ code: "sector_limit", sector: "Big Tech", count: 4 });
    expect(squadHints(v)[0]).toBe("Max 3 from Big Tech. You have 4");
  });

  it("flags over budget without float drift", () => {
    const squad = validSquad();
    squad[7] = { ...squad[7], credits: 24.1 }; // +15.1
    const v = validateSquad(squad);
    expect(v.creditsLeft).toBe(-0.1);
    expect(v.issues).toContainEqual({ code: "over_budget", over: 0.1 });
    expect(squadHints(v)[0]).toBe("0.1 credits over budget");
  });

  it("flags too many in a position and duplicates", () => {
    const squad = [...validSquad(), stock("RISK", 1, "Energy")];
    expect(validateSquad(squad).issues).toContainEqual({ code: "too_many_position", position: "RISK", extra: 1 });
    const dup = [...validSquad().slice(0, 14), validSquad()[0]];
    expect(validateSquad(dup).issues.some((i) => i.code === "duplicate")).toBe(true);
  });
});

describe("canAddToSquad", () => {
  const squad = validSquad();
  it("blocks a stock already in the squad", () => {
    expect(canAddToSquad(squad.slice(0, 5), squad[0])).toMatchObject({ ok: false, code: "in_squad" });
  });
  it("blocks a full position", () => {
    expect(canAddToSquad(squad, stock("ETF", 1, "Energy"))).toMatchObject({ ok: false, code: "position_full" });
  });
  it("blocks a 4th stock from one sector", () => {
    const partial = squad.filter((s) => s.position !== "GROWTH");
    const chips = partial.concat([stock("GROWTH", 1, "Chips"), stock("GROWTH", 1, "Chips"), stock("GROWTH", 1, "Chips")]);
    expect(canAddToSquad(chips, stock("GROWTH", 1, "Chips"))).toMatchObject({ ok: false, code: "sector_full" });
  });
  it("blocks a stock you can't afford and says by how much", () => {
    const partial = squad.filter((s) => s.id !== "g1"); // 76 used, 24 left
    expect(canAddToSquad(partial, stock("GROWTH", 24, "Energy")).ok).toBe(true);
    expect(canAddToSquad(partial, stock("GROWTH", 24.5, "Energy"))).toEqual({ ok: false, code: "over_budget", reason: "0.5 over" });
  });
});

/* ---------------- lineup ---------------- */

describe("lineup", () => {
  const squad = validSquad();
  const { posOf, creditsOf } = ctx(squad);
  const lineup = defaultLineup(slotsOf(squad), creditsOf);

  it("builds a valid default 4-4-2 with the priciest captain", () => {
    expect(validateLineup(lineup, posOf)).toEqual({ valid: true, issues: [] });
    expect(formation(lineup.starters, posOf)).toBe("4-4-2");
    expect(lineup.captainId).toBe("g1");
    expect(lineup.viceId).toBe("b1");
    expect(lineup.bench[0]).toBe("etf2");
  });

  it("enforces XI limits", () => {
    const twoKeepers = lineup.starters.map((id) => (id === "r1" ? "etf2" : id));
    expect(isValidFormation(twoKeepers, posOf)).toBe(false);
    expect(isValidFormation(lineup.starters.slice(0, 10), posOf)).toBe(false);
  });

  it("swaps bench and starter when formation stays legal", () => {
    const next = swapInLineup(lineup, "b4", "b5", posOf)!; // b4 starter, b5 bench
    expect(next.starters).toContain("b5");
    expect(next.bench).toContain("b4");
    expect(formation(next.starters, posOf)).toBe("4-4-2");
  });

  it("allows formation changes within limits (4-4-2 -> 3-5-2)", () => {
    const next = swapInLineup(lineup, "b4", "g5", posOf)!;
    expect(formation(next.starters, posOf)).toBe("3-5-2");
  });

  it("rejects swaps that break the formation", () => {
    // Swapping the only starting ETF for a Blue Chip leaves 0 ETFs.
    expect(swapInLineup(lineup, "etf1", "b5", posOf)).toBeNull();
    // 3-5-2 then removing another Blue Chip -> 2 Blue Chips
    const t352 = swapInLineup(lineup, "b4", "g5", posOf)!;
    expect(swapInLineup(t352, "b3", "r3", posOf)).toBeNull();
    // two starters can't swap
    expect(swapInLineup(lineup, "b1", "g1", posOf)).toBeNull();
  });

  it("reorders outfield bench but keeps the reserve ETF first", () => {
    const next = swapInLineup(lineup, "b5", "g5", posOf)!;
    expect(next.bench.slice(1, 3)).toEqual(["g5", "b5"]);
    expect(swapInLineup(lineup, "etf2", "b5", posOf)).toBeNull();
  });

  it("passes the armband to the incoming stock", () => {
    const capOnBench = swapInLineup(lineup, "g1", "g5", posOf)!;
    expect(capOnBench.captainId).toBe("g5");
  });

  it("sets captain and vice, swapping roles if needed", () => {
    expect(setCaptain(lineup, "r1").captainId).toBe("r1");
    const swapped = setCaptain(lineup, lineup.viceId);
    expect(swapped.captainId).toBe("b1");
    expect(swapped.viceId).toBe("g1");
    const v = setVice(lineup, lineup.captainId);
    expect(v.viceId).toBe("g1");
    expect(v.captainId).toBe("b1");
    // bench stock can't be captain
    expect(setCaptain(lineup, "b5")).toBe(lineup);
  });

  it("reports captain problems", () => {
    const bad: Lineup = { ...lineup, captainId: "b5", viceId: "b5" };
    const { issues } = validateLineup(bad, posOf);
    expect(issues).toEqual(expect.arrayContaining(["captain_not_starter", "vice_not_starter", "captain_is_vice"]));
  });
});

/* ---------------- scoring ---------------- */

describe("scoring", () => {
  it("converts % change to points (x10, rounded)", () => {
    expect(basePoints(1.8)).toBe(18);
    expect(basePoints(-2.0)).toBe(-20);
    expect(basePoints(0.04)).toBe(0);
    expect(basePoints(0.05)).toBe(1);
    expect(basePoints(-0.05)).toBe(-1);
    expect(basePoints(-0.04)).toBe(0);
    expect(Object.is(basePoints(-0.01), -0)).toBe(false);
  });

  it("caps at +50 / -50", () => {
    expect(basePoints(7.3)).toBe(50);
    expect(basePoints(-12)).toBe(-50);
  });

  it("computes percent change", () => {
    expect(percentChange(100, 101.8)).toBeCloseTo(1.8);
    expect(percentChange(0, 5)).toBe(0);
  });

  it("uses time-weighted average price", () => {
    // 100 for 9 units, 200 for 1 unit => 110
    expect(twap([{ t: 0, price: 100 }, { t: 9, price: 200 }], 10)).toBe(110);
    // a single late spike barely moves TWAP
    expect(twap([{ t: 0, price: 100 }, { t: 59, price: 150 }, { t: 60, price: 100 }])).toBeCloseTo(100.833, 2);
    expect(twap([])).toBe(0);
    expect(twap([{ t: 5, price: 42 }])).toBe(42);
  });

  it("adds +2 for beating SPYx by 0.5 points or more", () => {
    expect(scoreStock({ pct: 1.2, benchmarkPct: 0.5 })).toEqual({ base: 12, bonus: 2, points: 14 });
    expect(scoreStock({ pct: 1.0, benchmarkPct: 0.5 })).toEqual({ base: 10, bonus: 2, points: 12 });
    // beating the market by less than 0.5 points earns nothing
    expect(scoreStock({ pct: 0.9, benchmarkPct: 0.5 })).toEqual({ base: 9, bonus: 0, points: 9 });
    expect(scoreStock({ pct: 0.5, benchmarkPct: 0.5 })).toEqual({ base: 5, bonus: 0, points: 5 });
    // a falling stock still beats a falling-harder market
    expect(scoreStock({ pct: -0.5, benchmarkPct: -1.5 })).toEqual({ base: -5, bonus: 2, points: -3 });
    expect(scoreStock({ pct: 3, benchmarkPct: 1, isBenchmark: true }).bonus).toBe(0);
  });

  it("adds +2 for the mini-league top gainer, on top of the market bonus", () => {
    expect(scoreStock({ pct: 1.2, benchmarkPct: 0.5, isTopGainer: true })).toEqual({ base: 12, bonus: 4, points: 16 });
    expect(scoreStock({ pct: 0.6, benchmarkPct: 0.5, isTopGainer: true })).toEqual({ base: 6, bonus: 2, points: 8 });
  });

  it("hedge turns negative points into 0 but keeps gains", () => {
    expect(scoreStock({ pct: -3, benchmarkPct: 0, hedged: true }).points).toBe(0);
    expect(scoreStock({ pct: 2, benchmarkPct: 0, hedged: true }).points).toBe(22);
  });
});

describe("scoreGameweek", () => {
  const squad = validSquad();
  const { posOf, creditsOf } = ctx(squad);
  const lineup = defaultLineup(slotsOf(squad), creditsOf);
  // every stock +1% except captain g1 +2% and benchmark etf1 +0.5%
  const pct: Record<string, number> = Object.fromEntries(squad.map((s) => [s.id, 1]));
  pct.g1 = 2;
  pct.etf1 = 0.5;

  it("doubles the captain and ignores the bench", () => {
    const r = scoreGameweek({ lineup, posOf, pct, benchmarkId: "etf1" });
    // 9 normal starters x (10 + 2) = 108, etf1 = 5, captain (20 + 2) x2 = 44
    expect(r.total).toBe(108 + 5 + 44);
    expect(r.perStock.g1).toMatchObject({ multiplier: 2, counted: 44 });
    expect(r.perStock.b5.counted).toBe(0);
  });

  it("triple captain scores 3x", () => {
    const r = scoreGameweek({ lineup, posOf, pct, benchmarkId: "etf1", chip: "tripleCaptain" });
    expect(r.perStock.g1.counted).toBe(66);
  });

  it("bench boost counts the bench", () => {
    const r = scoreGameweek({ lineup, posOf, pct, benchmarkId: "etf1", chip: "benchBoost" });
    expect(r.total).toBe(108 + 5 + 44 + 4 * 12);
  });

  it("hedge protects one stock", () => {
    const down = { ...pct, r1: -4 };
    const plain = scoreGameweek({ lineup, posOf, pct: down, benchmarkId: "etf1" });
    const hedged = scoreGameweek({ lineup, posOf, pct: down, benchmarkId: "etf1", chip: "hedge", hedgeId: "r1" });
    expect(plain.perStock.r1.counted).toBe(-40);
    expect(hedged.perStock.r1.counted).toBe(0);
  });

  it("vice takes over only if the captain is halted, and auto-subs come in", () => {
    const r = scoreGameweek({ lineup, posOf, pct, benchmarkId: "etf1", halted: new Set(["g1"]) });
    expect(r.captainId).toBe("b1");
    expect(r.perStock.b1.multiplier).toBe(2);
    expect(r.starters).not.toContain("g1");
    expect(r.starters).toContain("b5"); // first outfield bench stock keeping formation legal
  });

  it("subtracts transfer hits", () => {
    const r = scoreGameweek({ lineup, posOf, pct, benchmarkId: "etf1", transferHit: 8 });
    expect(r.total).toBe(108 + 5 + 44 - 8);
  });

  it("auto-subs skip bench stocks that would break the formation", () => {
    // halt the starting ETF: only the reserve ETF can replace it
    const { starters } = applyAutoSubs(lineup, new Set(["etf1"]), posOf);
    expect(starters).toContain("etf2");
    expect(effectiveCaptain(lineup, new Set(["g1", "b1"]))).toBeNull();
  });
});

/* ---------------- transfers ---------------- */

describe("transfers", () => {
  it("first transfer is free, extras cost -4", () => {
    expect(transferCost(1, 1)).toBe(0);
    expect(transferCost(2, 1)).toBe(4);
    expect(transferCost(3, 2)).toBe(4);
    expect(transferCost(4, 1)).toBe(12);
  });
  it("wildcard and free hit make all transfers free", () => {
    expect(transferCost(9, 1, "wildcard")).toBe(0);
    expect(transferCost(9, 1, "freeHit")).toBe(0);
  });
  it("banks up to 2 free transfers", () => {
    expect(nextFreeTransfers(1, 0)).toBe(2);
    expect(nextFreeTransfers(2, 0)).toBe(2);
    expect(nextFreeTransfers(2, 1)).toBe(2);
    expect(nextFreeTransfers(1, 1)).toBe(1);
    expect(nextFreeTransfers(1, 3)).toBe(1);
    expect(nextFreeTransfers(2, 5, "wildcard")).toBe(2);
  });
});

/* ---------------- chips ---------------- */

describe("chips", () => {
  const squad = validSquad();
  const { creditsOf } = ctx(squad);
  const lineup = defaultLineup(slotsOf(squad), creditsOf);

  it("each chip once per season", () => {
    expect(canPlayChip({ chip: "wildcard", used: [] })).toEqual({ ok: true });
    expect(canPlayChip({ chip: "wildcard", used: ["wildcard"] })).toMatchObject({ ok: false });
  });
  it("one chip per gameweek", () => {
    expect(canPlayChip({ chip: "benchBoost", used: [], activeThisGameweek: "tripleCaptain" })).toMatchObject({ ok: false, reason: "One chip per gameweek" });
  });
  it("hedge needs a starting stock", () => {
    expect(canPlayChip({ chip: "hedge", used: [] })).toMatchObject({ ok: false });
    expect(canPlayChip({ chip: "hedge", used: [], hedgeId: lineup.bench[1], lineup })).toMatchObject({ ok: false });
    expect(canPlayChip({ chip: "hedge", used: [], hedgeId: lineup.starters[1], lineup })).toEqual({ ok: true });
  });
  it("free hit squad reverts after the gameweek", () => {
    expect(squadAfterGameweek({ chip: "freeHit", before: "A", during: "B" })).toBe("A");
    expect(squadAfterGameweek({ chip: "wildcard", before: "A", during: "B" })).toBe("B");
    expect(squadAfterGameweek({ before: "A", during: "B" })).toBe("B");
  });
});

/* ---------------- auto-pick ---------------- */

describe("autoPick", () => {
  it("always builds a valid squad from the mock market", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const slots = autoPick(MOCK_STOCKS, emptySquad(), mulberry32(seed));
      const ids = squadIds(slots);
      const picked = ids.map((id) => MOCK_STOCKS.find((s) => s.id === id)!);
      const v = validateSquad(picked);
      expect(v.valid, `seed ${seed}: ${squadHints(v).join(", ")}`).toBe(true);
    }
  });

  it("uses most of the budget", () => {
    let total = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const ids = squadIds(autoPick(MOCK_STOCKS, emptySquad(), mulberry32(seed)));
      total += validateSquad(ids.map((id) => MOCK_STOCKS.find((s) => s.id === id)!)).creditsUsed;
    }
    expect(total / 100).toBeGreaterThan(92);
  });

  it("keeps the manager's picks", () => {
    const start = emptySquad();
    start.GROWTH[0] = "nvdax";
    start.RISK[2] = "tslax";
    const slots = autoPick(MOCK_STOCKS, start, mulberry32(7));
    expect(slots.GROWTH[0]).toBe("nvdax");
    expect(slots.RISK[2]).toBe("tslax");
    expect(squadIds(slots)).toHaveLength(15);
  });

  it("is deterministic for a given seed", () => {
    expect(autoPick(MOCK_STOCKS, emptySquad(), mulberry32(42))).toEqual(autoPick(MOCK_STOCKS, emptySquad(), mulberry32(42)));
  });
});

describe("real stock universe", () => {
  it("auto-pick builds a valid squad from the 41 live stocks", () => {
    expect(MOCK_STOCKS).toHaveLength(41);
    for (let seed = 1; seed <= 50; seed++) {
      const slots = autoPick(MOCK_STOCKS, emptySquad(), mulberry32(seed));
      const picked = squadIds(slots).map((id) => MOCK_STOCKS.find((s) => s.id === id)!);
      expect(validateSquad(picked).valid).toBe(true);
    }
  });
});
