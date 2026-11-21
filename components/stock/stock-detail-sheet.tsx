"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Drawer as Vaul } from "vaul";
import { getStockChart, type ChartRange, type Stock } from "@/lib/data";
import { CURRENT_GAMEWEEK } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { credits, ownership, pct, signed, tone } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { sectorColor } from "@/lib/sectors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState, Shimmer } from "@/components/states/states";
import { StockAvatar } from "./stock-avatar";

const TradingChart = dynamic(() => import("./trading-chart"), { ssr: false, loading: () => <ChartSkeleton /> });

export interface DetailAction {
  label: string;
  onClick: () => void;
  disabledReason?: string;
  variant?: "default" | "secondary";
}

interface Props {
  stock: Stock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: DetailAction[];
  nested?: boolean;
}

export function StockDetailSheet({ stock, open, onOpenChange, actions, nested }: Props) {
  const Root = nested ? Vaul.NestedRoot : Vaul.Root;
  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Vaul.Content className="noise fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-[480px] flex-col rounded-t-[28px] bg-surface-1 outline-none ring-1 ring-hairline">
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" />
          {stock && <DetailBody key={stock.id} stock={stock} actions={actions} />}
        </Vaul.Content>
      </Vaul.Portal>
    </Root>
  );
}

function DetailBody({ stock, actions }: { stock: Stock; actions?: DetailAction[] }) {
  const [range, setRange] = useState<ChartRange>("1D");
  const prices = useLivePrices();
  const live = prices?.[stock.id];
  const change = live?.change24h ?? stock.change24h;
  const pos = copy.positions[stock.position];
  const peak = Math.max(10, ...stock.recentPoints.map(Math.abs));
  const d = copy.detail;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="overflow-y-auto px-5 pb-5">
        <Vaul.Title className="sr-only">{stock.ticker}</Vaul.Title>
        <Vaul.Description className="sr-only">{stock.name}</Vaul.Description>
        <div className="flex items-center gap-3 pt-4">
          <StockAvatar ticker={stock.ticker} sector={stock.sector} size={52} inverted />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg font-semibold leading-tight">{stock.ticker}</p>
            <p className="truncate text-sm text-muted-foreground">{stock.name}</p>
          </div>
          <div className="text-right">
            <p className="num font-display text-2xl font-bold leading-none">{credits(stock.credits)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d.credits}</p>
          </div>
        </div>

        <div className="mt-5">
          <ChartBlock key={range} id={stock.id} range={range} />
          <Segmented id="chart-range" size="sm" className="mt-3" value={range} onChange={setRange} options={[{ value: "1D", label: d.range["1D"] }, { value: "1W", label: d.range["1W"] }]} />
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          <Stat label={d.move24h} value={<span className={tone(change)}>{pct(change)}</span>} />
          <Stat label={d.pickedBy} value={ownership(stock.ownership)} />
          <Stat label={d.form} value={stock.form.toFixed(1)} />
          <Stat label={d.position} value={pos.label} sub={pos.football} />
          <Stat
            label={d.sector}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: sectorColor(stock.sector) }} />
                {stock.sector}
              </span>
            }
          />
          <Stat label={d.perPercent} value="10" sub={d.capped} />
        </dl>

        <div className="mt-5">
          <p className="text-label font-semibold uppercase text-muted-foreground">{d.last5}</p>
          <div className="mt-3 flex h-24 items-stretch gap-2">
            {stock.recentPoints.map((p, i) => (
              <div key={i} className="flex flex-1 flex-col items-center">
                <div className="relative flex w-full flex-1 flex-col justify-center">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-hairline" />
                  <div className="flex h-1/2 items-end">{p > 0 && <div className="w-full rounded-t-md bg-bull" style={{ height: `${(p / peak) * 100}%` }} />}</div>
                  <div className="flex h-1/2 items-start">{p < 0 && <div className="w-full rounded-b-md bg-bear" style={{ height: `${(-p / peak) * 100}%` }} />}</div>
                </div>
                <span className={cn("num mt-1 text-xs font-semibold", tone(p))}>{signed(p)}</span>
                <span className="text-[10px] text-muted-foreground">GW{CURRENT_GAMEWEEK - stock.recentPoints.length + i}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {actions && actions.length > 0 && (
        <div className="pb-safe flex gap-2 border-t border-hairline bg-surface-1 px-5 pt-3">
          {actions.map((a) => (
            <Button key={a.label} size="cta" variant={a.variant ?? "default"} className="flex-1" disabled={!!a.disabledReason} onClick={a.onClick}>
              {a.disabledReason ?? a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartBlock({ id, range }: { id: string; range: ChartRange }) {
  const chart = useAsync(() => getStockChart(id, range));
  if (chart.status === "error") return <ErrorState title={copy.errors.chart.title} message={copy.errors.chart.body} onRetry={chart.retry} className="py-6" />;
  if (chart.status === "loading") return <ChartSkeleton />;
  return <TradingChart data={chart.data} />;
}

function ChartSkeleton() {
  return (
    <div>
      <Shimmer className="mb-2 h-8 w-32" />
      <Shimmer className="h-48 w-full rounded-xl" />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-hairline">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 truncate text-sm font-semibold">{value}</dd>
      {sub && <dd className="truncate text-[11px] text-muted-foreground">{sub}</dd>}
    </div>
  );
}
