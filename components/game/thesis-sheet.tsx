"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getStockChart, type Stock } from "@/lib/data";
import { copy } from "@/lib/copy";
import { buildThesis, changeOver } from "@/lib/game/thesis";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { StockAvatar } from "@/components/stock/stock-avatar";

const t = copy.thesis;
const pct = (v: number | null) => (v === null ? "-" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`);
const tone = (v: number | null) => (v === null ? "text-muted-foreground" : v >= 0 ? "text-bull" : "text-bear");

/** "Why this squad": the reasoning behind each pick, from real moves. */
export function ThesisSheet({ open, onOpenChange, squad }: { open: boolean; onOpenChange: (o: boolean) => void; squad: Stock[] }) {
  const prices = useLivePrices();
  const [weekly, setWeekly] = useState<Record<string, number | null>>({});
  const key = squad.map((s) => s.id).join(",");

  useEffect(() => {
    if (!open || !key) return;
    let alive = true;
    const ids = key.split(",").filter((id) => !(id in weekly));
    if (!ids.length) return;
    void (async () => {
      // A few at a time to stay friendly with the free chart API.
      for (let i = 0; i < ids.length; i += 4) {
        const batch = await Promise.all(ids.slice(i, i + 4).map(async (id) => [id, changeOver(await getStockChart(id, "1W").catch(() => []))] as const));
        if (!alive) return;
        setWeekly((w) => ({ ...w, ...Object.fromEntries(batch) }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const loading = open && squad.some((s) => !(s.id in weekly));
  const thesis = useMemo(
    () => buildThesis(squad.map((s) => ({ ...s, change24h: prices?.[s.id]?.change24h ?? s.change24h })), weekly),
    [squad, prices, weekly],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.title}>
      <div className="flex flex-col gap-4 pb-2">
        <section className="rounded-3xl bg-surface-2 p-4 ring-1 ring-inset ring-hairline">
          <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-foreground">{t.style[thesis.style]}</span>
          <p className="mt-3 text-[15px] font-semibold leading-snug">{thesis.headline}</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {thesis.points.map((p) => (
              <li key={p} className="flex gap-2 text-[13px] text-muted-foreground">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.picks}</p>
          {loading && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> {t.loadingWeek}
            </span>
          )}
        </div>
        <ul className="flex flex-col gap-2">
          {thesis.picks.map((p) => (
            <li key={p.id} className="rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline">
              <div className="flex items-center gap-3">
                <StockAvatar ticker={p.ticker} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[15px] font-semibold">
                    {p.ticker}
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{p.role}</span>
                  </p>
                  <p className="text-[12px] text-muted-foreground">{p.about}.</p>
                </div>
                <div className="text-right">
                  <p className={cn("num text-sm font-semibold", tone(p.today))}>{pct(p.today)}</p>
                  <p className="text-[10px] text-muted-foreground">{t.today}</p>
                  <p className={cn("num mt-1 text-sm font-semibold", tone(p.week))}>{pct(p.week)}</p>
                  <p className="text-[10px] text-muted-foreground">{t.week}</p>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-snug">{p.reason}</p>
            </li>
          ))}
        </ul>
        <p className="px-1 text-xs text-muted-foreground">{t.method}</p>
        <p className="px-1 text-xs text-muted-foreground">{t.disclaimer}</p>
      </div>
    </Sheet>
  );
}
