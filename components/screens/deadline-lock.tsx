"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, Loader2, Lock, Play, Unlock } from "lucide-react";
import { toast } from "sonner";
import { lockSquad, type GameweekKind, type Position } from "@/lib/data";
import { POSITIONS, formation } from "@/lib/game/rules";
import { credits } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useGame } from "@/lib/store/game";
import { useLineup } from "@/lib/hooks/use-lineup";
import { useGameweek } from "@/lib/hooks/use-gameweek";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { TopBar } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { Countdown } from "@/components/game/countdown";
import { CaptainBadge } from "@/components/game/captain-badge";
import { Seal } from "@/components/game/seal";
import { EmptyState, ErrorState, Shimmer } from "@/components/states/states";

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
  const { lineup, posOf, validation, stocks } = useLineup();
  const gw = useGameweek(locked?.kind ?? kind);
  const [locking, setLocking] = useState(false);
  const [justLocked, setJustLocked] = useState(false);

  if (!hydrated || stocks.status === "loading") return <LockSkeleton />;
  if (stocks.status === "error") {
    return (
      <>
        <TopBar back="/pick" title="Deadline" />
        <ErrorState message={stocks.error.message} onRetry={stocks.retry} />
      </>
    );
  }
  if (!lineup || !validation.valid) {
    return (
      <>
        <TopBar title="Deadline" />
        <EmptyState
          className="flex-1 justify-center"
          title="Nothing to lock yet"
          body="Build your squad and pick a starting XI, then lock it in before the deadline."
          action={
            <Button asChild size="cta" className="w-full">
              <Link href="/squad">Build your squad</Link>
            </Button>
          }
        />
        <TabBar />
      </>
    );
  }

  const gameweek = gw.gameweek;
  const stock = (id: string) => stocks.byId.get(id)!;
  const shown = locked?.lineup ?? lineup;

  const doLock = async () => {
    if (!gameweek) return;
    haptic(14);
    setLocking(true);
    try {
      const receipt = await lockSquad({ gameweekId: gameweek.id, lineup, chip });
      lock({ receipt, kind: gameweek.kind, gameweekNumber: gameweek.number, start: gameweek.start, end: gameweek.end, lineup, chip });
      setJustLocked(true);
      haptic(30);
    } catch (e) {
      toast("Couldn't lock your squad", { description: (e as Error).message, action: { label: "Retry", onClick: () => void doLock() } });
    } finally {
      setLocking(false);
    }
  };

  const goLive = () => {
    haptic(16);
    kickoff(Date.now());
    router.push("/live");
  };

  if (locked) {
    const kickoffAt = new Date(locked.start).getTime();
    return (
      <>
        <TopBar back="/pick" title="Locked in" subtitle={`Gameweek ${locked.gameweekNumber} · ${locked.kind === "daily" ? "Daily · 24h" : "Flash · 1h"}`} />
        <main className="flex flex-1 flex-col items-center px-4 pb-4 text-center">
          <Seal sealId={locked.receipt.sealId} animate={justLocked} className="mt-4" />
          <motion.div initial={justLocked ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: justLocked ? 0.7 : 0, duration: dur.slow, ease }}>
            <h2 className="mt-5 text-[22px] font-semibold tracking-tight">Squad locked</h2>
            <p className="mx-auto mt-1.5 max-w-[30ch] text-sm text-muted-foreground">Hidden from rivals until kickoff. They see it when the gameweek starts.</p>
          </motion.div>

          {locked.kickoffAt ? (
            <p className="mt-8 text-sm text-muted-foreground">This gameweek is live.</p>
          ) : (
            <div className="mt-8 w-full rounded-2xl bg-surface-1 px-4 py-5 ring-1 ring-inset ring-hairline">
              <p className="mb-3 text-label font-semibold uppercase text-muted-foreground">Kicks off in</p>
              <Countdown to={kickoffAt} />
              <p className="mt-3 text-xs text-muted-foreground">
                {fmtTime(locked.start)} to {fmtTime(locked.end)}
              </p>
            </div>
          )}

          <LineupSummary className="mt-3" starters={shown.starters} bench={shown.bench} captainId={shown.captainId} viceId={shown.viceId} stock={stock} posOf={posOf} />
        </main>
        <BottomBar>
          <Button size="cta" className="w-full" onClick={goLive}>
            <Play className="fill-current" /> {locked.kickoffAt ? "Watch live" : "Go to kickoff"}
          </Button>
          {!locked.kickoffAt && (
            <div className="mt-1 flex items-center justify-between">
              <span className="pl-1 text-[11px] text-muted-foreground">Demo: skip the wait and watch it live.</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-[13px] text-muted-foreground"
                onClick={() => {
                  unlock();
                  setJustLocked(false);
                  toast("Squad unlocked", { description: "Make your changes, then lock again before the deadline." });
                }}
              >
                <Unlock /> Unlock to edit
              </Button>
            </div>
          )}
        </BottomBar>
      </>
    );
  }

  const deadline = gameweek ? new Date(gameweek.deadline).getTime() : 0;

  return (
    <>
      <TopBar back="/pick" title="Deadline" subtitle="Lock your squad before kickoff" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-2">
        <Segmented<GameweekKind>
          id="gw-kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "daily", label: "Daily · 24h" },
            { value: "flash", label: "Flash · 1h" },
          ]}
        />

        <section className="rounded-2xl bg-surface-1 px-4 py-5 text-center ring-1 ring-inset ring-hairline">
          <AnimatePresence mode="wait" initial={false}>
            {gw.error ? (
              <ErrorState key="err" title="Couldn't load the gameweek" message={gw.error.message} onRetry={gw.retry} className="py-2" />
            ) : !gameweek ? (
              <motion.div key="load" exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <Shimmer className="h-3 w-40" />
                <Shimmer className="h-12 w-56" />
                <Shimmer className="h-3 w-48" />
              </motion.div>
            ) : (
              <motion.div key={gameweek.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur.base }}>
                <p className="mb-3 text-label font-semibold uppercase text-muted-foreground">Gameweek {gameweek.number} deadline</p>
                <Countdown to={deadline} />
                <p className="mt-3 text-xs text-muted-foreground">
                  Runs {fmtTime(gameweek.start)} to {fmtTime(gameweek.end)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <LineupSummary starters={lineup.starters} bench={lineup.bench} captainId={lineup.captainId} viceId={lineup.viceId} stock={stock} posOf={posOf} creditsUsed={validation.creditsUsed} editHref="/pick" />

        <p className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
          <EyeOff className="size-3.5" /> Your team stays hidden from rivals until kickoff.
        </p>
      </main>
      <BottomBar>
        <Button size="cta" className="w-full" disabled={!gameweek || locking} onClick={doLock}>
          {locking ? <Loader2 className="animate-spin" /> : <Lock />}
          {locking ? "Locking..." : "Lock squad"}
        </Button>
      </BottomBar>
    </>
  );
}

function LineupSummary({
  starters,
  bench,
  captainId,
  viceId,
  stock,
  posOf,
  creditsUsed,
  editHref,
  className,
}: {
  starters: string[];
  bench: string[];
  captainId: string;
  viceId: string;
  stock: (id: string) => { ticker: string };
  posOf: (id: string) => Position | undefined;
  creditsUsed?: number;
  editHref?: string;
  className?: string;
}) {
  const rows = POSITIONS.map((p) => starters.filter((id) => posOf(id) === p));
  return (
    <section className={cn("w-full rounded-2xl bg-surface-1 p-4 text-left ring-1 ring-inset ring-hairline", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">
          Your XI <span className="num ml-1 text-muted-foreground">{formation(starters, posOf)}</span>
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {creditsUsed !== undefined && (
            <span>
              <span className="num font-semibold text-foreground">{credits(creditsUsed)}</span> credits
            </span>
          )}
          {editHref && (
            <Link href={editHref} className="font-semibold text-foreground underline-offset-4 active:underline">
              Edit
            </Link>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((ids, i) => (
          <div key={i} className="flex flex-wrap justify-center gap-1.5">
            {ids.map((id) => (
              <Pill key={id} ticker={stock(id).ticker} role={id === captainId ? "C" : id === viceId ? "V" : undefined} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-hairline pt-3">
        <p className="mb-2 text-center text-label font-semibold uppercase text-muted-foreground">Bench</p>
        <div className="flex flex-wrap justify-center gap-1.5 opacity-60">
          {bench.map((id) => (
            <Pill key={id} ticker={stock(id).ticker} />
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
      <TopBar back="/pick" title="Deadline" />
      <main className="flex flex-1 flex-col gap-3 px-4" aria-busy>
        <Shimmer className="h-11 rounded-xl" />
        <Shimmer className="h-[150px] rounded-2xl" />
        <Shimmer className="h-[190px] rounded-2xl" />
      </main>
    </>
  );
}
