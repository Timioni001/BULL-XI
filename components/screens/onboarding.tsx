"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useGame } from "@/lib/store/game";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { dur, ease, spring } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Logo, Wordmark } from "@/components/brand/logo";
import { Pitch } from "@/components/pitch/pitch";
import { StockAvatar } from "@/components/stock/stock-avatar";
import { CaptainBadge } from "@/components/game/captain-badge";
import { RankDelta } from "@/components/live/rank-delta";
import type { Sector } from "@/lib/data/types";

const ART = [<SquadArt key="squad" />, <ArmbandArt key="armband" />, <LeagueArt key="league" />];
const CARDS = copy.onboarding.cards.map((c, i) => ({ ...c, art: ART[i] }));

export function Onboarding() {
  const router = useRouter();
  const hydrated = useGame((s) => s.hydrated);
  const onboarded = useGame((s) => s.onboarded);
  const locked = useGame((s) => s.locked);
  const lineup = useGame((s) => s.lineup);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [forceIntro, setForceIntro] = useState<boolean | null>(null);

  useEffect(() => {
    // Read once on mount; `?intro` replays the cards for returning managers.
    const id = setTimeout(() => setForceIntro(new URLSearchParams(window.location.search).has("intro")), 0);
    return () => clearTimeout(id);
  }, []);

  const returning = hydrated && forceIntro === false && onboarded;
  useEffect(() => {
    if (!returning) return;
    router.replace(locked ? routes.live : lineup ? routes.pick : routes.squad);
  }, [returning, locked, lineup, router]);

  if (!hydrated || forceIntro === null || returning) {
    return (
      <div className="grid flex-1 place-items-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: dur.slow, ease }}>
          <Logo size={56} />
        </motion.div>
      </div>
    );
  }

  const go = (next: number) => {
    if (next < 0 || next >= CARDS.length) return;
    haptic();
    setDir(next > i ? 1 : -1);
    setI(next);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(i + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(i - 1);
  };

  const last = i === CARDS.length - 1;
  const card = CARDS[i];

  return (
    <div className="flex min-h-dvh flex-col lg:mx-auto lg:w-full lg:max-w-[440px] lg:py-6">
      <header className="pt-safe flex h-16 items-center justify-between px-5">
        <span className="flex items-center gap-2.5">
          <Logo size={30} decorative />
          <Wordmark />
        </span>
        {!last && (
          <button onClick={() => go(CARDS.length - 1)} className="h-10 px-2 text-[13px] font-medium text-muted-foreground">
            {copy.onboarding.skip}
          </button>
        )}
      </header>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.section
            key={i}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 80, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -80, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: dur.slow, ease }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            className="flex flex-1 touch-pan-y flex-col px-5"
          >
            <div className="grid flex-1 place-items-center py-4">{card.art}</div>
            <div className="pb-2">
              <p className="num text-label font-semibold uppercase text-muted-foreground">
                {i + 1} / {CARDS.length}
              </p>
              <h1 className="mt-2 font-display text-[38px] font-bold uppercase leading-[0.95] tracking-tight">{card.title}</h1>
              <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="pb-safe px-5 pt-4">
        <div className="mb-5 flex gap-1.5" role="tablist" aria-label="Intro cards">
          {CARDS.map((c, n) => (
            <button key={c.title} role="tab" aria-selected={n === i} aria-label={c.title} onClick={() => go(n)} className="h-6 flex-1">
              <span className="block h-1 overflow-hidden rounded-full bg-surface-3">
                <motion.span className="block h-full bg-brand" initial={false} animate={{ width: n <= i ? "100%" : "0%" }} transition={{ duration: dur.slow, ease }} />
              </span>
            </button>
          ))}
        </div>
        <Button
          size="cta"
          className="w-full"
          onClick={() => {
            if (last) {
              haptic(12);
              router.push(routes.squad);
            } else go(i + 1);
          }}
        >
          {last ? copy.onboarding.start : copy.onboarding.next} <ArrowRight />
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">{copy.onboarding.free}</p>
      </footer>
    </div>
  );
}

/* ------------------------------ Art ------------------------------ */

function SquadArt() {
  const rows: [string, Sector][][] = [
    [["SPYx", "Index"]],
    [["AAPLx", "Big Tech"], ["MSFTx", "Big Tech"], ["JPMx", "Finance"], ["WMTx", "Consumer"]],
    [["NVDAx", "Chips"], ["PLTRx", "Software"], ["LLYx", "Health"]],
    [["TSLAx", "Mobility"], ["COINx", "Crypto"]],
  ];
  const labels = [copy.positions.ETF.label, copy.positions.BLUE.label, copy.positions.GROWTH.label, copy.positions.RISK.label];
  let n = 0;
  return (
    <Pitch className="w-full max-w-[320px]">
      <div className="flex flex-col gap-3.5 px-3 py-5">
        {rows.map((r, ri) => (
          <div key={ri} className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">{labels[ri]}</span>
            <div className="flex gap-2.5">
              {r.map(([t, sector]) => (
                <motion.div key={t} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.08 + n++ * 0.05 }} className="flex flex-col items-center gap-1">
                  <StockAvatar ticker={t} sector={sector} size={38} inverted />
                  <span className="rounded bg-black/80 px-1 font-mono text-[9px] font-semibold text-white">{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Pitch>
  );
}

function ArmbandArt() {
  const steps = [
    { k: "move", node: <span className="text-bull">+1.8%</span>, label: copy.onboarding.armband.move },
    { k: "pts", node: <span>18 pts</span>, label: copy.onboarding.armband.x10 },
    { k: "cap", node: <span className="text-gold">36 pts</span>, label: copy.onboarding.armband.captain },
  ];
  return (
    <div className="flex w-full max-w-[320px] flex-col items-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="relative">
        <StockAvatar ticker="NVDAx" sector="Chips" size={112} inverted />
        <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.35 }} className="absolute -right-4 -top-3">
          <CaptainBadge role="C" size={40} shineKey="intro" className="shadow-[0_0_0_4px_var(--background),0_0_28px_rgb(245_196_81/0.5)]" />
        </motion.span>
      </motion.div>
      <p className="mt-4 font-mono text-sm font-semibold">NVDAx</p>
      <div className="mt-6 flex w-full items-stretch justify-between gap-2">
        {steps.map((s, n) => (
          <motion.div
            key={s.k}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + n * 0.25, duration: dur.slow, ease }}
            className={cn("flex flex-1 flex-col items-center rounded-2xl bg-surface-1 py-3 ring-1 ring-inset ring-hairline", n === 2 && "ring-gold/50")}
          >
            <span className="num font-display text-xl font-bold">{s.node}</span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LeagueArt() {
  const base = [
    { id: "a", team: "Dividend FC", pts: 342 },
    { id: "b", team: "Short Squeeze Utd", pts: 338 },
    { id: "you", team: "Your XI", pts: 331 },
    { id: "c", team: "Paper Hands XI", pts: 327 },
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 1400);
    return () => clearInterval(t);
  }, []);
  const boost = [0, 9, 15, 0][step];
  const rows = base.map((r) => (r.id === "you" ? { ...r, pts: r.pts + boost } : r)).sort((a, b) => b.pts - a.pts);
  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="font-display text-sm font-bold uppercase">Office Legends</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-1.5 animate-live-dot rounded-full bg-foreground" /> Live
        </span>
      </div>
      {rows.map((r, n) => {
        const was = base.findIndex((b) => b.id === r.id);
        return (
          <motion.div key={r.id} layout transition={spring} className={cn("flex items-center gap-3 px-4 py-3", r.id === "you" && "bg-foreground/[0.06]")}>
            <span className={cn("num w-4 text-sm font-semibold", n === 0 && "text-gold")}>{n + 1}</span>
            <RankDelta delta={was - n} />
            <span className={cn("flex-1 truncate text-[13px] font-medium", r.id === "you" && "font-semibold")}>{r.team}</span>
            <span className="num text-[13px] font-semibold">{r.pts}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
