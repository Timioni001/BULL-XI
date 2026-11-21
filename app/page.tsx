import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Play, Plus, Star } from "lucide-react";
import { getGameweekStats, getShowcaseStocks, getStockUniverse } from "@/lib/data";
import { copy } from "@/lib/copy";
import { external, routes } from "@/lib/routes";
import { signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { DeferredPreview } from "@/components/landing/deferred-preview";
import { LogoTile } from "@/components/landing/logo-tile";
import { Movers } from "@/components/landing/movers";
import { Phone } from "@/components/landing/phone";
import { LeagueScreen, LiveStaticScreen, PickerScreen } from "@/components/landing/phone-screens";

export const metadata: Metadata = {
  title: { absolute: `${copy.brand.name}: ${copy.brand.tagline}` },
};

const L = copy.landing;

/** Logo tiles floating around the headline: [ticker, size, position classes, delay] */
const FLOATERS: [string, number, string, number][] = [
  ["NVDAx", 92, "left-[6%] top-[150px] -rotate-6", 0],
  ["TSLAx", 64, "left-[17%] top-[330px] rotate-3", 1.2],
  ["AAPLx", 72, "left-[4%] top-[470px] rotate-6", 0.6],
  ["COINx", 84, "right-[6%] top-[140px] rotate-6", 0.9],
  ["METAx", 60, "right-[18%] top-[320px] -rotate-3", 0.3],
  ["AMZNx", 76, "right-[5%] top-[460px] -rotate-6", 1.5],
];

export default async function Landing() {
  const stats = await getGameweekStats();
  const showcase = getShowcaseStocks();
  const universe = getStockUniverse();
  const managers = stats.managers.toLocaleString("en-US");

  return (
    <div className="theme-light min-h-dvh overflow-x-clip bg-[#f4f4f2]">
      <Nav />

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="dot-grid relative pt-[calc(env(safe-area-inset-top)+96px)]">
          {/* floating clean logo tiles (desktop) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-[620px] lg:block">
            {FLOATERS.map(([t, size, pos, delay]) => (
              <div key={t} className={cn("absolute", pos)}>
                <div className="animate-float" style={{ animationDelay: `${delay}s` }}>
                  <LogoTile ticker={t} size={size} />
                </div>
              </div>
            ))}
          </div>

          <div className="relative mx-auto flex max-w-[860px] flex-col items-center px-5 text-center">
            <Link href={routes.app} className="inline-flex h-10 items-center gap-2.5 rounded-full bg-white py-1 pl-1.5 pr-1.5 text-[13px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-black/5">
              <span className="flex -space-x-2">
                {["NVDAx", "TSLAx", "COINx"].map((t) => (
                  <LogoTile key={t} ticker={t} size={26} className="ring-2 ring-white" />
                ))}
              </span>
              <span className="num">{L.badge(managers)}</span>
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#111] px-3 text-[12px] font-semibold text-white">
                {L.badgeCta} <ArrowRight className="size-3.5" />
              </span>
            </Link>

            <h1 className="font-headline mt-7 text-[44px] leading-[1.02] text-[#0d0d0d] sm:text-[64px] lg:text-[84px]">
              {L.heroTitleLead} <span className="text-brand">{L.heroTitleHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-[#555] lg:text-[18px]">{L.heroBody}</p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={routes.app} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111] px-6 text-[15px] font-semibold text-white shadow-[0_12px_24px_-12px_rgb(0_0_0/0.5)] hover:bg-black">
                {L.heroCta}
              </Link>
              <a href="#live" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#111] ring-1 ring-black/10 hover:bg-[#fafafa]">
                <Play className="size-4 fill-current" /> {L.watch}
              </a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[13px] text-[#555]">
              <span className="flex text-[#111]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </span>
              {L.rating}
            </p>

            {/* mobile logo row */}
            <div aria-hidden className="mt-8 flex justify-center gap-3 lg:hidden">
              {FLOATERS.slice(0, 5).map(([t], i) => (
                <div key={t} className="animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
                  <LogoTile ticker={t} size={48} />
                </div>
              ))}
            </div>
          </div>

          {/* phones over an orange horizon glow */}
          <div id="live" className="relative mt-14 scroll-mt-24 overflow-hidden pb-6 lg:mt-20">
            <div aria-hidden className="absolute inset-x-[-20%] bottom-[-220px] h-[520px] rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_91_31/0.55),rgb(255_140_80/0.25)_55%,transparent_75%)] blur-2xl" />
            <div className="relative flex items-end justify-center">
              <Phone className="absolute hidden translate-x-[-300px] translate-y-10 -rotate-[8deg] scale-[0.9] opacity-95 md:block">
                <PickerScreen stocks={showcase} />
              </Phone>
              <Phone className="relative z-10 origin-bottom scale-[0.86] sm:scale-100">
                <DeferredPreview bare fallback={<LiveStaticScreen stocks={universe.filter((s) => s.position !== "ETF").slice(0, 11)} />} />
              </Phone>
              <Phone className="absolute hidden translate-x-[300px] translate-y-10 rotate-[8deg] scale-[0.9] opacity-95 md:block">
                <LeagueScreen />
              </Phone>
            </div>
          </div>
        </section>

        {/* ---------------- Stats ---------------- */}
        <section className="border-y border-black/5 bg-white">
          <div className="mx-auto grid max-w-[1100px] grid-cols-3 divide-x divide-black/5 px-2">
            {L.stats.map((s) => (
              <div key={s.l} className="px-3 py-8 text-center lg:py-10">
                <p className="num font-headline text-[34px] leading-none lg:text-[52px]">{s.v}</p>
                <p className="mt-2 text-[13px] text-[#555] lg:text-[15px]">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Logo strip ---------------- */}
        <section className="py-12">
          <p className="text-center text-[13px] font-medium text-[#555]">{L.marquee}</p>
          <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-4 motion-reduce:animate-none">
              {[...universe, ...universe].map((s, i) => (
                <LogoTile key={`${s.id}-${i}`} ticker={s.ticker} size={56} />
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section id="how" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-16 lg:px-8">
          <div className="text-center">
            <h2 className="font-headline text-[38px] leading-[1.05] lg:text-[56px]">{L.featuresTitle}</h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-[#555]">{L.featuresBody}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {L.features.map((f, i) => (
              <article key={f.title} className="overflow-hidden rounded-[28px] bg-[#ebebe8]">
                <div className="relative h-[200px] overflow-hidden">
                  <FeatureArt index={i} stocks={showcase} />
                  <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(60%_100%_at_50%_100%,rgb(255_91_31/0.35),transparent)]" />
                </div>
                <div className="p-5">
                  <h3 className="font-headline text-[20px]">{f.title}</h3>
                  <p className="mt-1 text-[14px] text-[#555]">{f.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------------- Match feed ---------------- */}
        <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8">
          <div className="relative mx-auto w-full max-w-[440px]">
            <div aria-hidden className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_60%,rgb(255_91_31/0.25),transparent)]" />
            <div className="theme-dark relative overflow-hidden rounded-[28px] p-2 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.6)]">
              <div className="flex items-center justify-between px-3 py-3">
                <span className="font-display text-[14px] font-black uppercase">{copy.live.matchCentre}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-foreground">
                  <span className="size-1.5 animate-live-dot rounded-full bg-brand-foreground" /> {copy.live.pill}
                </span>
              </div>
              {L.feedItems.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-3 odd:bg-surface-1">
                  <span className="num w-8 font-mono text-xs text-muted-foreground">{e.m}</span>
                  <span className={cn("size-2 shrink-0 rounded-full", e.gold ? "bg-gold" : e.d > 0 ? "bg-bull" : e.d < 0 ? "bg-bear" : "bg-white/50")} />
                  <span className="flex-1 text-[14px]">{e.t}</span>
                  {e.d !== 0 && <span className={cn("num rounded-full px-2 py-0.5 text-[12px] font-bold text-black", e.d > 0 ? "bg-bull" : "bg-bear")}>{signed(e.d)}</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-headline text-[38px] leading-[1.05] lg:text-[56px]">{L.feedTitle}</h2>
            <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed text-[#555]">{L.feedBody}</p>
            <Link href={routes.app} className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#111] px-6 text-[15px] font-semibold text-white hover:bg-black">
              {L.cta} <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* ---------------- Top movers (dark) ---------------- */}
        <section className="theme-dark bg-[#0d0d0e] py-20 text-white" style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1.2px)", backgroundSize: "22px 22px" }}>
          <div className="mx-auto max-w-[1200px] px-5 lg:px-8">
            <Movers stocks={showcase} />
            <p className="mt-4 text-xs text-white/60">{copy.common.preview}</p>
          </div>
        </section>

        {/* ---------------- Tech ---------------- */}
        <section id="tech" className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-20 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-headline text-[38px] leading-[1.05] lg:text-[56px]">{L.techTitle}</h2>
              <p className="mt-3 max-w-[50ch] text-[#555]">{L.techBody}</p>
            </div>
            <Link href={routes.proof} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold ring-1 ring-black/10">
              {L.proofCta} <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.howItWorks.rows.map((r) => (
              <article key={r.moment} className="rounded-[24px] bg-white p-5 ring-1 ring-black/5">
                <p className="font-mono text-[11px] font-semibold text-[#c2410c]">{r.tech}</p>
                <h3 className="mt-2 text-[15px] font-semibold">{r.moment}</h3>
                <p className="mt-1 text-sm text-[#555]">{r.plain}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="mx-auto max-w-[820px] scroll-mt-24 px-5 pb-20 lg:px-8">
          <h2 className="text-center font-headline text-[38px] leading-[1.05] lg:text-[56px]">{L.faqTitle}</h2>
          <div className="mt-8 divide-y divide-black/5 rounded-[28px] bg-white ring-1 ring-black/5">
            {L.faq.map((f) => (
              <details key={f.q} className="group px-5">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus className="size-5 shrink-0 text-[#555] transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="pb-5 text-[15px] text-[#555]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------------- Closing ---------------- */}
        <section className="px-5 pb-6 lg:px-8">
          <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[36px] bg-[#0d0d0e] px-6 pb-16 pt-16 text-center text-white lg:pt-24">
            <div aria-hidden className="absolute inset-x-[-10%] bottom-[-260px] h-[420px] rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_91_31/0.7),rgb(255_140_80/0.25)_55%,transparent_75%)] blur-2xl" />
            <div className="relative">
              <Logo size={48} className="mx-auto" decorative light />
              <h2 className="font-headline mx-auto mt-6 max-w-[14ch] text-[44px] leading-[1.02] lg:text-[72px]">{L.closingTitle}</h2>
              <p className="mx-auto mt-4 max-w-[40ch] text-white/70">{copy.brand.subline}</p>
              <Link href={routes.app} className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-black hover:bg-white/90">
                {L.heroCta} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-2.5">
            <Logo size={24} decorative />
            <span className="font-headline text-[15px]">BULL-XI</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#555]">
            <Link href={routes.app} className="hover:text-black">{L.footer.app}</Link>
            <Link href={routes.proof} className="hover:text-black">{L.footer.proof}</Link>
            <a href={external.magicblockDocs} target="_blank" rel="noreferrer" className="hover:text-black">{L.footer.docs}</a>
          </nav>
          <p className="text-xs text-[#555]">{L.footer.built}</p>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  const links = [
    { href: "#how", label: L.nav.how },
    { href: "#live", label: L.nav.live },
    { href: "#tech", label: L.nav.tech },
    { href: "#faq", label: L.nav.faq },
  ];
  return (
    <header className="pt-safe absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 lg:px-8">
        <Link href={routes.landing} className="flex items-center gap-2.5">
          <Logo size={28} decorative />
          <span className="font-headline text-[17px]">BULL-XI</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] text-[#444] md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-black">
              {l.label}
            </a>
          ))}
        </nav>
        <Link href={routes.app} className="inline-flex h-11 items-center rounded-full bg-[#111] px-5 text-[14px] font-semibold text-white hover:bg-black">
          {L.nav.open}
        </Link>
      </div>
    </header>
  );
}

function FeatureArt({ index, stocks }: { index: number; stocks: ReturnType<typeof getShowcaseStocks> }) {
  if (index === 0)
    return (
      <div className="relative h-full">
        {stocks.slice(0, 3).map((s, i) => (
          <div key={s.id} className="absolute top-[38px]" style={{ left: `${18 + i * 22}%`, transform: `rotate(${(i - 1) * 8}deg) translateY(${i === 1 ? -10 : 6}px)`, zIndex: i === 1 ? 2 : 1 }}>
            <LogoTile ticker={s.ticker} size={84} />
          </div>
        ))}
      </div>
    );
  if (index === 1)
    return (
      <div className="grid h-full place-items-center">
        <div className="relative">
          <LogoTile ticker="NVDAx" size={96} />
          <span className="absolute -right-4 -top-4 grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#ffe08a,#f5c451_45%,#d9a530)] font-display text-lg font-black text-black shadow-lg">C</span>
          <span className="num absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#111] px-2.5 py-0.5 font-display text-sm font-black text-white">x2</span>
        </div>
      </div>
    );
  if (index === 2)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="num rounded-full bg-bull px-3 py-1 text-sm font-bold text-black">+1.8%</span>
        <span className="num font-headline text-[64px] leading-none">+18</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#555]">points</span>
      </div>
    );
  return (
    <div className="flex h-full flex-col justify-center gap-2 px-6">
      {[
        { r: 1, t: "Your XI", me: true },
        { r: 2, t: "Inter Margin" },
        { r: 3, t: "Dividend FC" },
      ].map((x) => (
        <div key={x.r} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", x.me ? "bg-[#111] text-white" : "bg-white")}>
          <span className={cn("num font-bold", x.me && "text-gold")}>{x.r}</span>
          <span className="flex-1 truncate font-medium">{x.t}</span>
        </div>
      ))}
    </div>
  );
}
