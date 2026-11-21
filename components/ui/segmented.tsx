"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  size?: "sm" | "md";
  id: string;
}

export function Segmented<T extends string>({ value, onChange, options, className, size = "md", id }: SegmentedProps<T>) {
  return (
    <div role="tablist" className={cn("flex rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-hairline", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 whitespace-nowrap rounded-lg font-semibold transition-colors duration-150",
              size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-[13px]",
              active ? "text-white" : "text-muted-foreground",
            )}
          >
            {active && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-lg bg-brand shadow-[0_6px_18px_-8px_var(--brand-glow)]" />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
