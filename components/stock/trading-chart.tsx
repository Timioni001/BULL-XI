"use client";

import { useEffect, useRef, useState } from "react";
import type { PricePoint } from "@/lib/data/types";
import { pct, usd } from "@/lib/format";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

/**
 * TradingView Lightweight Charts, loaded on demand so it never weighs on
 * first paint. Area series, crosshair readout, colours follow the move.
 */
export default function TradingChart({ data, className }: { data: PricePoint[]; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ price: number; t: number } | null>(null);
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const up = last >= first;
  const shown = hover ?? { price: last, t: data[data.length - 1]?.t ?? 0 };
  const change = first ? ((shown.price - first) / first) * 100 : 0;

  useEffect(() => {
    const node = el.current;
    if (!node || data.length === 0) return;
    let disposed = false;
    let cleanup = () => {};
    void import("lightweight-charts").then(({ createChart, AreaSeries, ColorType, CrosshairMode, LineStyle }) => {
      if (disposed) return;
      const color = up ? "#16C784" : "#EA3943";
      const chart = createChart(node, {
        autoSize: true,
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#6b6b6b", fontFamily: "var(--font-geist-mono)", fontSize: 10, attributionLogo: false },
        grid: { vertLines: { visible: false }, horzLines: { color: "rgba(0,0,0,0.06)" } },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.08 } },
        timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: { color: "rgba(0,0,0,0.3)", style: LineStyle.Dashed, labelVisible: false },
          horzLine: { color: "rgba(0,0,0,0.2)", style: LineStyle.Dashed, labelBackgroundColor: "#111111" },
        },
        handleScale: false,
        handleScroll: false,
      });
      const series = chart.addSeries(AreaSeries, {
        lineColor: color,
        topColor: up ? "rgba(22,199,132,0.28)" : "rgba(234,57,67,0.28)",
        bottomColor: "rgba(0,0,0,0)",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#ffffff",
      });
      series.setData(data.map((d) => ({ time: Math.floor(d.t / 1000) as never, value: d.price })));
      chart.timeScale().fitContent();
      chart.subscribeCrosshairMove((p) => {
        const v = p.seriesData.get(series) as { value?: number } | undefined;
        if (!p.time || !v?.value) setHover(null);
        else setHover({ price: v.value, t: Number(p.time) * 1000 });
      });
      cleanup = () => chart.remove();
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [data, up]);

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="num font-display text-[30px] font-bold tracking-tight">{usd(shown.price)}</span>
        <span className="text-right">
          <span className={cn("num block text-sm font-semibold", change >= 0 ? "text-bull" : "text-bear")}>{pct(change)}</span>
          <span className="num block text-[11px] text-muted-foreground">
            {hover ? new Date(hover.t).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }) : copy.detail.now}
          </span>
        </span>
      </div>
      <div ref={el} className="h-48 w-full touch-pan-y" role="img" aria-label="Price chart" />
    </div>
  );
}
