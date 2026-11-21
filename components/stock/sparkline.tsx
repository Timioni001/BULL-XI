import { cn } from "@/lib/utils";

/** Tiny inline price line. Pure SVG, no library. */
export function Sparkline({ values, className, width = 56, height = 22 }: { values: number[]; className?: string; width?: number; height?: number }) {
  if (values.length < 2) return <span className={cn("inline-block", className)} style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`);
  const up = values[values.length - 1] >= values[0];
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("shrink-0 overflow-visible", className)}>
      <polyline points={pts.join(" ")} fill="none" stroke={up ? "var(--bull)" : "var(--bear)"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
