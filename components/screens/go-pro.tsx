"use client";

import { motion } from "motion/react";
import { Crown, ShieldCheck, Wallet } from "lucide-react";
import { getProLeagues, PRO_PLATFORM_CUT } from "@/lib/data";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAuth } from "@/lib/auth/context";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { ErrorState, Shimmer } from "@/components/states/states";

const t = copy.pro;
const usdc = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} USDC`;

/** Go Pro: UI only. Wallet words are allowed here, and only here. */
export function GoPro() {
  const leagues = useAsync(getProLeagues);
  const auth = useAuth();
  const wallet = auth.account?.method === "wallet" ? auth.account.address : null;

  const cta = wallet ? (
    <p className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold ring-1 ring-inset ring-hairline">
      <Wallet className="size-4" /> {t.connected} {wallet.slice(0, 4)}…{wallet.slice(-4)}
    </p>
  ) : (
    <Button size="cta" className="w-full" onClick={auth.connectWallet} disabled={auth.status === "unavailable" || auth.status === "failed" || auth.status === "loading"}>
      <Wallet /> {t.connect}
    </Button>
  );

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} back={routes.profile} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-2 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex flex-col gap-3">
          <section className="theme-dark relative overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#3a2216,#1a1614_60%)] p-6 ring-1 ring-inset ring-brand/40">
            <div aria-hidden className="absolute -right-14 -top-14 size-52 rotate-45 bg-brand/20" />
            <Crown className="relative size-7 text-gold" />
            <h2 className="relative mt-3 max-w-[16ch] font-display text-[34px] font-bold uppercase leading-[0.95] tracking-tight">{t.headline}</h2>
            <p className="relative mt-3 max-w-[40ch] text-sm text-white/75">{t.body}</p>
            <p className="relative mt-5 flex items-start gap-2 rounded-2xl bg-black/30 px-4 py-3 text-sm font-semibold ring-1 ring-inset ring-white/10">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-bull" /> {t.honest}
            </p>
          </section>

          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {t.how.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur.slow, ease, delay: i * 0.05 }}
                className="flex gap-3 rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline"
              >
                <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-semibold">{s.title}</span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">{s.body}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </div>

        <aside className="flex flex-col gap-3">
          <SectionTitle title={t.leaguesTitle} />
          {leagues.status === "loading" && <Shimmer className="h-64 rounded-3xl" />}
          {leagues.status === "error" && <ErrorState onRetry={leagues.retry} />}
          {leagues.status === "success" &&
            leagues.data.map((l) => (
              <div key={l.id} className="rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-bold uppercase">{l.name}</p>
                  <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{l.kind === "daily" ? copy.lock.daily : copy.lock.flash}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t.entry}</p>
                    <p className="num font-semibold">{usdc(l.entryUsdc)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t.pool}</p>
                    <p className="num font-semibold text-gold">{usdc(l.poolUsdc)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">&nbsp;</p>
                    <p className="num font-semibold">{t.spots(l.filled, l.spots)}</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div className={cn("h-full rounded-full bg-brand")} style={{ width: `${(l.filled / l.spots) * 100}%` }} />
                </div>
              </div>
            ))}
          <p className="px-1 text-xs text-muted-foreground">{t.platformCut(PRO_PLATFORM_CUT)}</p>
          <p className="px-1 text-xs text-muted-foreground">{t.risk}</p>
          <div className="hidden lg:block">{cta}</div>
        </aside>
      </main>
      <BottomBar>{cta}</BottomBar>
    </>
  );
}
