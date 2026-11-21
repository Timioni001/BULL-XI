"use client";

import type { LiveStockScore, Position, Stock } from "@/lib/data/types";
import { signed } from "@/lib/format";
import { useFlash } from "@/lib/hooks/use-flash";
import { PitchSlot } from "@/components/pitch/pitch-slot";

/** A pitch slot that shows live points and flashes on every change. */
export function LiveSlot({ stock, position, score, role, bench, onClick }: { stock: Stock; position: Position; score?: LiveStockScore; role?: "C" | "V" | null; bench?: boolean; onClick?: () => void }) {
  const value = bench ? (score?.points ?? 0) : (score?.counted ?? 0);
  const flash = useFlash(value);
  const tone = bench ? "muted" : value > 0 ? "up" : value < 0 ? "down" : "neutral";
  return (
    <PitchSlot
      stock={stock}
      position={position}
      role={role}
      sub={score ? signed(value) : "--"}
      subTone={tone}
      flash={bench ? null : flash}
      state={bench ? "dim" : "default"}
      onClick={onClick}
      badge={
        !bench && score && score.multiplier > 1 ? (
          <span className="grid h-[18px] place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-black shadow-[0_0_0_2px_var(--pitch)]">x{score.multiplier}</span>
        ) : undefined
      }
    />
  );
}
