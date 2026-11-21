"use client";

import { clock } from "@/lib/format";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";

/** Big broadcast-style countdown: HH : MM : SS. */
export function Countdown({ to, className }: { to: number; className?: string }) {
  const now = useNow();
  const c = clock(now ? to - now : 0);
  const hours = c.d * 24 + Number(c.h);
  const parts = [
    { v: String(hours).padStart(2, "0"), l: "hrs" },
    { v: c.m, l: "min" },
    { v: c.s, l: "sec" },
  ];
  return (
    <div className={cn("flex items-start justify-center gap-2", className)} role="timer" aria-live="off">
      {parts.map((p, i) => (
        <div key={p.l} className="flex items-start gap-2">
          <div className="flex flex-col items-center">
            <span className={cn("num font-mono text-[44px] font-semibold leading-none tracking-tight", !now && "opacity-30")}>{now ? p.v : "--"}</span>
            <span className="mt-1.5 text-label font-semibold uppercase text-muted-foreground">{p.l}</span>
          </div>
          {i < 2 && <span className="font-mono text-[40px] leading-none text-muted-foreground/50">:</span>}
        </div>
      ))}
    </div>
  );
}

/** Inline compact countdown, e.g. "5h 12m" or "12:04". */
export function CountdownInline({ to, className }: { to: number; className?: string }) {
  const now = useNow();
  if (!now) return <span className={cn("num", className)}>--</span>;
  const ms = to - now;
  const c = clock(ms);
  const hours = c.d * 24 + Number(c.h);
  const text = ms <= 0 ? "now" : hours > 0 ? `${hours}h ${c.m}m` : `${c.m}:${c.s}`;
  return <span className={cn("num", className)}>{text}</span>;
}
