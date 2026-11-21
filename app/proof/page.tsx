import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Info } from "lucide-react";
import { getProofStats, type ProofStatus } from "@/lib/data";
import { copy } from "@/lib/copy";
import { external, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Proof" };

const P = copy.proof;

export default async function ProofPage() {
  const stats = await getProofStats();
  const counters = [
    { label: P.counters.settled, value: stats.counters.settled },
    { label: P.counters.locked, value: stats.counters.locked },
    { label: P.counters.sessions, value: stats.counters.sessions },
    { label: P.counters.vrf, value: stats.counters.vrf },
  ];
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
        <p className="mt-3 max-w-[50ch] text-lg text-muted-foreground">{P.body}</p>

        {stats.preview && (
          <p className="mt-6 flex items-start gap-2.5 rounded-2xl bg-brand-soft px-4 py-3 text-sm ring-1 ring-inset ring-brand/40">
            <Info className="mt-0.5 size-4 shrink-0 text-brand" /> {P.previewBanner}
          </p>
        )}

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {counters.map((c) => (
            <div key={c.label} className="noise cut-tr rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="num mt-3 font-display text-5xl font-bold">{c.value.toLocaleString("en-US")}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-[32px] font-bold uppercase tracking-tight">{P.stackTitle}</h2>
          <div className="mt-5 overflow-hidden rounded-[28px] bg-surface-1 ring-1 ring-inset ring-hairline">
            {stats.stack.map((row) => (
              <div key={row.moment} className="flex flex-col gap-1 border-b border-hairline px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex-1 text-[15px] font-semibold">{row.moment}</span>
                <span className="font-mono text-xs text-brand sm:w-[300px]">{row.tech}</span>
                <StatusPill status={row.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-[32px] font-bold uppercase tracking-tight">{P.addressesTitle}</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="noise rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
              <p className="text-sm text-muted-foreground">{P.oracle}</p>
              <p className="mt-2 break-all font-mono text-sm">{stats.oracleProgram}</p>
              <a href={external.solanaExplorer(stats.oracleProgram)} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold ring-1 ring-inset ring-hairline hover:bg-surface-3">
                {P.viewExplorer} <ArrowUpRight className="size-4" />
              </a>
            </div>
            <div className="noise rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
              <p className="text-sm text-muted-foreground">{P.game}</p>
              <p className="mt-2 font-mono text-sm text-muted-foreground">{stats.gameProgram ?? P.notDeployed}</p>
            </div>
          </div>
          <a href={external.magicblockDocs} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            {copy.landing.footer.docs} <ArrowUpRight className="size-4" />
          </a>
        </section>
      </main>
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
