"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { ease } from "@/lib/motion";

/**
 * Wax-seal style emblem shown when a squad is locked.
 * Later this represents the squad being sealed in a Private Ephemeral Rollup.
 */
export function Seal({ sealId, animate = true, size = 168, className }: { sealId: string; animate?: boolean; size?: number; className?: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const ticks = Array.from({ length: 48 });
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      {animate && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-foreground/40"
          initial={{ scale: 0.8, opacity: 0.9 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.1, delay: 0.55, ease: "easeOut" }}
        />
      )}
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="1.2" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: animate ? c : 0 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.6, ease }}
        />
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          return (
            <motion.line
              key={i}
              x1={50 + Math.cos(a) * 40}
              y1={50 + Math.sin(a) * 40}
              x2={50 + Math.cos(a) * (i % 4 === 0 ? 37 : 38.5)}
              y2={50 + Math.sin(a) * (i % 4 === 0 ? 37 : 38.5)}
              stroke="var(--muted-foreground)"
              strokeWidth="0.6"
              initial={{ opacity: animate ? 0 : 1 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animate ? 0.3 + i * 0.006 : 0 }}
            />
          );
        })}
      </svg>
      <motion.div
        className="relative grid place-items-center rounded-full bg-surface-2 ring-1 ring-inset ring-hairline"
        style={{ width: size * 0.62, height: size * 0.62 }}
        initial={animate ? { scale: 1.4, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay: animate ? 0.45 : 0 }}
      >
        <Logo size={Math.round(size * 0.32)} />
        <span className="absolute bottom-[14%] font-mono text-[9px] font-semibold tracking-[0.16em] text-muted-foreground">{sealId}</span>
      </motion.div>
    </div>
  );
}
