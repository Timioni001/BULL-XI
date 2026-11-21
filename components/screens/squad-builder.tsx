"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Position, Stock } from "@/lib/data/types";
import { POSITIONS, squadIds } from "@/lib/game/rules";
import { autoPick } from "@/lib/game/autopick";
import { credits } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { useGame } from "@/lib/store/game";
import { useSquad } from "@/lib/hooks/use-squad";
import { useGameweek } from "@/lib/hooks/use-gameweek";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { Pitch, PitchRow } from "@/components/pitch/pitch";
import { PitchSlot } from "@/components/pitch/pitch-slot";
import { BudgetBar } from "@/components/game/budget-bar";
import { SquadHints } from "@/components/game/squad-hints";
import { CountdownInline } from "@/components/game/countdown";
import { StockPicker } from "@/components/stock/stock-picker";
import { StockDetailSheet } from "@/components/stock/stock-detail-sheet";
import { ErrorState, PitchSkeleton, Shimmer } from "@/components/states/states";

const ROW_LABEL: Record<Position, string> = {
  ETF: "ETF · Keeper",
  BLUE: "Blue Chip · Defence",
  GROWTH: "Growth · Midfield",
  RISK: "High Risk · Attack",
};

export function SquadBuilder() {
  const router = useRouter();
  const hydrated = useGame((s) => s.hydrated);
  const kind = useGame((s) => s.gameweekKind);
  const setSlot = useGame((s) => s.setSlot);
  const setSlots = useGame((s) => s.setSlots);
  const completeOnboarding = useGame((s) => s.completeOnboarding);
  const { slots, squad, validation, hints, stocks } = useSquad();
  const { gameweek } = useGameweek(kind);

  const [picker, setPicker] = useState<{ pos: Position; idx: number } | null>(null);
  const [detail, setDetail] = useState<{ pos: Position; idx: number; stock: Stock } | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (hydrated) completeOnboarding();
  }, [hydrated, completeOnboarding]);

  if (!hydrated || stocks.status === "loading") return <BuilderSkeleton />;
  if (stocks.status === "error") {
    return (
      <>
        <TopBar back="/" title="Build your squad" />
        <ErrorState title="Stocks didn't load" message={stocks.error.message} onRetry={stocks.retry} />
      </>
    );
  }

  const filled = validation.size;
  const empty = 15 - filled;

  const runAutoPick = () => {
    haptic(12);
    const before = slots;
    const next = autoPick(stocks.data, filled === 15 ? emptyLike(slots) : slots);
    setSlots(next);
    setBurst((b) => b + 1);
    const added = filled === 15 ? 15 : squadIds(next).length - filled;
    toast(filled === 15 ? "New squad picked" : `Auto-picked ${added} stock${added === 1 ? "" : "s"}`, {
      description: "Tap any stock to swap it.",
      action: { label: "Undo", onClick: () => setSlots(before) },
    });
  };

  const clear = () => {
    const before = slots;
    setSlots(emptyLike(slots));
    toast("Squad cleared", { action: { label: "Undo", onClick: () => setSlots(before) } });
  };

  const onPick = (stock: Stock) => {
    if (!picker) return;
    if (stock.position === picker.pos) {
      setSlot(picker.pos, picker.idx, stock.id);
    } else {
      const idx = slots[stock.position].indexOf(null);
      if (idx >= 0) setSlot(stock.position, idx, stock.id);
    }
    setPicker(null);
  };

  const replacing = picker ? (slots[picker.pos][picker.idx] ? stocks.byId.get(slots[picker.pos][picker.idx]!) ?? null : null) : null;
  const deadline = gameweek ? new Date(gameweek.deadline).getTime() : null;

  return (
    <>
      <TopBar
        back="/"
        title="Build your squad"
        subtitle={
          gameweek ? (
            <>
              Gameweek {gameweek.number} · Deadline in {deadline && <CountdownInline to={deadline} className="text-foreground" />}
            </>
          ) : (
            "15 stocks · 100 credits"
          )
        }
        right={
          filled > 0 && (
            <Button variant="ghost" size="icon-cta" aria-label="Clear squad" onClick={clear}>
              <RotateCcw />
            </Button>
          )
        }
      />

      <main className="flex flex-1 flex-col gap-3 px-4 pb-2">
        <BudgetBar creditsLeft={validation.creditsLeft} size={filled} />
        <SquadHints hints={hints} complete={validation.valid} />

        <Pitch>
          <div className="flex flex-col gap-3 px-1 py-3">
            {POSITIONS.map((pos) => (
              <PitchRow key={pos} label={ROW_LABEL[pos]}>
                {slots[pos].map((id, idx) => {
                  const s = id ? stocks.byId.get(id) : undefined;
                  return (
                    <PitchSlot
                      key={`${pos}-${idx}`}
                      position={pos}
                      stock={s}
                      sub={s ? credits(s.credits) : undefined}
                      delay={burst ? (POSITIONS.indexOf(pos) * 5 + idx) * 0.025 : 0}
                      onClick={() => {
                        haptic();
                        if (s) setDetail({ pos, idx, stock: s });
                        else setPicker({ pos, idx });
                      }}
                    />
                  );
                })}
              </PitchRow>
            ))}
          </div>
        </Pitch>
        {filled === 0 && (
          <p className="text-center text-[13px] text-muted-foreground">
            Tap a slot to pick a stock, or let <span className="font-semibold text-foreground">Auto-pick</span> build a squad in one tap.
          </p>
        )}
      </main>

      <BottomBar>
        <div className="flex gap-2">
          <Button size="cta" variant={filled === 0 ? "default" : "secondary"} className={filled === 0 ? "flex-1" : "px-4"} onClick={runAutoPick}>
            {filled === 15 ? <Shuffle /> : <Sparkles />}
            {filled === 15 ? "Shuffle" : filled === 0 ? "Auto-pick my squad" : `Auto-pick ${empty}`}
          </Button>
          {filled > 0 && (
            <Button size="cta" className="flex-1" disabled={!validation.valid} onClick={() => router.push("/pick")}>
              {validation.valid ? "Pick your team" : `${empty > 0 ? `${empty} to go` : "Fix squad"}`}
              {validation.valid && <ArrowRight />}
            </Button>
          )}
        </div>
      </BottomBar>

      <StockPicker
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        position={picker?.pos ?? "ETF"}
        squad={squad}
        replacing={replacing}
        creditsLeft={validation.creditsLeft}
        onPick={onPick}
      />

      <StockDetailSheet
        stock={detail?.stock ?? null}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        actions={
          detail
            ? [
                {
                  label: "Remove",
                  variant: "secondary",
                  onClick: () => {
                    setSlot(detail.pos, detail.idx, null);
                    setDetail(null);
                  },
                },
                {
                  label: "Replace",
                  onClick: () => {
                    const d = detail;
                    setDetail(null);
                    setTimeout(() => setPicker({ pos: d.pos, idx: d.idx }), 180);
                  },
                },
              ]
            : undefined
        }
      />
    </>
  );
}

function emptyLike<T extends Record<Position, (string | null)[]>>(slots: T): T {
  return Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, v.map(() => null)])) as T;
}

function BuilderSkeleton() {
  return (
    <>
      <TopBar back="/" title="Build your squad" subtitle="15 stocks · 100 credits" />
      <main className="flex flex-1 flex-col gap-3 px-4" aria-busy>
        <Shimmer className="h-[84px] rounded-2xl" />
        <Shimmer className="h-7 w-48 rounded-full" />
        <PitchSkeleton />
      </main>
    </>
  );
}
