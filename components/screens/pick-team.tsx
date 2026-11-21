"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { ArrowLeftRight, ArrowRight, Info, Lock, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { Lineup, Position, Stock } from "@/lib/data/types";
import { POSITIONS, formation, setCaptain, setVice, swapInLineup } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { pct } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useGame } from "@/lib/store/game";
import { useLineup } from "@/lib/hooks/use-lineup";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScreenGrid, TopBar } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { Pitch, PitchRow } from "@/components/pitch/pitch";
import { PitchSlot, type SlotState } from "@/components/pitch/pitch-slot";
import { BenchStrip } from "@/components/pitch/bench-strip";
import { CaptainBadge } from "@/components/game/captain-badge";
import { StockAvatar } from "@/components/stock/stock-avatar";
import { StockDetailSheet } from "@/components/stock/stock-detail-sheet";
import { EmptyState, ErrorState, PitchSkeleton, Shimmer } from "@/components/states/states";

const t = copy.pick;

export function PickTeam() {
  const router = useRouter();
  const hydrated = useGame((s) => s.hydrated);
  const locked = useGame((s) => s.locked);
  const chip = useGame((s) => s.chip);
  const { lineup, posOf, setLineup, validation, stocks } = useLineup();
  const prices = useLivePrices();
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [detail, setDetail] = useState<Stock | null>(null);
  const justDragged = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  if (!hydrated || stocks.status === "loading") return <PickSkeleton />;
  if (stocks.status === "error") {
    return (
      <>
        <TopBar back={routes.squad} title={t.title} />
        <ErrorState title={copy.errors.team.title} message={copy.errors.team.body} onRetry={stocks.retry} />
      </>
    );
  }
  if (!validation.valid || !lineup) {
    return (
      <>
        <TopBar title={t.title} />
        <EmptyState
          className="flex-1 justify-center pb-28"
          title={validation.size === 0 ? t.noSquadTitle : t.unfinishedTitle}
          body={validation.size === 0 ? t.noSquadBody : t.unfinishedBody(validation.size)}
          action={
            <Button asChild size="cta" className="w-full">
              <Link href={routes.squad}>{validation.size === 0 ? copy.squad.title : t.finish}</Link>
            </Button>
          }
        />
        <TabBar />
      </>
    );
  }

  const isLocked = !!locked;
  const stock = (id: string) => stocks.byId.get(id)!;
  const active = dragging ?? selected;
  const targets = new Set<string>();
  if (active && !isLocked) for (const id of [...lineup.starters, ...lineup.bench]) if (swapInLineup(lineup, active, id, posOf)) targets.add(id);

  const stateOf = (id: string): SlotState => {
    if (!active) return "default";
    if (id === active) return "selected";
    if (targets.has(id)) return "target";
    return "dim";
  };

  const commit = (next: Lineup, prev: Lineup, message?: string) => {
    setLineup(next);
    if (message) toast(message, { action: { label: copy.common.undo, onClick: () => setLineup(prev) } });
  };

  const tapStock = (id: string) => {
    if (justDragged.current) return;
    haptic();
    if (isLocked) return setDetail(stock(id));
    if (selected === id) return setSelected(null);
    if (selected && targets.has(id)) {
      commit(swapInLineup(lineup, selected, id, posOf)!, lineup);
      setSelected(null);
      return;
    }
    setSelected(id);
  };

  const onDragStart = (e: DragStartEvent) => {
    haptic(10);
    setDragging(String(e.active.id));
    setSelected(null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 250);
    const from = String(e.active.id);
    const to = e.over ? String(e.over.id) : null;
    setDragging(null);
    if (!to || to === from) return;
    const next = swapInLineup(lineup, from, to, posOf);
    if (next) {
      haptic(14);
      commit(next, lineup);
    }
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

  const slot = (id: string, pos: Position, withRole: boolean) => {
    const s = sub(id);
    return (
      <DndSlot key={id} id={id} disabled={isLocked}>
        <PitchSlot
          layoutId={dragging ? undefined : `pick-${id}`}
          stock={stock(id)}
          position={pos}
          role={withRole ? role(id) : null}
          sub={s.text}
          subTone={s.tone}
          state={stateOf(id)}
          onClick={() => tapStock(id)}
        />
      </DndSlot>
    );
  };

  const panel = (
    <AnimatePresence mode="wait" initial={false}>
      {sel ? (
        <motion.div key="sel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: dur.base, ease }} className="rounded-3xl bg-surface-1 p-3 ring-1 ring-inset ring-hairline">
          <div className="flex items-center gap-3">
            <StockAvatar ticker={sel.ticker} sector={sel.sector} size={38} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-semibold">{sel.ticker}</p>
              <p className="truncate text-xs text-muted-foreground">
                {copy.positions[sel.position].label} · {selIsStarter ? t.startingXI : t.bench}
              </p>
            </div>
            <Button variant="ghost" size="icon-cta" aria-label={copy.common.details} onClick={() => setDetail(sel)}>
              <Info />
            </Button>
            <Button variant="ghost" size="icon-cta" aria-label={copy.common.cancel} onClick={() => setSelected(null)}>
              <X />
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="cta-sm"
              variant={lineup.captainId === sel.id ? "light" : "secondary"}
              disabled={!selIsStarter}
              onClick={() => {
                haptic(12);
                commit(setCaptain(lineup, sel.id), lineup, t.isCaptain(sel.ticker));
                setSelected(null);
              }}
            >
              <CaptainBadge role="C" size={18} className="shadow-none" />
              {lineup.captainId === sel.id ? t.captain : t.makeCaptain}
            </Button>
            <Button
              size="cta-sm"
              variant={lineup.viceId === sel.id ? "light" : "secondary"}
              disabled={!selIsStarter}
              onClick={() => {
                haptic(12);
                commit(setVice(lineup, sel.id), lineup, t.isVice(sel.ticker));
                setSelected(null);
              }}
            >
              <CaptainBadge role="V" size={18} className="shadow-none" />
              {lineup.viceId === sel.id ? t.vice : t.makeVice}
            </Button>
          </div>
          {!selIsStarter && <p className="mt-2 text-center text-[11px] text-muted-foreground">{t.benchNoArmband}</p>}
        </motion.div>
      ) : (
        <motion.div key="cta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: dur.base, ease }}>
          <div className="mb-2.5 flex items-center justify-center gap-4 text-[13px]">
            <span className="flex items-center gap-1.5">
              <CaptainBadge role="C" size={16} className="shadow-none" />
              <span className="font-mono font-semibold">{stock(lineup.captainId).ticker}</span>
              <span className="text-muted-foreground">{t.scores2x}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CaptainBadge role="V" size={16} className="shadow-none" />
              <span className="font-mono font-semibold">{stock(lineup.viceId).ticker}</span>
            </span>
          </div>
          <Button size="cta" className="w-full" onClick={() => router.push(routes.lock)}>
            {isLocked ? t.viewDeadline : t.confirm} <ArrowRight />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <TopBar
        back={routes.squad}
        title={t.title}
        subtitle={
          <>
            {t.formation} <span className="num font-semibold text-foreground">{formation(lineup.starters, posOf)}</span> · {t.movesShown}
          </>
        }
        right={
          !isLocked && (
            <Button asChild variant="ghost" size="sm" className="h-11 rounded-full px-3 text-[13px]">
              <Link href={routes.squad}>{t.editSquad}</Link>
            </Button>
          )
        }
      />

      <main className="flex flex-1 flex-col px-4 pb-2 lg:px-0 lg:pb-10">
        <ScreenGrid
          main={
            <>
              <div className="flex gap-2">
                <QuickLink href={routes.transfers} icon={<ArrowLeftRight className="size-4" />} label={t.quick.transfers} />
                <QuickLink href={routes.chips} icon={<Sparkles className="size-4" />} label={chip ? copy.chipName[chip] : t.quick.chips} active={!!chip} />
              </div>
              {isLocked ? (
                <Link href={routes.lock} className="flex items-center gap-3 rounded-2xl bg-surface-1 px-4 py-3 ring-1 ring-inset ring-hairline">
                  <Lock className="size-4 text-brand" />
                  <span className="flex-1 text-[13px]">
                    {t.lockedBanner(locked.gameweekNumber)} <span className="text-muted-foreground">{t.lockedHint}</span>
                  </span>
                </Link>
              ) : (
                <p className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
                  <Info className="size-4 shrink-0" />
                  {selected ? t.hintSelected : t.hintIdle}
                </p>
              )}

              <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
                <LayoutGroup>
                  <Pitch>
                    <div className="flex flex-col gap-4 px-1 py-4 lg:gap-7 lg:py-7">
                      {POSITIONS.map((pos) => (
                        <PitchRow key={pos}>{rows[pos].map((id) => slot(id, pos, true))}</PitchRow>
                      ))}
                    </div>
                  </Pitch>
                  <BenchStrip label={t.bench} note={t.benchNote}>
                    {lineup.bench.map((id, i) => (
                      <div key={id} className="flex flex-col items-center">
                        {slot(id, posOf(id)!, false)}
                        <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">{t.benchLabels[i]}</span>
                      </div>
                    ))}
                  </BenchStrip>
                </LayoutGroup>
                <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
                  {dragging && (
                    <div className="scale-110 rotate-3 drop-shadow-[0_16px_24px_rgb(0_0_0/0.8)]">
                      <StockAvatar ticker={stock(dragging).ticker} sector={stock(dragging).sector} size={48} inverted />
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </>
          }
          aside={<div className="hidden lg:block">{panel}</div>}
        />
      </main>

      <BottomBar>{panel}</BottomBar>
      <StockDetailSheet stock={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} />
    </>
  );
}

/** Makes a slot both draggable and a drop target. Tap still works for short presses. */
function DndSlot({ id, disabled, children }: { id: string; disabled?: boolean; children: React.ReactNode }) {
  const drag = useDraggable({ id, disabled });
  const drop = useDroppable({ id, disabled });
  return (
    <div
      ref={(n) => {
        drag.setNodeRef(n);
        drop.setNodeRef(n);
      }}
      {...drag.listeners}
      {...drag.attributes}
      role={undefined}
      tabIndex={-1}
      className={cn("touch-manipulation rounded-xl transition-opacity", drag.isDragging && "opacity-30", drop.isOver && !drag.isDragging && "ring-2 ring-brand")}
    >
      {children}
    </div>
  );
}

function QuickLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-semibold ring-1 ring-inset transition-colors",
        active ? "bg-brand-soft text-foreground ring-brand/60" : "bg-surface-1 text-foreground/90 ring-hairline hover:bg-surface-2",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function PickSkeleton() {
  return (
    <>
      <TopBar back={routes.squad} title={t.title} />
      <main className="flex flex-1 flex-col gap-3 px-4 lg:px-0" aria-busy>
        <Shimmer className="h-11 rounded-full" />
        <PitchSkeleton rows={[1, 4, 4, 2]} />
        <Shimmer className="h-[104px] rounded-2xl" />
      </main>
    </>
  );
}
