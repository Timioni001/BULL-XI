"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { Gameweek, LiveGameweekSnapshot, Position, Stock } from "@/lib/data/types";
import type { LiveGameweekInput } from "@/lib/data";
import { CHIP_META, POSITIONS } from "@/lib/game/rules";
import { clock, ordinal, pct, signed, tone } from "@/lib/format";
import { useGame, type LockedEntry } from "@/lib/store/game";
import { useStocks } from "@/lib/hooks/use-stocks";
import { useLiveGameweek } from "@/lib/hooks/use-live-gameweek";
import { useFlash } from "@/lib/hooks/use-flash";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { TabBar } from "@/components/layout/tab-bar";
import { Logo } from "@/components/brand/logo";
import { Pitch, PitchRow } from "@/components/pitch/pitch";
import { BenchStrip } from "@/components/pitch/bench-strip";
import { LiveSlot } from "@/components/live/live-slot";
import { PointsTicker } from "@/components/live/points-ticker";
import { RankDelta } from "@/components/live/rank-delta";
import { EventFeed } from "@/components/live/event-feed";
import { MiniTable } from "@/components/live/mini-table";
import { StockDetailSheet } from "@/components/stock/stock-detail-sheet";
import { EmptyState, ErrorState, PitchSkeleton, Shimmer } from "@/components/states/states";

export function LiveGameweek() {
  const hydrated = useGame((s) => s.hydrated);
  const locked = useGame((s) => s.locked);
  const hedgeId = useGame((s) => s.hedgeId);
  const teamName = useGame((s) => s.teamName);
  const stocks = useStocks();

  const input = useMemo<LiveGameweekInput | null>(() => (locked?.kickoffAt ? toInput(locked, hedgeId, teamName) : null), [locked, hedgeId, teamName]);
  const live = useLiveGameweek(input);

  if (!hydrated) return <LiveSkeleton />;

  if (!locked || !locked.kickoffAt) {
    return (
      <>
        <LiveHeader />
        <EmptyState
          className="flex-1 justify-center pb-24"
          icon={<Activity className="size-7 text-muted-foreground" />}
          title={locked ? "Your squad is locked in" : "You're not in this gameweek"}
          body={locked ? "Points start ticking at kickoff. Head to the deadline screen to watch it go live." : "Build a squad and lock it before the deadline to score live points."}
          action={
            <Button asChild size="cta" className="w-full">
              <Link href={locked ? "/lock" : "/squad"}>{locked ? "Go to kickoff" : "Build your squad"}</Link>
            </Button>
          }
        />
        <TabBar />
      </>
    );
  }

  if (live.error || stocks.status === "error") {
    return (
      <>
        <LiveHeader gameweek={locked.gameweekNumber} />
        <ErrorState
          className="flex-1 justify-center pb-24"
          title="Live scores paused"
          message={live.error?.message ?? stocks.error?.message}
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

  return <LiveView snapshot={live.snapshot} locked={locked} byId={stocks.byId} />;
}

function toInput(locked: LockedEntry, hedgeId: string | null, teamName: string): LiveGameweekInput {
  const length = new Date(locked.end).getTime() - new Date(locked.start).getTime();
  const start = locked.kickoffAt!;
  const gameweek: Gameweek = {
    id: locked.receipt.gameweekId,
    number: locked.gameweekNumber,
    kind: locked.kind,
    deadline: new Date(start).toISOString(),
    start: new Date(start).toISOString(),
    end: new Date(start + length).toISOString(),
    status: "live",
  };
  return { gameweek, lineup: locked.lineup, chip: locked.chip, hedgeId, kickoffAt: start, teamName };
}

/* ------------------------------------------------------------------ */

function LiveView({ snapshot, locked, byId }: { snapshot: LiveGameweekSnapshot; locked: LockedEntry; byId: Map<string, Stock> }) {
  const [detail, setDetail] = useState<Stock | null>(null);
  const lineup = locked.lineup;
  const posOf = (id: string) => byId.get(id)!.position;
  const rows: Record<Position, string[]> = { ETF: [], BLUE: [], GROWTH: [], RISK: [] };
  for (const id of lineup.starters) rows[posOf(id)].push(id);
  const totalFlash = useFlash(snapshot.totalPoints);
  const glow = totalFlash ? (totalFlash.dir > 0 ? "up" : "down") : null;
  const benchCounts = snapshot.chip === "benchBoost";

  return (
    <>
      <LiveHeader gameweek={snapshot.gameweek.number} endsAt={snapshot.endsAt} startedAt={snapshot.startedAt} />

      <main className="flex flex-col gap-3 px-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
        <Scoreboard snapshot={snapshot} flash={totalFlash} />

        <Pitch glow={glow}>
          <div className="flex flex-col gap-4 px-1 py-4">
            {POSITIONS.map((pos) => (
              <PitchRow key={pos}>
                {rows[pos].map((id) => (
                  <LiveSlot
                    key={id}
                    stock={byId.get(id)!}
                    position={pos}
                    score={snapshot.scores[id]}
                    role={id === snapshot.effectiveCaptainId ? "C" : id === lineup.viceId ? "V" : null}
                    onClick={() => setDetail(byId.get(id)!)}
                  />
                ))}
              </PitchRow>
            ))}
          </div>
        </Pitch>

        <BenchStrip note={benchCounts ? "Bench Boost: bench points count" : "Bench points don't count"}>
          {lineup.bench.map((id) => (
            <LiveSlot key={id} stock={byId.get(id)!} position={posOf(id)} score={snapshot.scores[id]} bench={!benchCounts} onClick={() => setDetail(byId.get(id)!)} />
          ))}
        </BenchStrip>

        <section>
          <SectionTitle title="Match centre" right={<span className="flex items-center gap-1.5"><span className="size-1.5 animate-live-dot rounded-full bg-foreground" /> Live</span>} />
          <div className="rounded-2xl bg-surface-1 px-4 ring-1 ring-inset ring-hairline">
            {snapshot.events.length <= 1 ? (
              <p className="py-4 text-center text-[13px] text-muted-foreground">Kicked off. Big moves from your XI will show up here.</p>
            ) : (
              <EventFeed events={snapshot.events} startedAt={snapshot.startedAt} />
            )}
          </div>
        </section>

        <section>
          <SectionTitle title={snapshot.leagueName} right={`${snapshot.standings.length} managers`} />
          <MiniTable standings={snapshot.standings} />
        </section>

        <p className="px-4 pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          Live points use the latest price vs kickoff. Final points settle on the gameweek&apos;s average price, so one spike can&apos;t decide it.
        </p>
      </main>

      <TabBar />
      <StockDetailSheet stock={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function LiveHeader({ gameweek, endsAt, startedAt }: { gameweek?: number; endsAt?: number; startedAt?: number }) {
  const now = useNow();
  const left = endsAt && now ? clock(endsAt - now) : null;
  const progress = endsAt && startedAt && now ? Math.min(1, (now - startedAt) / (endsAt - startedAt)) : 0;
  return (
    <header className="pt-safe sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4">
        <Logo size={26} />
        <div className="flex flex-1 items-center gap-2">
          <span className="text-[17px] font-semibold tracking-tight">{gameweek ? `Gameweek ${gameweek}` : "Live"}</span>
          {endsAt && (
            <span className="inline-flex h-5 items-center gap-1.5 rounded-full bg-foreground px-2 text-[10px] font-bold tracking-[0.12em] text-background">
              <span className="size-1.5 animate-live-dot rounded-full bg-background" /> LIVE
            </span>
          )}
        </div>
        {left && (
          <div className="text-right">
            <p className="num font-mono text-sm font-semibold leading-tight">
              {left.d * 24 + Number(left.h)}:{left.m}:{left.s}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">left</p>
          </div>
        )}
      </div>
      {endsAt && (
        <div className="h-px bg-hairline">
          <div className="h-px bg-foreground/60 transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </header>
  );
}

function Scoreboard({ snapshot, flash }: { snapshot: LiveGameweekSnapshot; flash: ReturnType<typeof useFlash> }) {
  const rankDelta = snapshot.yourLastRank - snapshot.yourRank;
  const rankFlash = useFlash(-snapshot.yourRank);
  const total = snapshot.totalPoints;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
      <div className="grid grid-cols-[1fr_auto] gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="text-label font-semibold uppercase text-muted-foreground">Gameweek points</p>
          <div className="relative mt-2 flex items-end gap-2">
            <PointsTicker value={total} className={cn("text-mega font-semibold tracking-tighter transition-colors duration-300", total < 0 && "text-bear")} />
            <AnimatePresence>
              {flash && (
                <motion.span
                  key={flash.key}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -18 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className={cn("num mb-2 text-base font-bold", flash.dir > 0 ? "text-bull" : "text-bear")}
                >
                  {signed(flash.delta)}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="text-right">
          <p className="text-label font-semibold uppercase text-muted-foreground">League rank</p>
          <div className="mt-2 flex items-center justify-end gap-2">
            <motion.span
              key={rankFlash?.key ?? 0}
              initial={rankFlash ? { scale: 1.25, color: rankFlash.dir > 0 ? "var(--bull)" : "var(--bear)" } : false}
              animate={{ scale: 1, color: snapshot.yourRank === 1 ? "var(--gold)" : "var(--foreground)" }}
              transition={{ duration: 0.6, ease }}
              className="num origin-right text-stat font-semibold tracking-tight"
            >
              {ordinal(snapshot.yourRank)}
            </motion.span>
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <RankDelta delta={rankDelta} size="md" />
            <span>since kickoff</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-hairline border-t border-hairline text-center">
        <Mini label="Market" value={<span className={tone(snapshot.benchmarkPct)}>{pct(snapshot.benchmarkPct)}</span>} sub="SPYx" />
        <Mini label="Captain" value={<span className={tone(snapshot.scores[snapshot.effectiveCaptainId]?.counted ?? 0)}>{signed(snapshot.scores[snapshot.effectiveCaptainId]?.counted ?? 0)}</span>} sub={`${snapshot.scores[snapshot.effectiveCaptainId]?.multiplier ?? 2}x points`} />
        <Mini label="Chip" value={snapshot.chip ? CHIP_META[snapshot.chip].name : "None"} sub={snapshot.chip ? "Active" : "Saved for later"} />
      </div>
    </section>
  );
}

function Mini({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="px-2 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num mt-0.5 truncate text-sm font-semibold">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-2 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {right && <span className="text-xs text-muted-foreground">{right}</span>}
    </div>
  );
}

function LiveSkeleton({ gameweek }: { gameweek?: number }) {
  return (
    <>
      <LiveHeader gameweek={gameweek} />
      <main className="flex flex-col gap-3 px-4" aria-busy>
        <Shimmer className="h-[178px] rounded-3xl" />
        <PitchSkeleton rows={[1, 4, 4, 2]} />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: dur.slow }} className="text-center text-xs text-muted-foreground">
          Connecting to the live feed...
        </motion.p>
      </main>
      <TabBar />
    </>
  );
}
