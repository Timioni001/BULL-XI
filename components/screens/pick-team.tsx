"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowRight, Info, Lock, X } from "lucide-react";
import { toast } from "sonner";
import type { Lineup, Position, Stock } from "@/lib/data/types";
import { POSITIONS, POSITION_META, formation, setCaptain, setVice, swapInLineup } from "@/lib/game/rules";
import { pct } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useGame } from "@/lib/store/game";
import { useLineup } from "@/lib/hooks/use-lineup";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { Pitch, PitchRow } from "@/components/pitch/pitch";
import { PitchSlot, type SlotState } from "@/components/pitch/pitch-slot";
import { BenchStrip } from "@/components/pitch/bench-strip";
import { CaptainBadge } from "@/components/game/captain-badge";
import { StockAvatar } from "@/components/stock/stock-avatar";
import { StockDetailSheet } from "@/components/stock/stock-detail-sheet";
import { EmptyState, ErrorState, PitchSkeleton, Shimmer } from "@/components/states/states";

const BENCH_LABELS = ["ETF", "1st", "2nd", "3rd"];

export function PickTeam() {
  const router = useRouter();
  const hydrated = useGame((s) => s.hydrated);
  const locked = useGame((s) => s.locked);
  const { lineup, posOf, setLineup, validation, stocks } = useLineup();
  const prices = useLivePrices();
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Stock | null>(null);

  if (!hydrated || stocks.status === "loading") return <PickSkeleton />;
  if (stocks.status === "error") {
    return (
      <>
        <TopBar back="/squad" title="Pick your team" />
        <ErrorState title="Your team didn't load" message={stocks.error.message} onRetry={stocks.retry} />
      </>
    );
  }
  if (!validation.valid || !lineup) {
    return (
      <>
        <TopBar title="Pick your team" />
        <EmptyState
          className="flex-1 justify-center"
          title={validation.size === 0 ? "No squad yet" : "Your squad isn't finished"}
          body={validation.size === 0 ? "Build a 15-stock squad first. Auto-pick does it in one tap." : `You have ${validation.size} of 15 stocks. Finish it to pick your starting XI.`}
          action={
            <Button asChild size="cta" className="w-full">
              <Link href="/squad">{validation.size === 0 ? "Build your squad" : "Finish squad"}</Link>
            </Button>
          }
        />
        <TabBar />
      </>
    );
  }

  const isLocked = !!locked;
  const stock = (id: string) => stocks.byId.get(id)!;
  const targets = new Set<string>();
  if (selected && !isLocked) {
    for (const id of [...lineup.starters, ...lineup.bench]) if (swapInLineup(lineup, selected, id, posOf)) targets.add(id);
  }

  const stateOf = (id: string): SlotState => {
    if (!selected) return "default";
    if (id === selected) return "selected";
    if (targets.has(id)) return "target";
    return "dim";
  };

  const tapStock = (id: string) => {
    haptic();
    if (isLocked) {
      setDetail(stock(id));
      return;
    }
    if (selected === id) return setSelected(null);
    if (selected && targets.has(id)) {
      const next = swapInLineup(lineup, selected, id, posOf)!;
      commit(next, lineup);
      setSelected(null);
      return;
    }
    setSelected(id);
  };

  const commit = (next: Lineup, prev: Lineup, message?: string) => {
    setLineup(next);
    if (message) toast(message, { action: { label: "Undo", onClick: () => setLineup(prev) } });
  };

  const rows: Record<Position, string[]> = { ETF: [], BLUE: [], GROWTH: [], RISK: [] };
  for (const id of lineup.starters) rows[posOf(id)!].push(id);

  const role = (id: string) => (id === lineup.captainId ? "C" : id === lineup.viceId ? "V" : null);
  const sub = (id: string) => {
    const c = prices?.[id]?.change24h ?? stock(id).change24h;
    return { text: pct(c, 1), tone: c > 0 ? ("up" as const) : c < 0 ? ("down" as const) : ("muted" as const) };
  };

  const sel = selected ? stock(selected) : null;
  const selIsStarter = !!selected && lineup.starters.includes(selected);

  return (
    <>
      <TopBar
        back="/squad"
        title="Pick your team"
        subtitle={
          <>
            Formation <span className="num font-semibold text-foreground">{formation(lineup.starters, posOf)}</span> · 24h moves shown
          </>
        }
        right={
          !isLocked && (
            <Button asChild variant="ghost" size="sm" className="h-9 rounded-xl px-3 text-[13px]">
              <Link href="/squad">Edit squad</Link>
            </Button>
          )
        }
      />

      <main className="flex flex-1 flex-col gap-3 px-4 pb-2">
        {isLocked ? (
          <Link href="/lock" className="flex items-center gap-3 rounded-2xl bg-surface-1 px-4 py-3 ring-1 ring-inset ring-hairline">
            <Lock className="size-4" />
            <span className="flex-1 text-[13px]">
              Locked for Gameweek {locked.gameweekNumber}. <span className="text-muted-foreground">Unlock on the deadline screen to make changes.</span>
            </span>
          </Link>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Info className="size-4 shrink-0" />
            {selected ? "Tap a highlighted stock to swap. Tap again to cancel." : "Tap a stock to make it captain or swap it with the bench."}
          </p>
        )}

        <LayoutGroup>
          <Pitch>
            <div className="flex flex-col gap-4 px-1 py-4">
              {POSITIONS.map((pos) => (
                <PitchRow key={pos}>
                  {rows[pos].map((id) => {
                    const s = sub(id);
                    return (
                      <PitchSlot
                        key={id}
                        layoutId={`pick-${id}`}
                        stock={stock(id)}
                        position={pos}
                        role={role(id)}
                        sub={s.text}
                        subTone={s.tone}
                        state={stateOf(id)}
                        onClick={() => tapStock(id)}
                      />
                    );
                  })}
                </PitchRow>
              ))}
            </div>
          </Pitch>

          <BenchStrip note="Comes on only if a starter is halted">
            {lineup.bench.map((id, i) => {
              const s = sub(id);
              return (
                <div key={id} className="flex flex-col items-center">
                  <PitchSlot layoutId={`pick-${id}`} stock={stock(id)} position={posOf(id)!} sub={s.text} subTone={s.tone} state={stateOf(id)} onClick={() => tapStock(id)} />
                  <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">{BENCH_LABELS[i]}</span>
                </div>
              );
            })}
          </BenchStrip>
        </LayoutGroup>
      </main>

      <BottomBar>
        <AnimatePresence mode="wait" initial={false}>
          {sel ? (
            <motion.div key="sel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: dur.base, ease }} className="rounded-2xl bg-surface-1 p-3 ring-1 ring-inset ring-hairline">
              <div className="flex items-center gap-3">
                <StockAvatar ticker={sel.ticker} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">{sel.ticker}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {POSITION_META[sel.position].label} · {selIsStarter ? "Starting XI" : "Bench"}
                  </p>
                </div>
                <Button variant="ghost" size="icon-cta" aria-label="Details" onClick={() => setDetail(sel)}>
                  <Info />
                </Button>
                <Button variant="ghost" size="icon-cta" aria-label="Cancel" onClick={() => setSelected(null)}>
                  <X />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  size="cta-sm"
                  variant={lineup.captainId === sel.id ? "default" : "secondary"}
                  disabled={!selIsStarter}
                  onClick={() => {
                    haptic(12);
                    commit(setCaptain(lineup, sel.id), lineup, `${sel.ticker} is your captain`);
                    setSelected(null);
                  }}
                >
                  <CaptainBadge role="C" size={18} className="shadow-none" />
                  {lineup.captainId === sel.id ? "Captain" : "Make captain"}
                </Button>
                <Button
                  size="cta-sm"
                  variant={lineup.viceId === sel.id ? "default" : "secondary"}
                  disabled={!selIsStarter}
                  onClick={() => {
                    haptic(12);
                    commit(setVice(lineup, sel.id), lineup, `${sel.ticker} is your vice-captain`);
                    setSelected(null);
                  }}
                >
                  <CaptainBadge role="V" size={18} className="shadow-none" />
                  {lineup.viceId === sel.id ? "Vice" : "Make vice"}
                </Button>
              </div>
              {!selIsStarter && <p className="mt-2 text-center text-[11px] text-muted-foreground">Move it into your XI to give it the armband.</p>}
            </motion.div>
          ) : (
            <motion.div key="cta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: dur.base, ease }}>
              <div className="mb-2.5 flex items-center justify-center gap-4 text-[13px]">
                <span className="flex items-center gap-1.5">
                  <CaptainBadge role="C" size={16} className="shadow-none" />
                  <span className="font-mono font-semibold">{stock(lineup.captainId).ticker}</span>
                  <span className="text-muted-foreground">scores 2x</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CaptainBadge role="V" size={16} className="shadow-none" />
                  <span className="font-mono font-semibold">{stock(lineup.viceId).ticker}</span>
                </span>
              </div>
              <Button size="cta" className={cn("w-full")} onClick={() => router.push("/lock")}>
                {isLocked ? "View deadline" : "Confirm team"} <ArrowRight />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomBar>

      <StockDetailSheet stock={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} />
    </>
  );
}

function PickSkeleton() {
  return (
    <>
      <TopBar back="/squad" title="Pick your team" />
      <main className="flex flex-1 flex-col gap-3 px-4" aria-busy>
        <Shimmer className="h-5 w-64" />
        <PitchSkeleton rows={[1, 4, 4, 2]} />
        <Shimmer className="h-[104px] rounded-2xl" />
      </main>
    </>
  );
}
