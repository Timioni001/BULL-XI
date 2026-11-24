"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Info, RotateCcw } from "lucide-react";
import { getProofStats, type ProofStatus } from "@/lib/data";
import { copy } from "@/lib/copy";
import { external, routes } from "@/lib/routes";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "@/components/brand/logo";
import { Shimmer } from "@/components/states/states";

const P = copy.proof;

function ago(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} days ago`;
}

/** /proof: live counters, the price book, today's gameweek and addresses, all read from devnet. */
export function ProofView() {
  const stats = useAsync(getProofStats);
  const { retry } = stats;
  useEffect(() => {
    const id = setInterval(retry, 15_000);
    return () => clearInterval(id);
  }, [retry]);
  const d = stats.data;

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute -right-[30vw] -top-[40vw] size-[90vw] max-h-[1000px] max-w-[1000px] rotate-45 bg-gradient-to-b from-brand/20 to-transparent" />
      <header className="pt-safe relative mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5 lg:px-8">
        <Link href={routes.landing} className="flex items-center gap-2.5">
          <Logo size={28} decorative />
          <Wordmark />
        </Link>
        <Link href={routes.app} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-surface-1 px-4 text-sm font-semibold ring-1 ring-inset ring-hairline hover:bg-surface-2">
          <ArrowLeft className="size-4" /> {P.back}
        </Link>
      </header>

      <main className="relative mx-auto max-w-[1100px] px-5 pb-20 lg:px-8">
        <p className="mt-8 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span aria-hidden className="inline-block size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-brand" />
          {P.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[64px] font-bold uppercase leading-[0.9] tracking-tight lg:text-[96px]">{P.title}</h1>
        <p className="mt-3 max-w-[56ch] text-lg text-muted-foreground">{P.body}</p>
        {d?.previewNotice && (
          <p className="mt-6 flex items-start gap-2.5 rounded-2xl bg-brand-soft px-4 py-3 text-sm ring-1 ring-inset ring-brand/40">
            <Info className="mt-0.5 size-4 shrink-0 text-brand" /> {d.previewNotice}
          </p>
        )}

        {stats.status === "error" && !d && (
          <div className="mt-8 rounded-[28px] bg-surface-1 p-6 ring-1 ring-inset ring-hairline">
            <p className="font-semibold">{P.error}</p>
            <button onClick={retry} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2">
              <RotateCcw className="size-4" /> {P.retry}
            </button>
          </div>
        )}

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(["pushes", "managers", "squads", "settled"] as const).map((k) =>
            d ? (
              <div key={k} className="noise cut-tr rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
                <p className="text-sm text-muted-foreground">{P.counters[k]}</p>
                <p className="num mt-3 font-display text-5xl font-bold">{d.counters[k].toLocaleString("en-US")}</p>
              </div>
            ) : (
              <Shimmer key={k} className="h-[132px] rounded-[28px]" />
            ),
          )}
        </section>
        <p className="mt-2 text-xs text-muted-foreground">{P.refreshing}</p>

        <section className="mt-10 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-bold uppercase">{P.priceBook}</h2>
              <span className="text-xs text-muted-foreground">{d ? (d.priceBook.lastPushAt ? P.lastPush(ago(d.priceBook.lastPushAt)) : P.never) : ""}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {(d?.priceBook.prices ?? []).slice(0, 12).map((p) => (
                <div key={p.ticker} className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-hairline">
                  <p className="font-mono text-[11px] text-muted-foreground">{p.ticker}</p>
                  <p className="num text-sm font-semibold">${p.price.toFixed(2)}</p>
                </div>
              ))}
              {!d && Array.from({ length: 12 }, (_, i) => <Shimmer key={i} className="h-12 rounded-xl" />)}
            </div>
            {d && (
              <a href={d.addresses[1].href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2">
                {P.viewExplorer} <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>
          <div className="rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
            <h2 className="font-display text-2xl font-bold uppercase">{P.gameweek}</h2>
            {d?.gameweek ? (
              <dl className="mt-4 grid grid-cols-2 gap-2">
                <Fact label={P.gwStatus} value={d.gameweek.status} />
                <Fact label={P.deadline} value={new Date(d.gameweek.deadline).toUTCString().slice(5, 22) + " UTC"} />
                <Fact label={P.startedStocks} value={String(d.gameweek.startedStocks)} />
                <Fact label={P.topGainer} value={d.gameweek.topGainer ?? "–"} />
              </dl>
            ) : (
              <Shimmer className="mt-4 h-28 rounded-xl" />
            )}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-[32px] font-bold uppercase tracking-tight">{P.stackTitle}</h2>
          <div className="mt-5 overflow-hidden rounded-[28px] bg-surface-1 ring-1 ring-inset ring-hairline">
            {(d?.stack ?? []).map((row) => (
              <div key={row.moment} className="flex flex-col gap-1 border-b border-hairline px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex-1 text-[15px] font-semibold">{row.moment}</span>
                <span className="text-xs text-muted-foreground sm:w-[340px]">
                  <span className="font-mono text-brand">{row.tech}</span>
                  {row.note && <span className="block">{row.note}</span>}
                </span>
                <StatusPill status={row.status} />
              </div>
            ))}
            {!d && <Shimmer className="h-64 rounded-none" />}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-[32px] font-bold uppercase tracking-tight">{P.addressesTitle}</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {(d?.addresses ?? []).map((a) => (
              <div key={a.label} className="noise rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
                <p className="text-sm text-muted-foreground">{a.label}</p>
                <p className="mt-2 break-all font-mono text-sm">{a.address}</p>
                <a href={a.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold ring-1 ring-inset ring-hairline hover:bg-surface-3">
                  {P.viewExplorer} <ArrowUpRight className="size-4" />
                </a>
              </div>
            ))}
          </div>
          <a href={external.magicblockDocs} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            {copy.landing.footer.docs} <ArrowUpRight className="size-4" />
          </a>
        </section>
      </main>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-hairline">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: ProofStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "live" ? "bg-bull/15 text-bull" : status === "building" ? "bg-brand-soft text-foreground" : "bg-surface-3 text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "live" ? "bg-bull" : status === "building" ? "bg-brand" : "bg-muted-foreground")} />
      {P.status[status]}
    </span>
  );
}
