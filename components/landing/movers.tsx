"use client";

import { useState } from "react";
import type { Stock } from "@/lib/data/types";
import { copy } from "@/lib/copy";
import { pct, signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StockArt } from "@/components/stock/stock-art";
import { LogoTile } from "./logo-tile";

/** Dark "top movers" strip with a Today / Last 5 GWs toggle. */
export function Movers({ stocks }: { stocks: Stock[] }) {
  const [mode, setMode] = useState<"day" | "form">("day");
  const L = copy.landing;
  const ranked = [...stocks]
    .sort((a, b) => (mode === "day" ? b.change24h - a.change24h : sum(b) - sum(a)))
    .slice(0, 3);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="font-headline text-[36px] leading-none lg:text-[48px]">{L.moversTitle}</h2>
        <div role="tablist" className="flex rounded-full bg-white/10 p-1">
          {(["day", "form"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn("h-9 rounded-full px-4 text-[13px] font-semibold transition-colors", mode === m ? "bg-white text-black" : "text-white/70 hover:text-white")}
            >
              {L.moversToggle[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="no-scrollbar -mx-5 mt-8 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {ranked.map((s) => {
          const value = mode === "day" ? s.change24h : sum(s);
          return (
            <article key={s.id} className="w-[78%] shrink-0 snap-start overflow-hidden rounded-[28px] bg-[#111] ring-1 ring-white/10 md:w-auto">
              <StockArt ticker={s.ticker} sector={s.sector} className="m-2 h-[230px] rounded-[22px]">
                <div className="grid h-full place-items-center">
                  <LogoTile ticker={s.ticker} size={96} />
                </div>
              </StockArt>
              <div className="flex items-end justify-between px-5 pb-5 pt-3">
                <div className="min-w-0">
                  <p className="truncate font-headline text-[24px]">{s.name}</p>
                  <p className="font-mono text-xs text-white/60">{s.ticker}</p>
                </div>
                <span className={cn("num rounded-full px-3 py-1.5 text-sm font-bold", value >= 0 ? "bg-bull text-black" : "bg-bear text-white")}>
                  {mode === "day" ? pct(value, 1) : `${signed(value)} ${L.moversPts}`}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const sum = (s: Stock) => s.recentPoints.reduce((a, b) => a + b, 0);
