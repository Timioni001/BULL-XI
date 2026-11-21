import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { getGameweekStats } from "@/lib/data";
import { copy } from "@/lib/copy";
import { external, routes } from "@/lib/routes";
import { Logo, Wordmark } from "@/components/brand/logo";
import { DeferredPreview } from "@/components/landing/deferred-preview";
import { StockAvatar } from "@/components/stock/stock-avatar";

export const metadata: Metadata = {
  title: { absolute: `${copy.brand.name}: ${copy.brand.tagline}` },
};

const L = copy.landing;
const tagline = copy.brand.tagline.split("onchain");

export default async function Landing() {
  const stats = await getGameweekStats();
  return (
    <div className="relative overflow-x-clip">
      {/* Angled brand light, borrowed from the logo's triangle */}
      <div aria-hidden className="pointer-events-none absolute -right-[30vw] -top-[40vw] size-[90vw] max-w-[1100px] max-h-[1100px] rotate-45 bg-gradient-to-b from-brand/25 to-transparent lg:-top-[25vw] lg:right-[-15vw]" />
      <div aria-hidden className="pitch-diagonal pointer-events-none absolute inset-x-0 top-0 h-[900px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <Nav />

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:pb-28 lg:pt-16">
          <div>
            <span className="inline-flex h-8 items-center gap-2 rounded-full bg-surface-1 px-3.5 text-xs font-semibold ring-1 ring-inset ring-hairline">
              <span className="size-1.5 animate-live-dot rounded-full bg-brand" /> {L.pill}
            </span>
            <h1 className="mt-6 font-display text-[52px] font-bold uppercase leading-[0.9] tracking-[-0.03em] sm:text-[72px] lg:text-[92px]">
              {tagline[0]}
              <span className="text-brand text-glow-brand">onchain</span>
              {tagline[1]}
            </h1>
            <p className="mt-6 max-w-[34ch] text-lg text-muted-foreground lg:text-xl">{copy.brand.subline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={routes.app} className="inline-flex h-14 items-center gap-2 rounded-full bg-brand px-7 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_14px_36px_-12px_var(--brand-glow)] transition-colors hover:bg-[var(--brand-hover)]">
                {L.cta} <ArrowRight className="size-5" />
              </Link>
              <a href="#live" className="inline-flex h-14 items-center gap-2 rounded-full bg-surface-1 px-7 text-[15px] font-semibold ring-1 ring-inset ring-hairline hover:bg-surface-2">
                {L.secondary}
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{copy.onboarding.free}</p>
          </div>
          <DeferredPreview />
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-16 lg:px-8">
          <SectionHead eyebrow={L.nav.how} title={L.howTitle} />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {L.how.map((s, i) => (
              <article key={s.k} className="noise cut-tr flex flex-col rounded-[28px] bg-surface-1 p-6 ring-1 ring-inset ring-hairline">
                <div className="flex items-center justify-between">
                  <span className="num font-display text-5xl font-bold text-surface-3">0{i + 1}</span>
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">{s.k}</span>
                </div>
                <div className="my-8 grid h-28 place-items-center">{i === 0 ? <PickArt /> : i === 1 ? <CaptainArt /> : <WinArt />}</div>
                <h3 className="font-display text-2xl font-bold uppercase">{s.title}</h3>
                <p className="mt-2 text-[15px] text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Live right now */}
        <section id="live" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-16 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <SectionHead eyebrow={copy.common.live} title={L.liveTitle} />
            <span className="mb-1 shrink-0 rounded-full bg-surface-1 px-3 py-1 text-xs text-muted-foreground ring-1 ring-inset ring-hairline">{copy.common.preview}</span>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={L.liveStats.managers} value={stats.managers.toLocaleString("en-US")} />
            <Stat label={L.liveStats.locked} value={stats.squadsLocked.toLocaleString("en-US")} />
            <div className="noise rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
              <p className="text-sm text-muted-foreground">{L.liveStats.mostPicked}</p>
              <ul className="mt-3 space-y-2">
                {stats.mostPicked.map((m) => (
                  <li key={m.ticker} className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{m.ticker}</span>
                    <span className="num text-sm text-muted-foreground">{m.ownership.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="noise cut-tr rounded-[28px] bg-brand p-5 text-white">
              <p className="text-sm text-white/75">{L.liveStats.leader}</p>
              <p className="mt-3 font-display text-xl font-bold uppercase">{stats.leader.team}</p>
              <p className="num font-display text-4xl font-bold">{stats.leader.points}</p>
            </div>
          </div>
        </section>

        {/* Tech */}
        <section id="tech" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-16 lg:px-8">
          <SectionHead eyebrow={L.nav.tech} title={L.techTitle} body={L.techBody} />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.howItWorks.rows.map((r) => (
              <article key={r.moment} className="noise rounded-[24px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
                <p className="font-mono text-xs text-brand">{r.tech}</p>
                <h3 className="mt-2 text-[15px] font-semibold">{r.moment}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.plain}</p>
              </article>
            ))}
          </div>
          <Link href={routes.proof} className="mt-6 inline-flex h-12 items-center gap-1.5 rounded-full bg-surface-1 px-5 text-sm font-semibold ring-1 ring-inset ring-hairline hover:bg-surface-2">
            {L.proofCta} <ArrowUpRight className="size-4" />
          </Link>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[860px] scroll-mt-20 px-5 py-16 lg:px-8">
          <SectionHead eyebrow={L.nav.faq} title={L.faqTitle} />
          <div className="mt-8 divide-y divide-hairline rounded-[28px] bg-surface-1 ring-1 ring-inset ring-hairline">
            {L.faq.map((f) => (
              <details key={f.q} className="group px-5">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="pb-5 text-[15px] text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-[1200px] px-5 py-16 lg:px-8">
          <div className="noise cut-tr relative overflow-hidden rounded-[36px] bg-brand px-6 py-14 text-center text-white lg:py-20">
            <div aria-hidden className="absolute -left-20 -top-20 size-64 rotate-45 bg-white/10" />
            <Logo size={56} className="relative mx-auto" />
            <h2 className="relative mx-auto mt-6 max-w-[16ch] font-display text-[40px] font-bold uppercase leading-[0.95] lg:text-[64px]">{copy.brand.subline}</h2>
            <Link href={routes.app} className="relative mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-black hover:bg-white/90">
              {L.cta} <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <Wordmark />
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href={routes.app} className="hover:text-foreground">{L.footer.app}</Link>
            <Link href={routes.proof} className="hover:text-foreground">{L.footer.proof}</Link>
            <a href={external.magicblockDocs} target="_blank" rel="noreferrer" className="hover:text-foreground">{L.footer.docs}</a>
          </nav>
          <p className="text-xs text-muted-foreground">{L.footer.built}</p>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-transparent bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 lg:px-8">
        <Link href={routes.landing} className="flex items-center gap-2.5">
          <Logo size={30} />
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">{L.nav.how}</a>
          <a href="#live" className="hover:text-foreground">{L.nav.live}</a>
          <a href="#tech" className="hover:text-foreground">{L.nav.tech}</a>
          <a href="#faq" className="hover:text-foreground">{L.nav.faq}</a>
        </nav>
        <Link href={routes.app} className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90">
          {L.nav.open}
        </Link>
      </div>
    </header>
  );
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span aria-hidden className="inline-block size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-brand" />
        {eyebrow}
      </p>
      <h2 className="mt-2 max-w-[18ch] font-display text-[40px] font-bold uppercase leading-[0.95] tracking-tight lg:text-[56px]">{title}</h2>
      {body && <p className="mt-3 max-w-[50ch] text-muted-foreground">{body}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="noise rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="num mt-3 font-display text-4xl font-bold lg:text-5xl">{value}</p>
    </div>
  );
}

function PickArt() {
  const tiles: [string, Parameters<typeof StockAvatar>[0]["sector"]][] = [
    ["SPYx", "Index"],
    ["AAPLx", "Big Tech"],
    ["NVDAx", "Chips"],
    ["COINx", "Crypto"],
  ];
  return (
    <div className="flex gap-2.5">
      {tiles.map(([t, s], i) => (
        <span key={t} className="animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
          <StockAvatar ticker={t} sector={s} size={52} inverted />
        </span>
      ))}
    </div>
  );
}

function CaptainArt() {
  return (
    <div className="relative">
      <StockAvatar ticker="NVDAx" sector="Chips" size={84} inverted />
      <span className="absolute -right-3 -top-3">
        <span aria-label="Captain" className="grid size-8 place-items-center rounded-full bg-[linear-gradient(135deg,#ffe08a,#f5c451_45%,#d9a530)] font-display text-lg font-bold text-black shadow-[0_0_0_3px_var(--surface-1),0_0_16px_rgb(245_196_81/0.5)]">C</span>
      </span>
      <span className="num absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2.5 py-0.5 font-display text-sm font-bold text-black">x2</span>
    </div>
  );
}

function WinArt() {
  const rows = [
    { r: 1, t: "Your XI", d: "▲ 2" },
    { r: 2, t: "Dividend FC", d: "▼ 1" },
    { r: 3, t: "Inter Margin", d: "▼ 1" },
  ];
  return (
    <div className="w-full max-w-[240px] space-y-1.5">
      {rows.map((x) => (
        <div key={x.r} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${x.r === 1 ? "bg-brand-soft ring-1 ring-inset ring-brand/50" : "bg-surface-2"}`}>
          <span className={`num font-display font-bold ${x.r === 1 ? "text-gold" : ""}`}>{x.r}</span>
          <span className="flex-1 truncate font-medium">{x.t}</span>
          <span className={`num text-xs font-semibold ${x.d.startsWith("▲") ? "text-bull" : "text-bear"}`}>{x.d}</span>
        </div>
      ))}
    </div>
  );
}
