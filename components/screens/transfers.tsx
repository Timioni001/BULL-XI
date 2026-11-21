"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Info, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Position, SquadSlots, Stock } from "@/lib/data/types";
import { POSITIONS, sumCredits, transferCost, validateSquad, BUDGET } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { credits } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useGame, type TransferRecord } from "@/lib/store/game";
import { useSquad } from "@/lib/hooks/use-squad";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { Pitch, PitchRow } from "@/components/pitch/pitch";
import { PitchSlot } from "@/components/pitch/pitch-slot";
import { StockPicker } from "@/components/stock/stock-picker";
import { StockAvatar } from "@/components/stock/stock-avatar";
import { EmptyState, ErrorState, PitchSkeleton } from "@/components/states/states";

const t = copy.transfers;

export function Transfers() {
  const router = useRouter();
  const hydrated = useGame((s) => s.hydrated);
  const locked = useGame((s) => s.locked);
  const chip = useGame((s) => s.chip);
  const freeTransfers = useGame((s) => s.freeTransfers);
  const made = useGame((s) => s.transfers);
  const madeHit = useGame((s) => s.transferHit);
  const seasonStarted = useGame((s) => s.seasonStarted);
  const applyTransfers = useGame((s) => s.applyTransfers);
  const { slots, validation, stocks } = useSquad();
  const [draft, setDraft] = useState<SquadSlots | null>(null);
  const [pending, setPending] = useState<TransferRecord[]>([]);
  const [picker, setPicker] = useState<{ pos: Position; idx: number } | null>(null);

  const header = <PageHeader eyebrow={t.eyebrow} title={t.title} back={routes.pick} />;

  if (!hydrated || stocks.status === "loading") {
    return (
      <>
        {header}
        <main className="px-4 lg:px-0">
          <PitchSkeleton />
        </main>
      </>
    );
  }
  if (stocks.status === "error") return (<>{header}<ErrorState title={copy.errors.stocks.title} message={copy.errors.stocks.body} onRetry={stocks.retry} /></>);
  if (!validation.valid) {
    return (
      <>
        {header}
        <EmptyState className="flex-1 justify-center pb-28" title={copy.pick.noSquadTitle} body={copy.pick.noSquadBody} action={<Button asChild size="cta" className="w-full"><Link href={routes.squad}>{copy.squad.title}</Link></Button>} />
        <TabBar />
      </>
    );
  }
  if (locked) {
    return (
      <>
        {header}
        <EmptyState
          className="flex-1 justify-center pb-28"
          icon={<Lock className="size-7 text-brand" />}
          title={t.lockedTitle}
          body={t.lockedBody}
          action={<Button asChild size="cta" className="w-full"><Link href={routes.lock}>{copy.pick.viewDeadline}</Link></Button>}
        />
        <TabBar />
      </>
    );
  }

  const current = draft ?? slots;
  const byId = stocks.byId;
  const squad: Stock[] = POSITIONS.flatMap((p) => current[p].flatMap((id) => (id ? [byId.get(id)!] : [])));
  const left = Math.round((BUDGET - sumCredits(squad)) * 10) / 10;
  const freeMode = !seasonStarted || chip === "wildcard" || chip === "freeHit";
  const totalHit = freeMode ? 0 : transferCost(made.length + pending.length, freeTransfers, chip);
  const newHit = Math.max(0, totalHit - madeHit);
  const freeLeft = Math.max(0, freeTransfers - made.length - pending.length);
  const inIds = new Set(pending.map((p) => p.inId));
  const valid = validateSquad(squad).valid;

  const note = !seasonStarted ? t.freeUntilFirst : chip === "wildcard" ? t.wildcard : chip === "freeHit" ? t.freeHit : `${t.free(freeLeft)}. ${t.hitNote}`;

  const onPick = (s: Stock) => {
    if (!picker) return;
    const outId = current[picker.pos][picker.idx]!;
    const next: SquadSlots = { ...current, [picker.pos]: current[picker.pos].map((v, i) => (i === picker.idx ? s.id : v)) };
    setDraft(next);
    setPending((p) => {
      const chained = p.find((x) => x.inId === outId);
      if (chained) return chained.outId === s.id ? p.filter((x) => x !== chained) : p.map((x) => (x === chained ? { ...x, inId: s.id } : x));
      return [...p, { outId, inId: s.id }];
    });
    setPicker(null);
    haptic(10);
  };

  const confirm = () => {
    if (!draft || pending.length === 0) return;
    haptic(20);
    applyTransfers({ slots: draft, transfers: pending, hit: newHit });
    toast(t.done(pending.length), { description: newHit ? t.hit(newHit) : undefined });
    setDraft(null);
    setPending([]);
    router.push(routes.pick);
  };

  const reset = () => {
    setDraft(null);
    setPending([]);
  };

  const replacing = picker ? byId.get(current[picker.pos][picker.idx]!) ?? null : null;

  const summary = (
    <div className="noise rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline">
      <div className="flex items-center justify-between">
        <p className="font-display text-[17px] font-bold uppercase">{t.pending}</p>
        {pending.length > 0 && (
          <button onClick={reset} className="flex h-9 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-3.5" /> {t.reset}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {pending.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">{t.noPending}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((p) => {
              const o = byId.get(p.outId)!;
              const i = byId.get(p.inId)!;
              return (
                <motion.li key={p.outId} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: dur.base, ease }} className="flex items-center gap-2">
                  <StockAvatar ticker={o.ticker} sector={o.sector} size={30} className="opacity-60" />
                  <span className="font-mono text-xs text-muted-foreground line-through">{o.ticker}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  <StockAvatar ticker={i.ticker} sector={i.sector} size={30} />
                  <span className="font-mono text-xs font-semibold">{i.ticker}</span>
                  <span className="num ml-auto text-xs text-muted-foreground">
                    {i.credits - o.credits >= 0 ? "+" : "−"}
                    {credits(Math.abs(i.credits - o.credits))}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </AnimatePresence>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-hairline pt-3">
        <div>
          <p className="text-[11px] text-muted-foreground">{t.cost}</p>
          <p className={cn("num font-display text-2xl font-bold", newHit > 0 && "text-bear")}>{t.hit(newHit)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">{t.budgetAfter}</p>
          <p className={cn("num font-display text-2xl font-bold", left < 0 && "underline decoration-2 underline-offset-4")}>{credits(left)}</p>
        </div>
      </div>
      {left < 0 && <p className="mt-2 text-xs text-foreground/80">{t.overBudget}</p>}
    </div>
  );

  const cta = (
    <Button size="cta" className="w-full" disabled={pending.length === 0 || !valid} onClick={confirm}>
      {t.confirm(pending.length, newHit)}
    </Button>
  );

  return (
    <>
      {header}
      <main className="flex flex-1 flex-col gap-3 px-4 pb-2 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 rounded-2xl bg-surface-1 px-4 py-3 text-[13px] ring-1 ring-inset ring-hairline">
            <Info className="mt-0.5 size-4 shrink-0 text-brand" /> {note}
          </p>
          <p className="px-1 text-[13px] text-muted-foreground">{t.tapOut}</p>
          <Pitch>
            <div className="flex flex-col gap-3 px-1 py-3 lg:gap-6 lg:py-6">
              {POSITIONS.map((pos) => (
                <PitchRow key={pos} label={copy.positions[pos].row}>
                  {current[pos].map((id, idx) => {
                    const s = id ? byId.get(id) : undefined;
                    return (
                      <PitchSlot
                        key={`${pos}-${idx}`}
                        position={pos}
                        stock={s}
                        sub={s ? credits(s.credits) : undefined}
                        badge={s && inIds.has(s.id) ? <span className="grid size-[18px] place-items-center rounded-full bg-brand text-[10px] font-bold text-white">{t.in[0]}</span> : undefined}
                        onClick={() => setPicker({ pos, idx })}
                      />
                    );
                  })}
                </PitchRow>
              ))}
            </div>
          </Pitch>
          <div className="lg:hidden">{summary}</div>
        </div>
        <aside className="hidden flex-col gap-3 lg:sticky lg:top-6 lg:flex">
          {summary}
          {cta}
        </aside>
      </main>
      <BottomBar>{cta}</BottomBar>

      <StockPicker
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        position={picker?.pos ?? "ETF"}
        squad={squad}
        replacing={replacing}
        creditsLeft={left}
        onPick={onPick}
      />
    </>
  );
}
