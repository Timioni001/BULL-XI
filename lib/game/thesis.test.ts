import { describe, expect, it } from "vitest";
import { MOCK_STOCKS } from "@/lib/data/mock/stocks";
import { ABOUT } from "@/lib/data/about";
import { buildThesis, changeOver } from "./thesis";

const byId = new Map(MOCK_STOCKS.map((s) => [s.id, s]));
const squad = ["spyx", "gldx", "msftx", "jpmx", "unhx", "kox", "xomx", "nvdax", "pltrx", "llyx", "nflxx", "uberx", "tslax", "coinx", "sofix"].map((id) => byId.get(id)!);

describe("squad thesis", () => {
  it("has a fact for every stock in the universe", () => {
    for (const s of MOCK_STOCKS) expect(ABOUT[s.id], s.id).toBeTruthy();
  });
  it("explains every pick with its role and real moves only", () => {
    const t = buildThesis(squad.map((s) => ({ ...s, change24h: s.id === "nvdax" ? 2.34 : null })), { nvdax: 5.01 });
    expect(t.picks).toHaveLength(15);
    const nv = t.picks.find((p) => p.id === "nvdax")!;
    expect(nv.role).toBe("Midfield");
    expect(nv.reason).toContain("+2.3% today, +5.0% this week.");
    // no move claims when there is no data
    expect(t.picks.find((p) => p.id === "kox")!.reason).not.toMatch(/today|week/);
    expect(t.points[0]).toContain("sectors");
    expect(t.points.some((p) => p.includes("GLDx"))).toBe(true);
  });
  it("labels the squad by where the credits go", () => {
    expect(["steady", "balanced", "aggressive"]).toContain(buildThesis(squad).style);
  });
  it("measures change over a series", () => {
    expect(changeOver([{ price: 100 }, { price: 110 }])).toBeCloseTo(10);
    expect(changeOver([{ price: 100 }])).toBeNull();
  });
});
