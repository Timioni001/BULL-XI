"use client";

import { ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getManagerRecord, getManagerResults } from "@/lib/data";
import { explorer } from "@/lib/config";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { EmptyState, ErrorState, Shimmer } from "@/components/states/states";
import { StockAvatar } from "@/components/stock/stock-avatar";

const t = copy.manager;
const tickerOf = (id: string) => id.replace(/x$/, "").toUpperCase() + "x";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Anyone's public profile, read from Solana devnet and the MagicBlock rollup. */
export function ManagerProfile({ address }: { address: string }) {
  const record = useAsync(() => (address ? getManagerRecord(address) : Promise.resolve(null)));
  const results = useAsync(() => (address ? getManagerResults(address) : Promise.resolve([])));

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: record.data?.team ?? t.title });
      else {
        await navigator.clipboard.writeText(url);
        toast(t.copied);
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={record.data?.team ?? t.title} back={routes.profile} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[calc(104px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex flex-col gap-3">
          {record.status === "loading" && <Shimmer className="h-[188px] rounded-[28px]" />}
          {record.status === "error" && <ErrorState title={t.errorTitle} message={copy.errors.league.body} onRetry={record.retry} />}
          {record.status === "success" && !record.data && <EmptyState title={t.notFoundTitle} body={t.notFoundBody} />}
          {record.data && (
            <section className="rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink font-display text-xl font-black text-ink-foreground">
                  {record.data.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[22px] font-bold uppercase leading-tight">{record.data.team}</p>
                  <p className="truncate text-sm text-muted-foreground">{record.data.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.since(day(new Date(record.data.joinedAt).toISOString()))}</p>
                </div>
                <Button variant="secondary" size="icon-cta" aria-label={t.share} onClick={share}>
                  <Share2 />
                </Button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat label={t.gameweeks} value={String(record.data.gameweeks)} />
                <Stat label={t.points} value={String(record.data.totalPoints)} />
                <Stat label={t.best} value={record.data.gameweeks ? t.pts(record.data.bestPoints) : "–"} />
              </div>
            </section>
          )}
        </div>

        {record.data !== null && (
        <aside className="flex flex-col gap-3">
          <SectionTitle title={t.results} />
          {results.status === "loading" && <Shimmer className="h-40 rounded-3xl" />}
          {results.status === "error" && <ErrorState title={t.errorTitle} onRetry={results.retry} className="py-6" />}
          {results.status === "success" && results.data.length === 0 && <EmptyState title={t.empty} body={t.emptyBody} className="py-8" />}
          {results.data && results.data.length > 0 && (
            <ul className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
              {results.data.map((r) => (
                <li key={r.account} className="flex min-h-16 items-center gap-3 border-b border-hairline px-4 py-3 last:border-0">
                  <StockAvatar ticker={tickerOf(r.captain)} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{r.date ? day(r.date) : r.gameweek >= 900_000_000 ? t.test : `#${r.gameweek}`}</p>
                    <p className="text-xs text-muted-foreground">{t.captain(tickerOf(r.captain))}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("num font-display text-lg font-bold", r.points > 0 ? "text-bull" : r.points < 0 ? "text-bear" : "")}>{r.points}</p>
                    <a href={explorer("address", r.account)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground underline underline-offset-2">
                      {t.proof} <ExternalLink className="size-3" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="px-1 text-xs text-muted-foreground">{t.resultsNote}</p>
        </aside>
        )}
      </main>
      <TabBar />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-hairline">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="num font-display text-xl font-bold">{value}</p>
    </div>
  );
}
