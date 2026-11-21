"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Crown, Lock, Shield, Shuffle, Users, Zap, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { ChipId } from "@/lib/data/types";
import { CHIPS, canPlayChip } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { haptic } from "@/lib/haptics";
import { useGame } from "@/lib/store/game";
import { useLineup } from "@/lib/hooks/use-lineup";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { PageHeader } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { StockAvatar } from "@/components/stock/stock-avatar";

const t = copy.chips;
const ICON: Record<ChipId, LucideIcon> = { wildcard: Shuffle, freeHit: Zap, tripleCaptain: Crown, benchBoost: Users, hedge: Shield };

export function Chips() {
  const hydrated = useGame((s) => s.hydrated);
  const active = useGame((s) => s.chip);
  const hedgeId = useGame((s) => s.hedgeId);
  const used = useGame((s) => s.chipsUsed);
  const locked = useGame((s) => s.locked);
  const setChip = useGame((s) => s.setChip);
  const { lineup, stocks } = useLineup();
  const [open, setOpen] = useState<ChipId | null>(null);
  const [hedgePick, setHedgePick] = useState<string | null>(null);

  const usedIn = (c: ChipId) => used.find((u) => u.chip === c)?.gameweek;
  const chip = open;

  const play = () => {
    if (!chip) return;
    if (active === chip) {
      setChip(null);
      toast(t.turnedOff(copy.chipName[chip]));
      setOpen(null);
      return;
    }
    const check = canPlayChip({ chip, used: used.map((u) => u.chip), activeThisGameweek: active, hedgeId: hedgePick, lineup });
    if (!check.ok) {
      toast(check.reason);
      return;
    }
    haptic(20);
    setChip(chip, hedgePick);
    toast(t.turnedOn(copy.chipName[chip]));
    setOpen(null);
  };

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} back={routes.pick} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[calc(104px+env(safe-area-inset-bottom))] lg:px-0 lg:pb-10">
        <p className="px-1 text-sm text-muted-foreground">{t.intro}</p>
        {locked && (
          <p className="flex items-center gap-2 rounded-2xl bg-surface-1 px-4 py-3 text-[13px] ring-1 ring-inset ring-hairline">
            <Lock className="size-4 text-brand" /> {t.lockedNote}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHIPS.map((c, i) => {
            const Icon = ICON[c];
            const gw = usedIn(c);
            const isActive = active === c;
            const isUsed = gw !== undefined;
            const blocked = !isActive && !!active;
            return (
              <motion.button
                key={c}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur.slow, ease, delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                disabled={!hydrated || isUsed || !!locked}
                onClick={() => {
                  haptic();
                  setHedgePick(c === "hedge" ? hedgeId : null);
                  setOpen(c);
                }}
                className={cn(
                  "relative flex min-h-[148px] flex-col overflow-hidden rounded-[28px] p-5 text-left ring-1 ring-inset transition-colors",
                  isActive ? "bg-brand text-brand-foreground ring-transparent shadow-[0_24px_48px_-24px_var(--brand-glow)]" : "bg-surface-1 ring-hairline hover:bg-surface-2",
                  (isUsed || (blocked && !locked)) && "opacity-55",
                )}
              >
                {isActive && <div aria-hidden className="absolute -right-8 -top-8 size-32 rotate-45 bg-black/10" />}
                <div className="relative flex items-start justify-between">
                  <span className={cn("grid size-11 place-items-center rounded-2xl", isActive ? "bg-black/10" : c === "tripleCaptain" ? "bg-gold/15 text-gold" : "bg-surface-3")}>
                    <Icon className="size-5" />
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", isActive ? "bg-brand-foreground text-white" : isUsed ? "bg-surface-3 text-muted-foreground" : "bg-brand-soft text-foreground")}>
                    {isActive ? t.active : isUsed ? t.used(gw) : blocked ? t.blocked : t.available}
                  </span>
                </div>
                <p className="relative mt-auto pt-4 font-display text-[22px] font-bold uppercase leading-tight">{copy.chipName[c]}</p>
                <p className={cn("relative mt-1 text-[13px]", isActive ? "text-brand-foreground" : "text-muted-foreground")}>{t.details[c]}</p>
              </motion.button>
            );
          })}
        </div>
      </main>
      <TabBar />

      <Sheet open={!!chip} onOpenChange={(o) => !o && setOpen(null)} title={chip ? copy.chipName[chip] : ""} description={chip ? t.details[chip] : undefined}>
        {chip === "hedge" && active !== "hedge" && lineup && stocks.status === "success" && (
          <div className="mb-4">
            <p className="text-label font-semibold uppercase text-muted-foreground">{t.hedgePick}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.hedgeHelp}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {lineup.starters.map((id) => {
                const s = stocks.byId.get(id)!;
                const on = hedgePick === id;
                return (
                  <button
                    key={id}
                    onClick={() => setHedgePick(id)}
                    aria-pressed={on}
                    className={cn("relative flex flex-col items-center gap-1.5 rounded-2xl bg-surface-2 py-3 ring-1 ring-inset", on ? "ring-2 ring-brand" : "ring-hairline")}
                  >
                    <StockAvatar ticker={s.ticker} sector={s.sector} size={36} />
                    <span className="font-mono text-[11px] font-semibold">{s.ticker}</span>
                    {on && (
                      <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-brand text-brand-foreground">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Button size="cta" variant={chip && active === chip ? "secondary" : "default"} className="w-full" disabled={chip === "hedge" && active !== "hedge" && !hedgePick} onClick={play}>
          {chip && active === chip ? t.turnOff : chip ? t.use(copy.chipName[chip]) : ""}
        </Button>
      </Sheet>
    </>
  );
}
