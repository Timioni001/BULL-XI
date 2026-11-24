"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, History as HistoryIcon, Sparkles } from "lucide-react";
import type { GameweekResult } from "@/lib/data/types";
import { getHistory } from "@/lib/data";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { ordinal, signed, tone } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { OnchainSeasonCard } from "@/components/game/onchain-season-card";
import { useGame } from "@/lib/store/game";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { PageHeader } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { ResultSheet } from "@/components/game/result-sheet";
import { PointsTicker } from "@/components/live/points-ticker";
import { EmptyState, ErrorState, Shimmer } from "@/components/states/states";

const t = copy.history;

export function History() {
  const history = useAsync(getHistory);
  const results = useGame((s) => s.results);
  const teamName = useGame((s) => s.teamName);
  const [open, setOpen] = useState<GameweekResult | null>(null);

  const entries: GameweekResult[] = useMemo(() => {
    const past = (history.data ?? []).map<GameweekResult>((h) => ({
      gameweek: h.gameweek,
      kind: h.kind,
      points: h.points,
      rank: h.rank,
      leagueName: "Office Legends",
      leagueSize: 12,
      bestPick: h.bestCaptain,
      captain: h.bestCaptain,
      teamName,
      chip: h.chip,
      finishedAt: h.gameweek,
    }));
    return [...results, ...[...past].reverse()];
  }, [history.data, results, teamName]);

  const total = entries.reduce((a, e) => a + e.points, 0);
  const avg = entries.length ? Math.round(total / entries.length) : 0;
  const best = entries.reduce<GameweekResult | null>((a, e) => (!a || e.points > a.points ? e : a), null);
  const peak = Math.max(10, ...entries.map((e) => Math.abs(e.points)));
  const chrono = [...entries].reverse();

  let body: React.ReactNode;
  if (history.status === "loading") {
    body = (
      <div className="flex flex-col gap-3" aria-busy>
        <Shimmer className="h-[220px] rounded-[28px]" />
        <Shimmer className="h-16 rounded-3xl" />
        <Shimmer className="h-16 rounded-3xl" />
      </div>
    );
  } else if (history.status === "error") {
    body = <ErrorState title={copy.errors.history.title} message={copy.errors.history.body} onRetry={history.retry} />;
  } else if (entries.length === 0) {
    body = <EmptyState icon={<HistoryIcon className="size-7 text-brand" />} title={t.emptyTitle} body={t.emptyBody} />;
  } else {
    body = (
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <section className="rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline lg:sticky lg:top-6">
          <p className="text-label font-semibold uppercase text-muted-foreground">{t.season}</p>
          <PointsTicker value={total} className="mt-1 block font-display text-mega font-bold tracking-tighter" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-surface-2 p-3 ring-1 ring-inset ring-hairline">
              <p className="text-[11px] text-muted-foreground">{t.average}</p>
              <p className="num font-display text-2xl font-bold">{avg}</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3 ring-1 ring-inset ring-hairline">
              <p className="text-[11px] text-muted-foreground">{t.best}</p>
              <p className="num font-display text-2xl font-bold">
                {best?.points} <span className="text-sm text-muted-foreground">{best && t.gw(best.gameweek)}</span>
              </p>
            </div>
          </div>
          <div className="mt-5 flex h-28 items-end gap-1.5" role="img" aria-label={t.season}>
            {chrono.map((e, i) => (
              <div key={`${e.gameweek}-${e.finishedAt}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, ease, delay: i * 0.05 }}
                  className={cn("w-full origin-bottom rounded-t-md", e.points >= 0 ? "bg-bull" : "bg-bear", e === best && "shadow-[0_0_16px_rgb(22_199_132/0.5)]")}
                  style={{ height: `${(Math.abs(e.points) / peak) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{e.gameweek}</span>
              </div>
            ))}
          </div>
        </section>
        <ol className="flex flex-col gap-2">
          {entries.map((e, i) => (
            <motion.li key={`${e.gameweek}-${e.finishedAt}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.base, ease, delay: i * 0.03 }}>
              <button onClick={() => setOpen(e)} className="flex w-full items-center gap-4 rounded-3xl bg-surface-1 p-4 text-left ring-1 ring-inset ring-hairline transition-colors hover:bg-surface-2">
                <span className="grid w-12 shrink-0 text-center">
                  <span className="font-display text-xs font-bold uppercase text-muted-foreground">GW</span>
                  <span className="num font-display text-2xl font-bold leading-none">{e.gameweek}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("num font-display text-xl font-bold", tone(e.points, 0))}>{signed(e.points)}</span>
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{e.kind === "daily" ? t.daily : t.flash}</span>
                    {e.chip && (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold">
                        <Sparkles className="size-3 text-brand" aria-label={copy.chipName[e.chip]} />
                        <span className="hidden sm:inline">{copy.chipName[e.chip]}</span>
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {t.captain}: <span className="font-mono text-foreground/90">{e.captain.ticker}</span> {signed(e.captain.points)}
                  </span>
                </span>
                <span className="text-right">
                  <span className={cn("num block font-display text-xl font-bold", e.rank === 1 && "text-gold")}>{ordinal(e.rank)}</span>
                  <span className="block text-[11px] text-muted-foreground">{t.rank}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </motion.li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} back={routes.profile} />
      <main className="flex flex-1 flex-col px-4 pb-[calc(104px+env(safe-area-inset-bottom))] lg:px-0 lg:pb-10">
        <OnchainSeasonCard className="mb-3" />
        {body}
      </main>
      <TabBar />
      <ResultSheet result={open} open={!!open} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
