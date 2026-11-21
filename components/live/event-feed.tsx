"use client";

import { AnimatePresence, motion } from "motion/react";
import type { LiveEvent } from "@/lib/data/types";
import { signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";

/** Match-centre style commentary. Minutes count from kickoff, like football. */
export function EventFeed({ events, startedAt, limit = 6 }: { events: LiveEvent[]; startedAt: number; limit?: number }) {
  return (
    <ol className="relative">
      <AnimatePresence initial={false}>
        {events.slice(0, limit).map((e) => {
          const minute = Math.max(1, Math.floor((e.at - startedAt) / 60_000) + 1);
          const dot = e.kind === "captain" ? "bg-gold" : e.delta && e.delta > 0 ? "bg-bull" : e.delta && e.delta < 0 ? "bg-bear" : "bg-foreground/50";
          return (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: dur.slow, ease }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 border-b border-hairline py-2.5">
                <span className="num w-8 shrink-0 font-mono text-xs text-muted-foreground">{minute}&apos;</span>
                <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
                <span className="flex-1 text-[13px] leading-snug">{e.text}</span>
                {e.delta !== undefined && e.kind !== "rank" && e.delta !== 0 && (
                  <span className={cn("num text-xs font-semibold", e.delta > 0 ? "text-bull" : "text-bear")}>{signed(e.delta)}</span>
                )}
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
