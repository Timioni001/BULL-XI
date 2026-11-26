/**
 * "Why this squad": a plain-language thesis for any 15-stock squad, built only
 * from facts we have: what each company does, its role in the formation, its
 * cost in credits, and real price moves (today, and this week when loaded).
 * No forecasts. Pure and unit tested.
 */
import { ABOUT } from "@/lib/data/about";
import type { Position, Stock } from "@/lib/data/types";

export interface PickReason {
  id: string;
  ticker: string;
  position: Position;
  role: string;
  about: string;
  reason: string;
  today: number | null;
  week: number | null;
}

export interface SquadThesis {
  style: "steady" | "balanced" | "aggressive";
  headline: string;
  points: string[];
  picks: PickReason[];
}

const ROLE: Record<Position, string> = { ETF: "Keeper", BLUE: "Defence", GROWTH: "Midfield", RISK: "Attack" };
const ROLE_WHY: Record<Position, string> = {
  ETF: "One holding buys a whole basket, so it steadies your squad.",
  BLUE: "Large and established, it usually moves less than growth names.",
  GROWTH: "A faster-growing business, so its price moves more, both ways.",
  RISK: "Among the biggest swings in your squad: it can win or lose a week on its own.",
};
// Gold and long bonds often move differently from stocks.
const DIVERSIFIERS = new Set(["gldx", "tltx"]);

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function moveClause(today: number | null, week: number | null): string {
  const parts: string[] = [];
  if (today !== null) parts.push(`${pct(today)} today`);
  if (week !== null) parts.push(`${pct(week)} this week`);
  return parts.length ? `${parts.join(", ")}.` : "";
}

export function buildThesis(stocks: Stock[], weekly: Record<string, number | null> = {}): SquadThesis {
  const total = stocks.reduce((a, s) => a + s.credits, 0) || 1;
  const risky = stocks.filter((s) => s.position === "GROWTH" || s.position === "RISK").reduce((a, s) => a + s.credits, 0);
  const riskShare = risky / total;
  const style: SquadThesis["style"] = riskShare < 0.45 ? "steady" : riskShare < 0.6 ? "balanced" : "aggressive";
  const sectors = new Set(stocks.map((s) => s.sector));
  const bySpend = [...stocks].sort((a, b) => b.credits - a.credits);
  const bigBets = bySpend.slice(0, 3);
  const withToday = stocks.filter((s) => s.change24h !== null);
  const up = withToday.filter((s) => (s.change24h ?? 0) > 0).length;
  const avgToday = withToday.length ? withToday.reduce((a, s) => a + (s.change24h ?? 0) * s.credits, 0) / withToday.reduce((a, s) => a + s.credits, 0) : null;
  const div = stocks.filter((s) => DIVERSIFIERS.has(s.id));

  const headline =
    style === "steady"
      ? "A steady squad: most of your credits sit in funds and large, established companies."
      : style === "balanced"
        ? "A balanced squad: steady funds and big companies at the back, growth and high-risk picks for upside."
        : "An aggressive squad: most of your credits are on growth and high-risk stocks that swing hard both ways.";

  const points = [
    `Spread across ${sectors.size} sectors, never more than 3 from one, so one bad industry can't sink you.`,
    `${Math.round((1 - riskShare) * 100)}% of credits on steadier picks (funds and blue chips), ${Math.round(riskShare * 100)}% on growth and high risk.`,
    `Biggest bets: ${bigBets.map((s) => `${s.ticker} (${s.credits.toFixed(1)})`).join(", ")}.`,
  ];
  if (div.length) points.push(`${div.map((s) => s.ticker).join(" and ")} often move differently from stocks, a cushion on red days.`);
  if (avgToday !== null) points.push(`Today ${up} of ${withToday.length} are up; weighted by credits the squad is ${pct(avgToday)}.`);

  const picks = stocks.map((s): PickReason => {
    const week = weekly[s.id] ?? null;
    const about = ABOUT[s.id] ?? s.name;
    const extra: string[] = [];
    if (DIVERSIFIERS.has(s.id)) extra.push("Often moves differently from stocks.");
    if (bigBets.some((b) => b.id === s.id)) extra.push(`One of your biggest bets at ${s.credits.toFixed(1)} credits.`);
    else if (s.credits <= 5) extra.push(`Costs only ${s.credits.toFixed(1)} credits, leaving room for bigger names.`);
    return {
      id: s.id,
      ticker: s.ticker,
      position: s.position,
      role: ROLE[s.position],
      about,
      reason: [ROLE_WHY[s.position], ...extra, moveClause(s.change24h, week)].filter(Boolean).join(" "),
      today: s.change24h,
      week,
    };
  });
  return { style, headline, points, picks };
}

/** % change from first to last point of a series (null if unusable). */
export function changeOver(points: { price: number }[]): number | null {
  if (points.length < 2) return null;
  const a = points[0].price;
  const b = points[points.length - 1].price;
  return a > 0 ? ((b - a) / a) * 100 : null;
}
