import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { getGameweekStats, getShowcaseStocks } from "@/lib/data";
import { copy } from "@/lib/copy";
import { external, routes } from "@/lib/routes";
import { Logo } from "@/components/brand/logo";
import { Corridor } from "@/components/landing/corridor";
import { corridorCards } from "@/components/landing/corridor-cards";
import { DeferredPreview } from "@/components/landing/deferred-preview";
import { SiteNav } from "@/components/landing/site-nav";
import { TypingPrompt } from "@/components/landing/typing-prompt";
import { StockArt } from "@/components/stock/stock-art";
import { StockAvatar } from "@/components/stock/stock-avatar";

export const metadata: Metadata = {
  title: { absolute: `${copy.brand.name}: ${copy.brand.tagline}` },
};

const L = copy.landing;

export default async function Landing() {
  const stats = await getGameweekStats();
  const showcase = getShowcaseStocks();
  const cards = corridorCards(showcase);

  return (
    <div className="theme-light min-h-dvh overflow-x-clip">
      <SiteNav />

      <main>
        {/* Hero: serif headline over a 3D corridor of cards */}
        <section className="relative h-[100svh] min-h-[640px] max-h-[980px]">
          <Corridor cards={cards} className="absolute inset-x-0 top-[22%] h-[50%] lg:top-[20%] lg:h-[56%]" />
          <div className="pointer-events-none relative z-[200] flex h-full flex-col items-center px-5 text-center">
            <h1 className="mt-[19svh] font-serif text-[46px] leading-[0.98] text-[#111] sm:text-[64px] lg:mt-[15svh] lg:text-[84px]">
              {L.heroTop}
              <br />
              {L.heroBottom}
            </h1>
            <div className="pointer-events-auto mt-auto mb-[9svh] flex w-full max-w-[460px] flex-col items-center">
              <p className="max-w-[40ch] text-[15px] leading-relaxed text-[#2b2b2b] lg:text-base">{L.heroBody}</p>
              <div className="mt-6 w-full">
                <TypingPrompt phrases={L.prompts} label={L.promptLabel} />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-20 lg:px-8">
          <SectionHead eyebrow={L.nav.how} title={L.howTitle} />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {L.how.map((s, i) => (
              <article key={s.k} className="flex flex-col rounded-[28px] bg-white p-3 shadow-[0_1px_0_rgb(0_0_0/0.04)] ring-1 ring-black/5">
                <div className="h-[220px] overflow-hidden rounded-[22px]">{i === 0 ? <PickArt /> : i === 1 ? <CaptainArt /> : <WinArt />}</div>
                <div className="px-3 pb-3 pt-5">
                  <span className="num text-xs font-semibold text-[#5f5f5f]">0{i + 1}</span>
                  <h3 className="mt-1 font-serif text-[30px] leading-tight">{s.title}</h3>
                  <p className="mt-2 text-[15px] text-[#555]">{s.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Live */}
        <section id="live" className="scroll-mt-24 bg-[#161618] py-20 text-white">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 lg:grid-cols-[1fr_420px] lg:px-8">
            <div>
              <p className="text-sm font-medium text-white/65">{L.nav.live}</p>
              <h2 className="mt-2 max-w-[14ch] font-serif text-[48px] leading-[0.98] lg:text-[72px]">{L.liveTitle}</h2>
              <p className="mt-4 max-w-[40ch] text-white/60">{L.liveBody}</p>
              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <Stat label={L.liveStats.managers} value={stats.managers.toLocaleString("en-US")} />
                <Stat label={L.liveStats.locked} value={stats.squadsLocked.toLocaleString("en-US")} />
                <div className="rounded-3xl bg-white/[0.06] p-5">
                  <p className="text-xs text-white/65">{L.liveStats.mostPicked}</p>
                  <ul className="mt-3 space-y-1.5">
                    {stats.mostPicked.map((m) => (
                      <li key={m.ticker} className="flex justify-between text-sm">
                        <span className="font-mono font-semibold">{m.ticker}</span>
                        <span className="num text-white/65">{m.ownership.toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl bg-brand p-5 text-brand-foreground">
                  <p className="text-xs">{L.liveStats.leader}</p>
                  <p className="mt-3 truncate font-display text-base font-black uppercase">{stats.leader.team}</p>
                  <p className="num font-display text-3xl font-black">{stats.leader.points}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/60">{copy.common.preview}</p>
            </div>
            <DeferredPreview />
          </div>
        </section>

        {/* Tech */}
        <section id="tech" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-20 lg:px-8">
          <SectionHead eyebrow={L.nav.tech} title={L.techTitle} body={L.techBody} />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.howItWorks.rows.map((r) => (
              <article key={r.moment} className="rounded-[24px] bg-white p-5 ring-1 ring-black/5">
                <p className="font-mono text-[11px] font-semibold text-[#c2410c]">{r.tech}</p>
                <h3 className="mt-2 text-[15px] font-semibold">{r.moment}</h3>
                <p className="mt-1 text-sm text-[#666]">{r.plain}</p>
              </article>
            ))}
          </div>
          <Link href={routes.proof} className="mt-6 inline-flex h-12 items-center gap-1.5 rounded-xl bg-[#1b1b1d] px-5 text-sm font-semibold text-white">
            {L.proofCta} <ArrowUpRight className="size-4" />
          </Link>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[860px] scroll-mt-24 px-5 py-16 lg:px-8">
          <SectionHead eyebrow={L.nav.faq} title={L.faqTitle} />
          <div className="mt-8 divide-y divide-black/5 rounded-[28px] bg-white ring-1 ring-black/5">
            {L.faq.map((f) => (
              <details key={f.q} className="group px-5">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus className="size-5 shrink-0 text-[#5f5f5f] transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="pb-5 text-[15px] text-[#555]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-[1200px] px-5 pb-16 pt-4 lg:px-8">
          <div className="relative overflow-hidden rounded-[36px] bg-[#161618] px-6 py-16 text-center text-white lg:py-24">
            <Logo size={52} className="mx-auto" />
            <h2 className="mx-auto mt-6 max-w-[16ch] font-serif text-[44px] leading-[0.98] lg:text-[72px]">{copy.brand.subline}</h2>
            <Link href={routes.app} className="mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-brand px-7 font-display text-[14px] font-extrabold uppercase text-brand-foreground hover:bg-[var(--brand-hover)]">
              {L.cta} <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-2.5">
            <Logo size={24} className="!invert-0" decorative />
            <span className="font-display text-[13px] font-black tracking-wide">BULL-XI</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#666]">
            <Link href={routes.app} className="hover:text-black">{L.footer.app}</Link>
            <Link href={routes.proof} className="hover:text-black">{L.footer.proof}</Link>
            <a href={external.magicblockDocs} target="_blank" rel="noreferrer" className="hover:text-black">{L.footer.docs}</a>
          </nav>
          <p className="text-xs text-[#5f5f5f]">{L.footer.built}</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-[#5f5f5f]">{eyebrow}</p>
      <h2 className="mt-2 max-w-[18ch] font-serif text-[44px] leading-[0.98] lg:text-[64px]">{title}</h2>
      {body && <p className="mt-3 max-w-[50ch] text-[#555]">{body}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/[0.06] p-5">
      <p className="text-xs text-white/65">{label}</p>
      <p className="num mt-3 font-display text-3xl font-black">{value}</p>
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
    <div className="pitch-diagonal grid size-full place-items-center">
      <div className="flex gap-2.5">
        {tiles.map(([t, s], i) => (
          <span key={t} className="animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
            <StockAvatar ticker={t} sector={s} size={54} inverted />
          </span>
        ))}
      </div>
    </div>
  );
}

function CaptainArt() {
  return (
    <StockArt ticker="NVDAx" sector="Finance" className="size-full">
      <div className="grid h-full place-items-center">
        <div className="relative">
          <StockAvatar ticker="NVDAx" sector="Chips" size={88} inverted />
          <span aria-label="Captain" className="absolute -right-4 -top-4 grid size-10 place-items-center rounded-full bg-black font-display text-lg font-black text-[#f5c451] ring-2 ring-[#f5c451]">
            C
          </span>
          <span className="num absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-2.5 py-0.5 font-display text-sm font-black text-black">x2</span>
        </div>
      </div>
    </StockArt>
  );
}

function WinArt() {
  const rows = [
    { r: 1, t: "Your XI", d: "▲ 2" },
    { r: 2, t: "Dividend FC", d: "▼ 1" },
    { r: 3, t: "Inter Margin", d: "▼ 1" },
  ];
  return (
    <div className="flex size-full flex-col justify-center gap-2 bg-[#161618] p-6">
      {rows.map((x) => (
        <div key={x.r} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${x.r === 1 ? "bg-brand text-brand-foreground" : "bg-white/[0.07] text-white"}`}>
          <span className="num font-display font-black">{x.r}</span>
          <span className="flex-1 truncate font-medium">{x.t}</span>
          <span className={`num text-xs font-semibold ${x.r === 1 ? "text-brand-foreground"   : "text-white/80"}`}>{x.d}</span>
        </div>
      ))}
    </div>
  );
}
