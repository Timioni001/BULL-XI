"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Crown, Loader2, Lock, ShieldCheck, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getPortfolio, investSquad, sellPortfolio, startPro, type PortfolioView } from "@/lib/data";
import { copy } from "@/lib/copy";
import { explorer } from "@/lib/config";
import { routes } from "@/lib/routes";
import { useAuth } from "@/lib/auth/context";
import { useOnchainPlayer } from "@/lib/auth/player";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { useStocks } from "@/lib/hooks/use-stocks";
import { useGame } from "@/lib/store/game";
import { squadIds } from "@/lib/game/rules";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { StockAvatar } from "@/components/stock/stock-avatar";
import { Shimmer } from "@/components/states/states";

const t = copy.pro;
const AMOUNTS = [100, 250, 500];
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signedPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

type Busy = null | "start" | "invest" | "sell";

/** Go Pro: your squad as a portfolio of test dollars, private in the rollup. */
export function GoPro() {
  const auth = useAuth();
  const player = useOnchainPlayer();
  const prices = useLivePrices();
  const { byId } = useStocks();
  const slots = useGame((s) => s.slots);
  const squad = squadIds(slots);
  const [pf, setPf] = useState<PortfolioView | null | undefined>(undefined);
  const [busy, setBusy] = useState<Busy>(null);
  const [amount, setAmount] = useState(250);
  const signedIn = auth.status === "signedIn" || player.kind === "device";

  const load = useCallback(async () => {
    if (!player.ready) return;
    try {
      setPf(await getPortfolio(await player.get()));
    } catch {
      setPf(null);
    }
  }, [player]);
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<PortfolioView>, done: string) => {
    setBusy(kind);
    haptic(12);
    try {
      setPf(await fn());
      toast(done);
    } catch (e) {
      toast(e instanceof Error ? e.message : copy.errors.generic);
    } finally {
      setBusy(null);
    }
  };

  const holdings = (pf?.holdings ?? []).map((h) => {
    const price = prices?.[h.stockId]?.price ?? byId.get(h.stockId)?.price ?? 0;
    return { ...h, price, value: h.shares * price, change: prices?.[h.stockId]?.change24h ?? byId.get(h.stockId)?.change24h ?? null };
  });
  const holdingsValue = holdings.reduce((a, h) => a + h.value, 0);
  const total = (pf?.cash ?? 0) + holdingsValue;
  const rawGain = holdingsValue - (pf?.invested ?? 0);
  const gain = Math.abs(rawGain) < 0.005 ? 0 : rawGain;
  const gainPct = pf?.invested ? (gain / pf.invested) * 100 : 0;

  let cta: React.ReactNode;
  if (!signedIn) cta = <Button size="cta" className="w-full" onClick={auth.signIn}>{t.signIn}</Button>;
  else if (!pf || !pf.claimed)
    cta = (
      <Button size="cta" className="w-full" disabled={busy !== null || pf === undefined} onClick={() => void run("start", async () => startPro(await player.get()), t.preview)}>
        {busy === "start" ? <Loader2 className="animate-spin" /> : <Wallet />} {busy === "start" ? t.starting : t.start}
      </Button>
    );
  else
    cta = (
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button
          size="cta"
          disabled={busy !== null || squad.length < 15 || pf.cash < amount}
          onClick={() => void run("invest", async () => investSquad(await player.get(), squad, amount), t.investedToast(amount))}
        >
          {busy === "invest" ? <Loader2 className="animate-spin" /> : <ArrowRight />} {busy === "invest" ? t.investing : t.investCta(amount)}
        </Button>
        <Button size="cta" variant="secondary" disabled={busy !== null || holdings.length === 0} onClick={() => void run("sell", async () => sellPortfolio(await player.get()), t.sold)}>
          {busy === "sell" ? <Loader2 className="animate-spin" /> : null} {busy === "sell" ? t.selling : t.sell}
        </Button>
      </div>
    );

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} back={routes.profile} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-2 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex flex-col gap-3">
          <section className="theme-dark relative overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#3a2216,#1a1614_60%)] p-6 ring-1 ring-inset ring-brand/40">
            <div aria-hidden className="absolute -right-14 -top-14 size-52 rotate-45 bg-brand/20" />
            <Crown className="relative size-7 text-gold" />
            <h2 className="relative mt-3 max-w-[18ch] font-display text-[32px] font-bold uppercase leading-[0.95] tracking-tight">{t.headline}</h2>
            <p className="relative mt-3 max-w-[44ch] text-sm text-white/75">{t.body}</p>
            <p className="relative mt-5 flex items-start gap-2 rounded-2xl bg-black/30 px-4 py-3 text-sm font-semibold ring-1 ring-inset ring-white/10">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-bull" /> {t.honest}
            </p>
          </section>

          {/* Portfolio */}
          {pf === undefined && signedIn ? (
            <Shimmer className="h-48 rounded-[28px]" />
          ) : pf && pf.claimed ? (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease }} className="rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.value}</p>
                  <p className="num mt-1 font-display text-[40px] font-bold leading-none">{money(total)}</p>
                </div>
                <a href={explorer("address", pf.address, { tee: true })} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-inset ring-hairline">
                  <Lock className="size-3" /> Private
                </a>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <Stat label={t.cash} value={money(pf.cash)} />
                <Stat label={t.invested} value={money(pf.invested)} />
                <Stat label={t.gain} value={pf.invested ? `${gain >= 0 ? "+" : "-"}${money(Math.abs(gain))}` : "-"} sub={pf.invested ? signedPct(gainPct) : undefined} tone={pf.invested && gain !== 0 ? (gain > 0 ? "up" : "down") : undefined} />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">{t.privateNote}</p>
            </motion.section>
          ) : (
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {t.how.map((s, i) => (
                <motion.li key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease, delay: i * 0.05 }} className="flex gap-3 rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline">
                  <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand">{i + 1}</span>
                  <span>
                    <span className="block text-[15px] font-semibold">{s.title}</span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">{s.body}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
          )}

          {pf && pf.claimed && (
            <section className="rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
              <SectionTitle title={t.investTitle} />
              <p className="mt-1 text-[13px] text-muted-foreground">{squad.length === 15 ? t.investBody(15) : t.needSquad}</p>
              <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.investTitle}>
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    role="radio"
                    aria-checked={amount === a}
                    onClick={() => setAmount(a)}
                    disabled={pf.cash < a}
                    className={cn("num h-11 rounded-2xl text-sm font-semibold ring-1 ring-inset transition-colors disabled:opacity-40", amount === a ? "bg-ink text-ink-foreground ring-ink" : "bg-surface-2 ring-hairline")}
                  >
                    ${a}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          {pf && pf.claimed && (
            <>
              <SectionTitle title={t.holdings} />
              {holdings.length === 0 ? (
                <p className="rounded-3xl bg-surface-1 p-4 text-sm text-muted-foreground ring-1 ring-inset ring-hairline">{t.emptyHoldings}</p>
              ) : (
                <ul className="divide-y divide-hairline overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
                  {holdings
                    .sort((a, b) => b.value - a.value)
                    .map((h) => {
                      const s = byId.get(h.stockId);
                      return (
                        <li key={h.stockId} className="flex items-center gap-3 px-4 py-3">
                          <StockAvatar ticker={s?.ticker ?? h.stockId} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{s?.ticker ?? h.stockId}</span>
                            <span className="num block text-[11px] text-muted-foreground">{t.shares(h.shares)}</span>
                          </span>
                          <span className="text-right">
                            <span className="num block text-sm font-semibold">{money(h.value)}</span>
                            {h.change !== null && <span className={cn("num block text-[11px] font-semibold", h.change >= 0 ? "text-bull" : "text-bear")}>{signedPct(h.change)}</span>}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </>
          )}
          <section className="rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Trophy className="size-4 text-gold" /> {t.leaguesTitle}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">{t.leaguesBody}</p>
            <Link href={routes.leagues} className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-[13px] font-semibold ring-1 ring-inset ring-hairline">
              {t.leaguesCta} <ArrowRight className="size-4" />
            </Link>
          </section>
          <p className="px-1 text-xs text-muted-foreground">{t.preview}</p>
          <p className="px-1 text-xs text-muted-foreground">{t.risk}</p>
          <div className="hidden lg:block">{cta}</div>
        </aside>
      </main>
      <BottomBar>{cta}</BottomBar>
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-hairline">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("num mt-0.5 font-semibold", tone === "up" && "text-bull", tone === "down" && "text-bear")}>{value}</p>
      {sub && <p className={cn("num text-[11px] font-semibold", tone === "up" ? "text-bull" : "text-bear")}>{sub}</p>}
    </div>
  );
}
