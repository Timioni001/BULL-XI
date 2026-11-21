"use client";

import { useId, useMemo, useState } from "react";
import type { PricePoint } from "@/lib/data/types";
import { pct, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const W = 358;
const H = 160;

/** Lightweight SVG area chart with touch scrubbing. */
export function PriceChart({ data, className }: { data: PricePoint[]; className?: string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const { path, area, min, max, up } = useMemo(() => {
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.12 || 1;
    const y = (p: number) => H - ((p - (min - pad)) / (max - min + pad * 2)) * H;
    const x = (i: number) => (i / (data.length - 1)) * W;
    const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.price).toFixed(1)}`);
    return {
      path: `M${pts.join("L")}`,
      area: `M0,${H}L${pts.join("L")}L${W},${H}Z`,
      min: min - pad,
      max: max + pad,
      up: data[data.length - 1].price >= data[0].price,
    };
  }, [data]);

  const color = up ? "var(--bull)" : "var(--bear)";
  const i = hover ?? data.length - 1;
  const point = data[i];
  const change = ((point.price - data[0].price) / data[0].price) * 100;
  const hx = (i / (data.length - 1)) * W;
  const hy = H - ((point.price - min) / (max - min)) * H;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(f * (data.length - 1)));
  };

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="num text-[28px] font-semibold tracking-tight">{usd(point.price)}</span>
        <span className="text-right">
          <span className={cn("num block text-sm font-semibold", change >= 0 ? "text-bull" : "text-bear")}>{pct(change)}</span>
          <span className="num block text-[11px] text-muted-foreground">
            {hover === null ? "Now" : new Date(point.t).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full touch-none overflow-visible"
        preserveAspectRatio="none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        onPointerUp={() => setHover(null)}
        role="img"
        aria-label="Price chart"
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g${id})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover !== null && (
          <>
            <line x1={hx} x2={hx} y1={0} y2={H} stroke="var(--muted-foreground)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={hx} cy={hy} r="4" fill={color} stroke="var(--background)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </div>
  );
}
