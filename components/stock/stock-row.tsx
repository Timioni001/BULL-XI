"use client";

import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import type { PriceTick, Stock } from "@/lib/data/types";
import { POSITION_META } from "@/lib/game/rules";
import { credits, ownership, pct, tone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { StockAvatar } from "./stock-avatar";

interface StockRowProps {
  stock: Stock;
  live?: PriceTick;
  selected?: boolean;
  disabledReason?: string;
  showPosition?: boolean;
  onSelect: () => void;
  onInfo: () => void;
}

export function StockRow({ stock, live, selected, disabledReason, showPosition, onSelect, onInfo }: StockRowProps) {
  const change = live?.change24h ?? stock.change24h;
  const disabled = !!disabledReason && !selected;
  return (
    <div className={cn("flex items-center gap-1 pr-1", disabled && "opacity-45")}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={{ duration: dur.fast, ease }}
        onClick={onSelect}
        aria-disabled={disabled}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-2.5 text-left active:bg-surface-2"
      >
        <span className="relative">
          <StockAvatar ticker={stock.ticker} size={40} />
          {selected && (
            <span className="absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full bg-foreground text-background ring-2 ring-background">
              <Check className="size-3" strokeWidth={3.5} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="font-mono text-[15px] font-semibold">{stock.ticker}</span>
            <span className="truncate text-[13px] text-muted-foreground">{stock.name}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {showPosition && <span className="font-medium text-foreground/70">{POSITION_META[stock.position].label}</span>}
            {showPosition && <span aria-hidden>·</span>}
            <span>{stock.sector}</span>
            <span aria-hidden>·</span>
            <span className="num">{ownership(stock.ownership)} picked</span>
          </span>
        </span>
        <span className="flex flex-col items-end">
          {disabled ? (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80">{disabledReason}</span>
          ) : (
            <span className="num text-[15px] font-semibold">{credits(stock.credits)}</span>
          )}
          <span className={cn("num mt-0.5 text-xs font-medium", tone(change))}>{pct(change)}</span>
        </span>
      </motion.button>
      <button type="button" onClick={onInfo} aria-label={`${stock.ticker} details`} className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-surface-2">
        <Info className="size-[18px]" />
      </button>
    </div>
  );
}

export function StockRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="size-10 animate-pulse rounded-[11px] bg-surface-2" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-44 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="space-y-1.5">
        <div className="ml-auto h-3.5 w-8 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-12 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}
