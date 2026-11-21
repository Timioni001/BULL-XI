"use client";

import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

/** Rolling number, like a stadium scoreboard. Digits roll, never fade. */
export function PointsTicker({ value, className, signed = false, suffix }: { value: number; className?: string; signed?: boolean; suffix?: string }) {
  return (
    <NumberFlow
      value={value}
      className={cn("num", className)}
      format={{ signDisplay: signed ? "exceptZero" : "auto", maximumFractionDigits: 0 }}
      suffix={suffix}
      spinTiming={{ duration: 450, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      transformTiming={{ duration: 450, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      willChange
    />
  );
}

/** Rolling decimal, for credits and prices. */
export function NumberRoll({ value, className, decimals = 1, prefix, suffix, signed }: { value: number; className?: string; decimals?: number; prefix?: string; suffix?: string; signed?: boolean }) {
  return (
    <NumberFlow
      value={value}
      className={cn("num", className)}
      prefix={prefix}
      suffix={suffix}
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals, signDisplay: signed ? "exceptZero" : "auto" }}
      spinTiming={{ duration: 400, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
    />
  );
}
