"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import type { Position, Stock } from "@/lib/data/types";
import { POSITION_META } from "@/lib/game/rules";
import { cn } from "@/lib/utils";
import { dur, ease, spring } from "@/lib/motion";
import { StockAvatar } from "@/components/stock/stock-avatar";
import { CaptainBadge } from "@/components/game/captain-badge";

export type SlotState = "default" | "selected" | "target" | "dim";

interface PitchSlotProps {
  stock?: Stock | null;
  position: Position;
  role?: "C" | "V" | null;
  /** Second plate under the ticker: credits, points, etc. */
  sub?: React.ReactNode;
  /** Tone of the sub plate */
  subTone?: "neutral" | "up" | "down" | "muted";
  /** Increment to replay a flash */
  flash?: { dir: 1 | -1; key: number } | null;
  state?: SlotState;
  onClick?: () => void;
  badge?: React.ReactNode;
  size?: "md" | "sm";
  /** Stagger delay (s) for the pop-in when a stock lands in the slot */
  delay?: number;
  /** Shared layout id so the slot glides when it moves (swaps) */
  layoutId?: string;
  className?: string;
}

export function PitchSlot({ stock, position, role, sub, subTone = "neutral", flash, state = "default", onClick, badge, size = "md", delay = 0, layoutId, className }: PitchSlotProps) {
  const tile = size === "md" ? 44 : 38;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layoutId={layoutId}
      whileTap={{ scale: 0.92 }}
      transition={layoutId ? spring : { duration: dur.fast, ease }}
      className={cn(
        "relative w-[68px] min-w-0 rounded-xl pb-0.5 pt-1 outline-none",
        className,
      )}
      aria-label={stock ? `${stock.ticker}${role === "C" ? ", captain" : role === "V" ? ", vice-captain" : ""}` : `Add ${POSITION_META[position].label}`}
    >
      <span className={cn("flex flex-col items-center gap-1 transition-opacity duration-200", state === "dim" && "opacity-35")}>
      <span className="relative">
        {stock ? (
          <motion.span
            key={stock.id}
            initial={{ scale: 0.5, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ ...spring, delay }}
            className="block"
          >
            <StockAvatar ticker={stock.ticker} sector={stock.sector} size={tile} inverted />
          </motion.span>
        ) : (
          <span
            className="grid place-items-center rounded-[12px] border border-dashed border-white/25 bg-white/[0.03] text-white/60"
            style={{ width: tile, height: tile }}
          >
            <Plus className="size-5" strokeWidth={1.8} />
          </span>
        )}
        {role && <CaptainBadge role={role} shineKey={stock ? `${stock.id}-${role}` : undefined} className="absolute -right-2 -top-1.5" />}
        {badge && <span className="absolute -left-2 -top-1.5">{badge}</span>}
        {state === "selected" && (
          <motion.span layoutId="slot-select" transition={spring} className="absolute -inset-1.5 rounded-[16px] ring-2 ring-brand shadow-[0_0_20px_var(--brand-glow)]" />
        )}
        {state === "target" && <span className="absolute -inset-1.5 animate-pulse rounded-[16px] border-2 border-dashed border-brand" />}
      </span>

      <span className="flex w-full flex-col items-stretch overflow-hidden rounded-md text-center shadow-[0_4px_10px_-4px_rgb(0_0_0/0.8)]">
        <span className={cn("truncate px-1 py-[3px] text-[10.5px] font-semibold leading-none", stock ? "bg-black/80 font-mono text-white" : "bg-white/10 text-white/60")}>
          {stock ? stock.ticker : POSITION_META[position].label}
        </span>
        {sub !== undefined && (
          <span
            className={cn(
              "relative truncate px-1 py-[3px] text-[10.5px] font-semibold leading-none",
              subTone === "up" && "bg-bull/90 text-black",
              subTone === "down" && "bg-bear/90 text-white",
              subTone === "neutral" && "bg-white/90 text-black",
              subTone === "muted" && "bg-white/15 text-white/70",
            )}
          >
            <span className="num relative z-10">{sub}</span>
            <AnimatePresence>
              {flash && (
                <motion.span
                  key={flash.key}
                  initial={{ opacity: 0.95 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn("absolute inset-0", flash.dir > 0 ? "bg-bull" : "bg-bear")}
                />
              )}
            </AnimatePresence>
          </span>
        )}
      </span>
      </span>
    </motion.button>
  );
}
