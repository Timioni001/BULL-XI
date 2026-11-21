"use client";

import { motion } from "framer-motion";
import { BUDGET, SQUAD_SIZE } from "@/lib/game/rules";
import { credits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { softSpring } from "@/lib/motion";

export function BudgetBar({ creditsLeft, size, className }: { creditsLeft: number; size: number; className?: string }) {
  const used = Math.min(1, Math.max(0, (BUDGET - creditsLeft) / BUDGET));
  const over = creditsLeft < 0;
  return (
    <div className={cn("rounded-2xl bg-surface-1 px-4 py-3 ring-1 ring-inset ring-hairline", className)}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-label font-semibold uppercase text-muted-foreground">Credits left</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className={cn("num text-[26px] font-semibold leading-none tracking-tight", over && "underline decoration-2 underline-offset-4")}>{credits(creditsLeft)}</span>
            <span className="text-xs text-muted-foreground">of {credits(BUDGET)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-label font-semibold uppercase text-muted-foreground">Stocks</p>
          <p className="mt-1 num text-[26px] font-semibold leading-none tracking-tight">
            {size}
            <span className="text-base text-muted-foreground">/{SQUAD_SIZE}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
        <motion.div className="h-full rounded-full bg-foreground" initial={false} animate={{ width: `${used * 100}%` }} transition={softSpring} />
      </div>
    </div>
  );
}
