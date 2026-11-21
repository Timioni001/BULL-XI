"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { dur, ease } from "@/lib/motion";

/** Validation hints. Neutral, never red: red only means a price fell. */
export function SquadHints({ hints, complete }: { hints: string[]; complete: boolean }) {
  const items = complete && hints.length === 0 ? [] : hints.slice(0, 3);
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        {complete && hints.length === 0 ? (
          <motion.span
            key="ok"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease }}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background"
          >
            <Check className="size-3.5" strokeWidth={3} /> Squad complete
          </motion.span>
        ) : (
          items.map((h) => (
            <motion.span
              layout
              key={h}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: dur.base, ease }}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-xs font-medium text-foreground/90 ring-1 ring-inset ring-hairline"
            >
              <AlertCircle className="size-3.5 text-muted-foreground" /> {h}
            </motion.span>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
