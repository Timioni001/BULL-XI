"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Activity, Flag, Info } from "lucide-react";
import type { Gameweek, GameweekResult, LiveGameweekSnapshot, Position, Stock } from "@/lib/data/types";
import type { LiveGameweekInput } from "@/lib/data";
import { POSITIONS } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { clock, ordinal, pct, signed, tone } from "@/lib/format";
import { useGame, type LockedEntry } from "@/lib/store/game";
import { useStocks } from "@/lib/hooks/use-stocks";
import { useLiveGameweek } from "@/lib/hooks/use-live-gameweek";
import { useKickoff } from "@/lib/hooks/use-kickoff";
import { useFlash } from "@/lib/hooks/use-flash";
import { useNow } from "@/lib/hooks/use-now";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { Logo } from "@/components/brand/logo";
import { Pitch, PitchRow } from "@/components/pitch/pitch";
import { BenchStrip } from "@/components/pitch/bench-strip";
import { LiveSlot } from "@/components/live/live-slot";
import { PointsTicker } from "@/components/live/points-ticker";
import { RankDelta } from "@/components/live/rank-delta";
import { EventFeed } from "@/components/live/event-feed";
import { MiniTable } from "@/components/live/mini-table";
import { HowItWorksSheet } from "@/components/game/how-it-works-sheet";
import { ResultSheet } from "@/components/game/result-sheet";
import { useStockSheets } from "@/components/stock/stock-sheets";
import { EmptyState, ErrorState, PitchSkeleton, Shimmer } from "@/components/states/states";

const t = copy.live;

export function LiveGameweek() {
  const router = useRouter();
  const hydrated = useGame((s) => s.hydrated);
  const locked = useGame((s) => s.locked);
  const results = useGame((s) => s.results);
  const teamName = useGame((s) => s.teamName);
  const stocks = useStocks();
  const { kickoffAt } = useKickoff(locked);
  const [resultOpen, setResultOpen] = useState(false);

  const input = useMemo<LiveGameweekInput | null>(() => (locked && kickoffAt ? toInput(locked, kickoffAt, teamName) : null), [locked, kickoffAt, teamName]);
  const live = useLiveGameweek(input);
  const lastResult = results[0] ?? null;

  const resultSheet = (
    <ResultSheet
      result={lastResult}
      open={resultOpen}
      onOpenChange={setResultOpen}
      onNext={() => {
        setResultOpen(false);
        router.push(routes.pick);
      }}
    />
  );

  if (!hydrated) return <LiveSkeleton />;

  if (!locked || !kickoffAt) {
    return (
      <>
        <LiveHeader />
        <EmptyState
          className="flex-1 justify-center pb-28"
          icon={<Activity className="size-7 text-brand" />}
          title={locked ? t.lockedTitle : t.notInTitle}
          body={locked ? t.lockedBody : t.notInBody}
          action={
            <div className="flex flex-col gap-2">
              <Button asChild size="cta" className="w-full">
                <Link href={locked ? routes.lock : routes.squad}>{locked ? t.goToDeadline : t.build}</Link>
              </Button>
              {lastResult && (
                <Button size="cta" variant="secondary" className="w-full" onClick={() => setResultOpen(true)}>
                  {copy.result.title(lastResult.gameweek)}
                </Button>
              )}
            </div>
          }
        />
        <TabBar />
        {resultSheet}
      </>
    );
  }

  if (live.error || stocks.status === "error") {
    return (
      <>
        <LiveHeader gameweek={locked.gameweekNumber} />
        <ErrorState
          className="flex-1 justify-center pb-28"
          title={copy.errors.live.title}
          message={copy.errors.live.body}
          onRetry={() => {
            live.retry();
            stocks.retry();
          }}
        />
        <TabBar />
      </>
    );
  }

  if (!live.snapshot || stocks.status !== "success") return <LiveSkeleton gameweek={locked.gameweekNumber} />;

  return <LiveView snapshot={live.snapshot} locked={locked} byId={stocks.byId} onResult={() => setResultOpen(true)} resultSheet={resultSheet} />;
}

function toInput(locked: LockedEntry, kickoffAt: number, teamName: string): LiveGameweekInput {
  // Sealed onchain: the real schedule and the onchain table.
  if (locked.onchain) {
    const gameweek: Gameweek = { id: locked.receipt.gameweekId, number: locked.gameweekNumber, kind: locked.kind, deadline: locked.start, start: locked.start, end: locked.end, status: "live" };
    const onchain = { gameweek: locked.onchain.gameweek, address: locked.onchain.address };
    return { gameweek, lineup: locked.lineup, chip: locked.chip, hedgeId: locked.hedgeId, kickoffAt: new Date(locked.start).getTime(), teamName, transferHit: locked.transferHit, onchain };
  }
  const length = new Date(locked.end).getTime() - new Date(locked.start).getTime();
  const gameweek: Gameweek = {
    id: locked.receipt.gameweekId,
    number: locked.gameweekNumber,
    kind: locked.kind,
    deadline: new Date(kickoffAt).toISOString(),
    start: new Date(kickoffAt).toISOString(),
    end: new Date(kickoffAt + length).toISOString(),
    status: "live",
  };
  return { gameweek, lineup: locked.lineup, chip: locked.chip, hedgeId: locked.hedgeId, kickoffAt, teamName, transferHit: locked.transferHit };
}

/** Freeze the current snapshot into a result. Later: read the settled result onchain. */
function toResult(s: LiveGameweekSnapshot, locked: LockedEntry, byId: Map<string, Stock>, teamName: string): GameweekResult {
  const starters = locked.lineup.starters;
  const best = starters.reduce((a, b) => ((s.scores[b]?.points ?? -99) > (s.scores[a]?.points ?? -99) ? b : a));
  const cap = s.effectiveCaptainId;
  return {
    gameweek: s.gameweek.number,
    kind: s.gameweek.kind,
    points: s.totalPoints,
    rank: s.yourRank,
    leagueName: s.leagueName,
    leagueSize: s.standings.length,
    bestPick: { ticker: byId.get(best)!.ticker, points: s.scores[best]?.points ?? 0 },
    captain: { ticker: byId.get(cap)!.ticker, points: s.scores[cap]?.counted ?? 0 },
    teamName,
    chip: s.chip,
    finishedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */

function LiveView({ snapshot, locked, byId, onResult, resultSheet }: { snapshot: LiveGameweekSnapshot; locked: LockedEntry; byId: Map<string, Stock>; onResult: () => void; resultSheet: React.ReactNode }) {
  const { openStock } = useStockSheets();
  const demo = useGame((s) => s.demoMode);
  const teamName = useGame((s) => s.teamName);
  const finishGameweek = useGame((s) => s.finishGameweek);
  const [howOpen, setHowOpen] = useState(false);
  const now = useNow();
  const ended = !!now && now >= snapshot.endsAt;

  const lineup = locked.lineup;
  const posOf = (id: string) => byId.get(id)!.position;
  const rows: Record<Position, string[]> = { ETF: [], BLUE: [], GROWTH: [], RISK: [] };
  for (const id of lineup.starters) rows[posOf(id)].push(id);
  const totalFlash = useFlash(snapshot.totalPoints);
  const glow = totalFlash ? (totalFlash.dir > 0 ? "up" : "down") : null;
  const benchCounts = snapshot.chip === "benchBoost";

  const blowWhistle = () => {
    haptic(30);
    finishGameweek(toResult(snapshot, locked, byId, teamName));
    onResult();
  };

  const sidebar = (
    <>
      <section>
        <SectionTitle title={t.matchCentre} right={<span className="flex items-center gap-1.5"><span className="size-1.5 animate-live-dot rounded-full bg-foreground" /> {copy.common.live}</span>} />
        <div className="rounded-3xl bg-surface-1 px-4 ring-1 ring-inset ring-hairline">
          {snapshot.events.length <= 1 ? <p className="py-4 text-center text-[13px] text-muted-foreground">{t.kickedOff}</p> : <EventFeed events={snapshot.events} startedAt={snapshot.startedAt} />}
        </div>
      </section>
      <section>
        <SectionTitle title={snapshot.leagueName} right={t.managers(snapshot.standings.length)} />
        <MiniTable standings={snapshot.standings} />
      </section>
      <p className="px-2 pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">{t.twapNote}</p>
    </>
  );

  return (
    <>
      <LiveHeader
        gameweek={snapshot.gameweek.number}
        endsAt={snapshot.endsAt}
        startedAt={snapshot.startedAt}
        ended={ended}
        right={
          <button onClick={() => setHowOpen(true)} aria-label={t.howItWorks} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:text-foreground">
            <Info className="size-5" />
          </button>
        }
      />
      <TickerStrip snapshot={snapshot} lineup={[...lineup.starters, ...lineup.bench]} byId={byId} />

      <main className="flex flex-col gap-3 px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex min-w-0 flex-col gap-3">
          <Scoreboard snapshot={snapshot} flash={totalFlash} />

          {(ended || demo) && (
            <div className="flex gap-2">
              {ended ? (
                <Button size="cta" className="w-full" onClick={blowWhistle}>
                  <Flag /> {t.seeResult}
                </Button>
              ) : (
                <Button size="cta-sm" variant="secondary" className="w-full" onClick={blowWhistle}>
                  <Flag /> {t.demoFullTime}
                </Button>
              )}
            </div>
          )}

          <Pitch glow={glow}>
            <div className="flex flex-col gap-4 px-1 py-4 lg:gap-7 lg:py-7">
              {POSITIONS.map((pos) => (
                <PitchRow key={pos}>
                  {rows[pos].map((id) => (
                    <LiveSlot
                      key={id}
                      stock={byId.get(id)!}
                      position={pos}
                      score={snapshot.scores[id]}
                      role={id === snapshot.effectiveCaptainId ? "C" : id === lineup.viceId ? "V" : null}
                      golden={snapshot.goldenId === id}
                      onClick={() => openStock(byId.get(id)!)}
                    />
                  ))}
                </PitchRow>
              ))}
            </div>
          </Pitch>

          <BenchStrip label={copy.pick.bench} note={benchCounts ? t.benchCounts : t.benchNoCount}>
            {lineup.bench.map((id) => (
              <LiveSlot key={id} stock={byId.get(id)!} position={posOf(id)} score={snapshot.scores[id]} bench={!benchCounts} golden={snapshot.goldenId === id} onClick={() => openStock(byId.get(id)!)} />
            ))}
          </BenchStrip>

          <div className="flex flex-col gap-3 lg:hidden">{sidebar}</div>
        </div>
        <aside className="hidden flex-col gap-3 lg:sticky lg:top-6 lg:flex">{sidebar}</aside>
      </main>

      <TabBar />
      <HowItWorksSheet open={howOpen} onOpenChange={setHowOpen} />
      {resultSheet}
    </>
  );
}

/* ------------------------------------------------------------------ */

function LiveHeader({ gameweek, endsAt, startedAt, ended, right }: { gameweek?: number; endsAt?: number; startedAt?: number; ended?: boolean; right?: React.ReactNode }) {
  const now = useNow();
  const demo = useGame((s) => s.demoMode);
  const left = endsAt && now ? clock(endsAt - now) : null;
  const progress = endsAt && startedAt && now ? Math.min(1, (now - startedAt) / (endsAt - startedAt)) : 0;
  return (
    <header className="pt-safe sticky top-0 z-30 bg-background/85 backdrop-blur-xl lg:static lg:bg-transparent lg:backdrop-blur-none">
      <div className="flex h-14 items-center gap-3 px-4 lg:h-24 lg:px-0">
        <Logo size={26} className="lg:hidden" />
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="truncate font-display text-[19px] font-bold uppercase tracking-tight lg:text-[34px]">
            {gameweek ? (
              <>
                <span className="lg:hidden">{t.gameweekShort(gameweek)}</span>
                <span className="hidden lg:inline">{t.gameweek(gameweek)}</span>
              </>
            ) : (
              copy.nav.live
            )}
          </span>
          {endsAt && (
            <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold tracking-[0.14em]", ended ? "bg-surface-3 text-foreground" : "bg-brand text-brand-foreground shadow-[0_0_16px_var(--brand-glow)]")}>
              {!ended && <span className="size-1.5 animate-live-dot rounded-full bg-white" />}
              {ended ? t.fullTime : t.pill}
            </span>
          )}
          {demo && <span className="hidden rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand min-[400px]:inline">{copy.common.demoMode}</span>}
        </div>
        {left && !ended && (
          <div className="text-right">
            <p className="num font-mono text-sm font-semibold leading-tight">
              {left.d * 24 + Number(left.h)}:{left.m}:{left.s}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.left}</p>
          </div>
        )}
        {right}
      </div>
      {endsAt && (
        <div className="h-px bg-hairline lg:hidden">
          <div className="h-px bg-brand transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </header>
  );
}

/** Bloomberg-style crawl of your 15 stocks' moves since kickoff. */
function TickerStrip({ snapshot, lineup, byId }: { snapshot: LiveGameweekSnapshot; lineup: string[]; byId: Map<string, Stock> }) {
  const items = lineup.map((id) => ({ id, ticker: byId.get(id)!.ticker, p: snapshot.scores[id]?.pct ?? 0 }));
  const row = (dup: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={dup}>
      {items.map((it) => (
        <span key={it.id} className="flex items-center gap-1.5 px-3.5 font-mono text-[12px]">
          <span className="font-semibold text-foreground/90">{it.ticker}</span>
          <span className={cn("num", tone(it.p))}>
            {it.p > 0.005 ? "▲" : it.p < -0.005 ? "▼" : "·"} {pct(it.p)}
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden border-y border-hairline bg-surface-1/60 py-2 lg:rounded-full lg:border lg:px-2" aria-label={t.ticker}>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

function Scoreboard({ snapshot, flash }: { snapshot: LiveGameweekSnapshot; flash: ReturnType<typeof useFlash> }) {
  const rankDelta = snapshot.yourLastRank - snapshot.yourRank;
  const rankFlash = useFlash(-snapshot.yourRank);
  const total = snapshot.totalPoints;
  const cap = snapshot.scores[snapshot.effectiveCaptainId];
  return (
    <section className="theme-dark glow-brand relative overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#2a1d18_0%,#111112_55%)]">
      <div className="grid grid-cols-[1fr_auto] gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="text-label font-semibold uppercase text-muted-foreground">{t.gwPoints}</p>
          <div className="relative mt-2 flex items-end gap-2">
            <PointsTicker value={total} className={cn("font-display text-mega font-bold tracking-tighter", total < 0 && "text-bear")} />
            {flash && (
              <motion.span
                key={flash.key}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -18 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className={cn("num mb-2 font-display text-lg font-bold", flash.dir > 0 ? "text-bull" : "text-bear")}
              >
                {signed(flash.delta)}
              </motion.span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-label font-semibold uppercase text-muted-foreground">{t.leagueRank}</p>
          <motion.p
            key={rankFlash?.key ?? 0}
            initial={rankFlash ? { scale: 1.25, color: rankFlash.dir > 0 ? "var(--bull)" : "var(--bear)" } : false}
            animate={{ scale: 1, color: snapshot.yourRank === 1 ? "var(--gold)" : "var(--foreground)" }}
            transition={{ duration: 0.6, ease }}
            className="num mt-2 origin-right font-display text-stat font-bold tracking-tight"
          >
            {ordinal(snapshot.yourRank)}
          </motion.p>
          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <RankDelta delta={rankDelta} size="md" />
            <span>{t.sinceKickoff}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-hairline border-t border-hairline text-center">
        <Mini label={t.market} value={<span className={tone(snapshot.benchmarkPct)}>{pct(snapshot.benchmarkPct)}</span>} sub="SPYx" />
        <Mini label={t.captain} value={<span className={tone(cap?.counted ?? 0, 0)}>{signed(cap?.counted ?? 0)}</span>} sub={t.xPoints(cap?.multiplier ?? 2)} />
        <Mini label={t.chip} value={snapshot.chip ? copy.chipName[snapshot.chip] : t.noChip} sub={snapshot.chip ? t.chipActive : t.chipSaved} />
        <Mini
          label={t.golden}
          value={snapshot.goldenId ? <span className="font-mono text-gold">★ {tickerOf(snapshot.goldenId)}</span> : t.drawing}
          sub={snapshot.goldenId ? t.goldenSub : t.drawingSub}
        />
      </div>
    </section>
  );
}

const tickerOf = (id: string) => id.replace(/x$/, "").toUpperCase() + "x";

function Mini({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="px-2 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num mt-0.5 truncate text-sm font-semibold">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function LiveSkeleton({ gameweek }: { gameweek?: number }) {
  return (
    <>
      <LiveHeader gameweek={gameweek} />
      <main className="flex flex-col gap-3 px-4 pt-3 lg:px-0" aria-busy>
        <Shimmer className="h-[186px] rounded-[28px]" />
        <PitchSkeleton rows={[1, 4, 4, 2]} />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: dur.slow }} className="text-center text-xs text-muted-foreground">
          {t.connecting}
        </motion.p>
      </main>
      <TabBar />
    </>
  );
}
