"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { EyeOff, Loader2, Lock, Play, Sparkles, Unlock } from "lucide-react";
import { toast } from "sonner";
import { lockSquad, type GameweekKind, type Position } from "@/lib/data";
import { POSITIONS, formation } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { credits } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useGame } from "@/lib/store/game";
import { useLineup } from "@/lib/hooks/use-lineup";
import { useGameweek } from "@/lib/hooks/use-gameweek";
import { useKickoff } from "@/lib/hooks/use-kickoff";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ScreenGrid, TopBar } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { Countdown } from "@/components/game/countdown";
import { CaptainBadge } from "@/components/game/captain-badge";
import { SealedCard } from "@/components/game/sealed-card";
import { EmptyState, ErrorState, Shimmer } from "@/components/states/states";

const t = copy.lock;
const fmtTime = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });

export function DeadlineLock() {
  const router = useRouter();
  const hydrated = useGame((s) => s.hydrated);
  const kind = useGame((s) => s.gameweekKind);
  const setKind = useGame((s) => s.setGameweekKind);
  const locked = useGame((s) => s.locked);
  const lock = useGame((s) => s.lock);
  const unlock = useGame((s) => s.unlock);
  const kickoff = useGame((s) => s.kickoff);
  const chip = useGame((s) => s.chip);
  const demo = useGame((s) => s.demoMode);
  const { lineup, posOf, validation, stocks } = useLineup();
  const gw = useGameweek(locked?.kind ?? kind);
  const { kickoffAt } = useKickoff(locked);
  const [locking, setLocking] = useState(false);
  const [justLocked, setJustLocked] = useState(false);

  if (!hydrated || stocks.status === "loading") return <LockSkeleton />;
  if (stocks.status === "error") {
    return (
      <>
        <TopBar back={routes.pick} title={t.title} />
        <ErrorState title={copy.errors.team.title} message={copy.errors.team.body} onRetry={stocks.retry} />
      </>
    );
  }
  if (!lineup || !validation.valid) {
    return (
      <>
        <TopBar title={t.title} />
        <EmptyState
          className="flex-1 justify-center pb-28"
          title={t.nothingTitle}
          body={t.nothingBody}
          action={
            <Button asChild size="cta" className="w-full">
              <Link href={routes.squad}>{copy.squad.title}</Link>
            </Button>
          }
        />
        <TabBar />
      </>
    );
  }

  const gameweek = gw.gameweek;
  const ticker = (id: string) => stocks.byId.get(id)!.ticker;
  const shown = locked?.lineup ?? lineup;

  const doLock = async () => {
    if (!gameweek) return;
    haptic(14);
    setLocking(true);
    try {
      const receipt = await lockSquad({ gameweekId: gameweek.id, lineup, chip });
      lock({ receipt, kind: gameweek.kind, gameweekNumber: gameweek.number, start: gameweek.start, end: gameweek.end, lineup });
      setJustLocked(true);
      haptic(30);
    } catch {
      toast(copy.errors.lock.title, { description: copy.errors.lock.body, action: { label: copy.common.retry, onClick: () => void doLock() } });
    } finally {
      setLocking(false);
    }
  };

  const goLive = () => {
    haptic(16);
    if (!kickoffAt) kickoff(Date.now());
    router.push(routes.live);
  };

  /* ---------------- Locked ---------------- */
  if (locked) {
    const start = new Date(locked.start).getTime();
    const rows = POSITIONS.map((p) => shown.starters.filter((id) => posOf(id) === p).map(ticker));
    const liveCta = kickoffAt ? (
      <Button size="cta" className="w-full" onClick={goLive}>
        <Play className="fill-current" /> {t.watchLive}
      </Button>
    ) : demo ? (
      <Button size="cta" className="w-full" onClick={goLive}>
        <Play className="fill-current" /> {t.demoStart}
      </Button>
    ) : null;
    const unlockBtn = !kickoffAt && (
      <Button
        variant="ghost"
        size="sm"
        className="mx-auto mt-1 flex h-11 text-[13px] text-muted-foreground"
        onClick={() => {
          unlock();
          setJustLocked(false);
          toast(t.unlocked, { description: t.unlockedBody });
        }}
      >
        <Unlock /> {t.unlock}
      </Button>
    );

    return (
      <>
        <TopBar back={routes.pick} title={t.lockedHeader} subtitle={`${copy.live.gameweek(locked.gameweekNumber)} · ${locked.kind === "daily" ? t.daily : t.flash}`} />
        <main className="flex flex-1 flex-col px-4 pb-4 lg:px-0 lg:pb-10">
          <ScreenGrid
            main={
              <div className="flex flex-col items-center text-center">
                <SealedCard rows={rows} captain={ticker(shown.captainId)} sealId={locked.receipt.sealId} animate={justLocked} className="mt-4" />
                <motion.div initial={justLocked ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: justLocked ? 1.4 : 0, duration: dur.slow, ease }}>
                  <h2 className="mt-6 font-display text-[30px] font-bold uppercase tracking-tight">{t.lockedTitle}</h2>
                  <p className="mx-auto mt-1.5 max-w-[32ch] text-sm text-muted-foreground">{t.lockedBody}</p>
                  {locked.chip && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold">
                      <Sparkles className="size-3.5 text-brand" /> {t.chipOn(copy.chipName[locked.chip])}
                    </p>
                  )}
                </motion.div>
              </div>
            }
            aside={
              <>
                {kickoffAt ? (
                  <p className="rounded-3xl bg-surface-1 px-4 py-5 text-center text-sm text-muted-foreground ring-1 ring-inset ring-hairline">{t.isLive}</p>
                ) : (
                  <div className="rounded-3xl bg-surface-1 px-4 py-5 text-center ring-1 ring-inset ring-hairline">
                    <p className="mb-3 text-label font-semibold uppercase text-muted-foreground">{t.kicksOffIn}</p>
                    <Countdown to={start} brand />
                    <p className="mt-3 text-xs text-muted-foreground">{t.runs(fmtTime(locked.start), fmtTime(locked.end))}</p>
                  </div>
                )}
                <div className="hidden lg:block">
                  {liveCta}
                  {unlockBtn}
                </div>
              </>
            }
          />
        </main>
        {(liveCta || unlockBtn) && (
          <BottomBar>
            {liveCta}
            {unlockBtn}
          </BottomBar>
        )}
        {!liveCta && <TabBar />}
      </>
    );
  }

  /* ---------------- Not locked ---------------- */
  const deadline = gameweek ? new Date(gameweek.deadline).getTime() : 0;
  const lockBtn = (
    <Button size="cta" className="w-full" disabled={!gameweek || locking} onClick={doLock}>
      {locking ? <Loader2 className="animate-spin" /> : <Lock />}
      {locking ? t.locking : t.lock}
    </Button>
  );

  return (
    <>
      <TopBar back={routes.pick} title={t.title} subtitle={t.subtitle} />
      <main className="flex flex-1 flex-col px-4 pb-2 lg:px-0 lg:pb-10">
        <ScreenGrid
          main={
            <>
              <Segmented<GameweekKind>
                id="gw-kind"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "daily", label: t.daily },
                  { value: "flash", label: t.flash },
                ]}
              />
              <section className="rounded-3xl bg-surface-1 px-4 py-6 text-center ring-1 ring-inset ring-hairline">
                <AnimatePresence mode="wait" initial={false}>
                  {gw.error ? (
                    <ErrorState key="err" title={copy.errors.gameweek.title} message={copy.errors.gameweek.body} onRetry={gw.retry} className="py-2" />
                  ) : !gameweek ? (
                    <motion.div key="load" exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                      <Shimmer className="h-3 w-40" />
                      <Shimmer className="h-14 w-60" />
                      <Shimmer className="h-3 w-48" />
                    </motion.div>
                  ) : (
                    <motion.div key={gameweek.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur.base }}>
                      <p className="mb-3 text-label font-semibold uppercase text-muted-foreground">{t.deadline(gameweek.number)}</p>
                      <Countdown to={deadline} brand />
                      <p className="mt-3 text-xs text-muted-foreground">{t.runs(fmtTime(gameweek.start), fmtTime(gameweek.end))}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
              <LineupSummary starters={lineup.starters} bench={lineup.bench} captainId={lineup.captainId} viceId={lineup.viceId} ticker={ticker} posOf={posOf} creditsUsed={validation.creditsUsed} />
            </>
          }
          aside={
            <>
              {chip && (
                <Link href={routes.chips} className="flex items-center gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-[13px] font-semibold ring-1 ring-inset ring-brand/50">
                  <Sparkles className="size-4 text-brand" /> {t.chipOn(copy.chipName[chip])}
                </Link>
              )}
              <p className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
                <EyeOff className="size-3.5" /> {t.hidden}
              </p>
              <div className="hidden lg:block">{lockBtn}</div>
            </>
          }
        />
      </main>
      <BottomBar>{lockBtn}</BottomBar>
    </>
  );
}

function LineupSummary({
  starters,
  bench,
  captainId,
  viceId,
  ticker,
  posOf,
  creditsUsed,
}: {
  starters: string[];
  bench: string[];
  captainId: string;
  viceId: string;
  ticker: (id: string) => string;
  posOf: (id: string) => Position | undefined;
  creditsUsed: number;
}) {
  const rows = POSITIONS.map((p) => starters.filter((id) => posOf(id) === p));
  return (
    <section className="w-full rounded-3xl bg-surface-1 p-4 text-left ring-1 ring-inset ring-hairline">
      <div className="flex items-center justify-between">
        <p className="font-display text-[17px] font-bold uppercase">
          {t.yourXI} <span className="num ml-1 text-muted-foreground">{formation(starters, posOf)}</span>
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <span className="num font-semibold text-foreground">{credits(creditsUsed)}</span> {copy.common.credits}
          </span>
          <Link href={routes.pick} className="flex h-11 items-center font-semibold text-foreground underline-offset-4 hover:underline">
            {copy.common.edit}
          </Link>
        </div>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((ids, i) => (
          <div key={i} className="flex flex-wrap justify-center gap-1.5">
            {ids.map((id) => (
              <Pill key={id} ticker={ticker(id)} role={id === captainId ? "C" : id === viceId ? "V" : undefined} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-hairline pt-3">
        <p className="mb-2 text-center text-label font-semibold uppercase text-muted-foreground">{t.bench}</p>
        <div className="flex flex-wrap justify-center gap-1.5 opacity-60">
          {bench.map((id) => (
            <Pill key={id} ticker={ticker(id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Pill({ ticker, role }: { ticker: string; role?: "C" | "V" }) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 ring-1 ring-inset ring-hairline", role && "pr-1.5", role === "C" && "ring-gold/60")}>
      <span className="font-mono text-xs font-semibold">{ticker}</span>
      {role && <CaptainBadge role={role} size={14} className="shadow-none" />}
    </span>
  );
}

function LockSkeleton() {
  return (
    <>
      <TopBar back={routes.pick} title={t.title} />
      <main className="flex flex-1 flex-col gap-3 px-4 lg:px-0" aria-busy>
        <Shimmer className="h-11 rounded-xl" />
        <Shimmer className="h-[160px] rounded-3xl" />
        <Shimmer className="h-[190px] rounded-3xl" />
      </main>
    </>
  );
}
