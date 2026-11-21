"use client";

import { useState } from "react";
import { Drawer as Vaul } from "vaul";
import { getStockChart, type ChartRange, type Stock } from "@/lib/data";
import { CURRENT_GAMEWEEK, POSITION_META } from "@/lib/game/rules";
import { credits, ownership, pct, signed, tone } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState, Shimmer } from "@/components/states/states";
import { StockAvatar } from "./stock-avatar";
import { PriceChart } from "./price-chart";

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
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Vaul.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-[440px] flex-col rounded-t-3xl bg-surface-1 outline-none ring-1 ring-hairline">
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
  const m = POSITION_META[stock.position];
  const peak = Math.max(10, ...stock.recentPoints.map(Math.abs));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="overflow-y-auto px-4 pb-4">
        <Vaul.Title className="sr-only">{stock.ticker} details</Vaul.Title>
        <Vaul.Description className="sr-only">Price chart and stats for {stock.name}</Vaul.Description>
        <div className="flex items-center gap-3 pt-4">
          <StockAvatar ticker={stock.ticker} size={48} inverted />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg font-semibold leading-tight">{stock.ticker}</p>
            <p className="truncate text-sm text-muted-foreground">{stock.name}</p>
          </div>
          <div className="text-right">
            <p className="num text-lg font-semibold leading-tight">{credits(stock.credits)}</p>
            <p className="text-xs text-muted-foreground">credits</p>
          </div>
        </div>

        <div className="mt-5">
          <ChartBlock key={range} id={stock.id} range={range} />
          <Segmented id="chart-range" size="sm" className="mt-3" value={range} onChange={setRange} options={[{ value: "1D", label: "1 day" }, { value: "1W", label: "1 week" }]} />
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="24h move" value={<span className={tone(change)}>{pct(change)}</span>} />
          <Stat label="Picked by" value={ownership(stock.ownership)} />
          <Stat label="Form" value={stock.form.toFixed(1)} />
          <Stat label="Position" value={m.label} sub={m.football} />
          <Stat label="Sector" value={stock.sector} />
          <Stat label="Points per 1%" value="10" sub="capped at 50" />
        </dl>

        <div className="mt-5">
          <p className="text-label font-semibold uppercase text-muted-foreground">Last 5 gameweeks</p>
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
        <div className="pb-safe flex gap-2 border-t border-hairline bg-surface-1 px-4 pt-3">
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
  if (chart.status === "error") return <ErrorState title="Chart unavailable" message={chart.error.message} onRetry={chart.retry} className="py-6" />;
  if (chart.status === "loading")
    return (
      <div>
        <Shimmer className="mb-2 h-8 w-32" />
        <Shimmer className="h-40 w-full rounded-xl" />
      </div>
    );
  return <PriceChart data={chart.data} />;
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 truncate text-sm font-semibold">{value}</dd>
      {sub && <dd className="truncate text-[11px] text-muted-foreground">{sub}</dd>}
    </div>
  );
}
