"use client";

import { motion } from "motion/react";
import type { LiveStanding } from "@/lib/data/types";
import { signed, tone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { RankDelta } from "./rank-delta";
import { copy } from "@/lib/copy";

/** Live mini-league table. Rows glide when ranks change. */
export function MiniTable({ standings, window = 2 }: { standings: LiveStanding[]; window?: number }) {
  const you = standings.findIndex((s) => s.isYou);
  const from = Math.max(0, Math.min(you - window, standings.length - (window * 2 + 1)));
  const rows = standings.slice(from, from + window * 2 + 1);
  const showLeader = from > 0;

  return (
    <div className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
      <div className="grid grid-cols-[32px_1fr_52px_56px] items-center gap-2 border-b border-hairline px-3 py-2 text-[11px] font-medium text-muted-foreground">
        <span>{copy.live.table.rank}</span>
        <span>{copy.live.table.manager}</span>
        <span className="text-right">{copy.live.table.gw}</span>
        <span className="text-right">{copy.live.table.total}</span>
      </div>
      {showLeader && <Row s={standings[0]} />}
      {showLeader && from > 1 && <div className="px-3 py-0.5 text-center text-xs leading-none text-muted-foreground">···</div>}
      {rows.map((s) => (
        <Row key={s.managerId} s={s} />
      ))}
    </div>
  );
}

function Row({ s }: { s: LiveStanding }) {
  return (
    <motion.div
      layout="position"
      transition={spring}
      className={cn("grid grid-cols-[32px_1fr_52px_56px] items-center gap-2 px-3 py-2.5", s.isYou && "bg-brand-soft shadow-[inset_3px_0_0_var(--brand)]")}
    >
      <span className="flex flex-col">
        <span className={cn("num text-sm font-semibold", s.rank === 1 && "text-gold")}>{s.rank}</span>
        <RankDelta delta={s.lastRank - s.rank} className="text-[10px]" />
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-[13px] font-semibold", s.isYou && "text-foreground")}>{s.team}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{s.isYou ? copy.live.table.you : s.name}</span>
      </span>
      <span className={cn("num text-right text-[13px] font-semibold", tone(s.gwPoints))}>{signed(s.gwPoints)}</span>
      <span className="num text-right text-[13px] font-semibold">{s.total}</span>
    </motion.div>
  );
}
