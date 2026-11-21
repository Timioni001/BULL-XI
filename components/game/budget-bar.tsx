"use client";

import { motion } from "motion/react";
import { BUDGET, SQUAD_SIZE } from "@/lib/game/rules";
import { credits } from "@/lib/format";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { softSpring } from "@/lib/motion";
import { NumberRoll, PointsTicker } from "@/components/live/points-ticker";

export function BudgetBar({ creditsLeft, size, className }: { creditsLeft: number; size: number; className?: string }) {
  const used = Math.min(1, Math.max(0, (BUDGET - creditsLeft) / BUDGET));
  const over = creditsLeft < 0;
  return (
    <div className={cn("noise cut-tr rounded-2xl bg-surface-1 px-4 py-3.5 ring-1 ring-inset ring-hairline", className)}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-label font-semibold uppercase text-muted-foreground">{copy.squad.creditsLeft}</p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <NumberRoll value={creditsLeft} className={cn("font-display text-[30px] font-bold leading-none tracking-tight", over && "underline decoration-2 underline-offset-4")} />
            <span className="text-xs text-muted-foreground">{copy.squad.of(credits(BUDGET))}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-label font-semibold uppercase text-muted-foreground">{copy.squad.stocks}</p>
          <p className="mt-1.5 font-display text-[30px] font-bold leading-none tracking-tight">
            <PointsTicker value={size} />
            <span className="text-base text-muted-foreground">/{SQUAD_SIZE}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div className="h-full rounded-full bg-brand shadow-[0_0_12px_var(--brand-glow)]" initial={false} animate={{ width: `${used * 100}%` }} transition={softSpring} />
      </div>
    </div>
  );
}
