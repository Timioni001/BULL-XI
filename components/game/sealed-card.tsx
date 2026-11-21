"use client";

import { motion } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { ease } from "@/lib/motion";

/**
 * The lock moment. Your XI sits on a card, a triangular flap (the logo's
 * triangle) folds over it and the bull mark stamps it shut.
 * Later this is the squad sealed in a Private Ephemeral Rollup.
 */
export function SealedCard({ rows, captain, sealId, animate = true, className }: { rows: string[][]; captain: string; sealId: string; animate?: boolean; className?: string }) {
  const d = (s: number) => (animate ? s : 0);
  let n = 0;
  return (
    <motion.div
      className={cn("theme-dark relative mx-auto w-full max-w-[320px] bg-transparent [perspective:900px]", className)}
      animate={animate ? { y: [0, 0, 5, -2, 0] } : undefined}
      transition={{ duration: 0.5, delay: 1.0, times: [0, 0.1, 0.35, 0.7, 1] }}
    >
      <div className="relative">
      <div className="glow-brand relative aspect-[1.55] overflow-hidden rounded-[26px] bg-surface-2">
        <motion.div
          className="absolute inset-0 flex flex-col justify-center gap-1.5 px-4 pt-2"
          initial={false}
          animate={{ opacity: animate ? [1, 1, 0.18] : 0.18 }}
          transition={{ duration: 1, times: [0, 0.55, 1] }}
        >
          {rows.map((r, i) => (
            <div key={i} className="flex justify-center gap-1">
              {r.map((t) => (
                <motion.span
                  key={t}
                  initial={animate ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: d(0.03 * n++), duration: 0.25, ease }}
                  className={cn("rounded-md bg-surface-3 px-1.5 py-1 font-mono text-[10px] font-semibold", t === captain && "bg-gold text-black")}
                >
                  {t}
                </motion.span>
              ))}
            </div>
          ))}
        </motion.div>

        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[64%] origin-top [backface-visibility:hidden]"
          style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", background: "linear-gradient(180deg, #ff7a45, #e04812)" }}
          initial={animate ? { rotateX: -178 } : false}
          animate={{ rotateX: 0 }}
          transition={{ delay: d(0.55), duration: 0.45, ease: [0.5, 0, 0.2, 1] }}
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <motion.div
        className="absolute left-1/2 top-[64%] grid size-[76px] place-items-center rounded-full bg-[#1a1210] ring-2 ring-brand shadow-[0_0_0_6px_rgb(255_91_31/0.18),0_0_40px_var(--brand-glow)]"
        style={{ x: "-50%", y: "-50%" }}
        initial={animate ? { scale: 2.4, rotate: -24, opacity: 0 } : false}
        animate={{ scale: 1, rotate: -8, opacity: 1 }}
        transition={{ delay: d(1.0), type: "spring", stiffness: 520, damping: 20 }}
      >
        <Logo size={40} light />
      </motion.div>
      {animate && (
        <motion.span
          aria-hidden
          className="absolute left-1/2 top-[64%] size-[76px] rounded-full border-2 border-brand"
          style={{ x: "-50%", y: "-50%" }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 2.4, opacity: [0, 0.8, 0] }}
          transition={{ delay: 1.05, duration: 0.8, ease: "easeOut" }}
        />
      )}
      </div>
      <motion.p
        initial={animate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: d(1.3) }}
        className="mt-3 text-center font-mono text-[11px] tracking-[0.2em] text-muted-foreground"
      >
        {copy.lock.seal.toUpperCase()} {sealId}
      </motion.p>
    </motion.div>
  );
}
