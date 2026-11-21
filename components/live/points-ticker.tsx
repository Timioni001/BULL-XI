"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Rolling number, like a stadium scoreboard. Each digit is a column that
 * slides to its value. Tabular numerals keep the width fixed.
 */
export function PointsTicker({ value, className, signed = false }: { value: number; className?: string; signed?: boolean }) {
  const negative = value < 0;
  const digits = String(Math.abs(Math.trunc(value))).split("").map(Number);
  const sign = negative ? "−" : signed && value > 0 ? "+" : "";
  return (
    <span className={cn("num relative inline-flex overflow-hidden leading-none", className)} aria-label={String(value)} role="text">
      {sign && <span aria-hidden>{sign}</span>}
      {digits.map((d, i) => (
        <Digit key={digits.length - i} d={d} />
      ))}
    </span>
  );
}

function Digit({ d }: { d: number }) {
  return (
    <span aria-hidden className="relative inline-block h-[1em] overflow-hidden" style={{ width: "0.62em" }}>
      <motion.span className="absolute inset-x-0 top-0 flex flex-col items-center" initial={false} animate={{ y: `${-d}em` }} transition={spring}>
        {DIGITS.map((n) => (
          <span key={n} className="block h-[1em] leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
