import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";

/** Rank movement: positive `delta` = climbed. */
export function RankDelta({ delta, className, size = "sm" }: { delta: number; className?: string; size?: "sm" | "md" }) {
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const icon = size === "md" ? "size-4" : "size-3";
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold", size === "md" ? "text-sm" : "text-xs", delta > 0 ? "text-bull" : delta < 0 ? "text-bear" : "text-muted-foreground", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={Math.sign(delta)}
          initial={{ y: delta >= 0 ? 8 : -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: delta >= 0 ? -8 : 8, opacity: 0 }}
          transition={{ duration: dur.slow, ease }}
          className="inline-flex"
        >
          <Icon className={icon} strokeWidth={2.6} />
        </motion.span>
      </AnimatePresence>
      {delta !== 0 && <span className="num">{Math.abs(delta)}</span>}
    </span>
  );
}
