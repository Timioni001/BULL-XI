"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Drawer as Vaul } from "vaul";
import { Check, Flame, Gem, Info, LayoutGrid, Plus, Search, Shield, TrendingUp, X, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { Position, Sector, Stock } from "@/lib/data/types";
import { POSITIONS, canAddToSquad } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { getSparklines } from "@/lib/data";
import { useAsync } from "@/lib/hooks/use-async";
import { credits, pct, tone } from "@/lib/format";
import { useStocks } from "@/lib/hooks/use-stocks";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState } from "@/components/states/states";
import { StockRow } from "./stock-row";
import { StockDetailSheet } from "./stock-detail-sheet";
import { StockArt } from "./stock-art";
import { StockAvatar } from "./stock-avatar";

type SortKey = "credits" | "form" | "ownership";

interface StockPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Position of the slot that was tapped */
  position: Position;
  /** Current squad */
  squad: Stock[];
  /** Stock being replaced, if the slot was filled */
  replacing?: Stock | null;
  creditsLeft: number;
  onPick: (stock: Stock) => void;
}

export function StockPicker(props: StockPickerProps) {
  return (
    <Vaul.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Vaul.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[94dvh] max-w-[480px] flex-col rounded-t-[32px] bg-background outline-none ring-1 ring-hairline">
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" />
          {/* Remount per open so filters start from the tapped slot */}
          {props.open && <PickerBody {...props} />}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

const POS_ICON: Record<Position, LucideIcon> = { ETF: Shield, BLUE: Gem, GROWTH: TrendingUp, RISK: Flame };

function PickerBody({ position, squad, replacing, creditsLeft, onPick }: StockPickerProps) {
  const stocks = useStocks();
  const prices = useLivePrices();
  const [pos, setPos] = useState<Position | "ALL">(position);
  const [sector, setSector] = useState<Sector | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("credits");
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const [detail, setDetail] = useState<Stock | null>(null);
  const sparks = useAsync(getSparklines);
  const P = copy.picker;

  const sectors = useMemo(() => {
    const set = new Set<Sector>();
    for (const s of stocks.data ?? []) if (pos === "ALL" || s.position === pos) set.add(s.sector);
    return [...set].sort();
  }, [stocks.data, pos]);

  const effectiveSector = sector !== "ALL" && sectors.includes(sector) ? sector : "ALL";

  const list = useMemo(() => {
    const data = stocks.data ?? [];
    return data
      .filter((s) => (pos === "ALL" || s.position === pos) && (effectiveSector === "ALL" || s.sector === effectiveSector))
      .filter((s) => !q || s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .sort((a, b) => b[sort] - a[sort] || a.ticker.localeCompare(b.ticker));
  }, [stocks.data, pos, effectiveSector, q, sort]);

  const squadIds = new Set(squad.map((s) => s.id));
  const check = (s: Stock) => {
    // A stock of the tapped position replaces the tapped slot.
    const base = replacing && s.position === replacing.position ? squad.filter((x) => x.id !== replacing.id) : squad;
    return canAddToSquad(base, s);
  };
  const budget = replacing ? creditsLeft + replacing.credits : creditsLeft;

  const pick = (s: Stock) => {
    const c = check(s);
    if (!c.ok) {
      haptic(20);
      toast(c.code === "in_squad" ? P.alreadyIn(s.ticker) : c.code === "over_budget" ? P.cantAfford(s.ticker) : c.reason, {
        description: c.code === "over_budget" ? P.youHave(credits(budget)) : c.code === "sector_full" ? copy.squad.rules : undefined,
      });
      return;
    }
    haptic();
    onPick(s);
  };

  const featured = list.slice(0, 8);
  const label = pos === "ALL" ? P.stock : copy.positions[pos].label;

  return (
    <>
      <div className="shrink-0 px-5 pb-3 pt-3">
        <div className="flex items-end justify-between gap-3">
          <Vaul.Title className="font-display text-[34px] font-black uppercase leading-[0.92]">
            <span className="block">{replacing ? P.replaceShort : P.choose}</span>
            <span className="block text-heading-muted">{replacing ? replacing.ticker : label}</span>
          </Vaul.Title>
          <div className="pb-1 text-right">
            <p className="num font-display text-2xl font-black leading-none">{credits(budget)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{P.toSpend}</p>
          </div>
        </div>
        <Vaul.Description className="sr-only">{P.playsLike(copy.positions[position].label, copy.positions[position].football)}</Vaul.Description>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),20px)]" data-vaul-no-drag>
        <div className="px-5">
          <label className="flex h-12 items-center gap-2.5 rounded-2xl bg-surface-1 px-4 ring-1 ring-inset ring-hairline focus-within:ring-2 focus-within:ring-brand">
            <Search className="size-[18px] text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={P.search}
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
              inputMode="search"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label={P.clearSearch} className="grid size-7 place-items-center rounded-full bg-surface-3">
                <X className="size-3.5" />
              </button>
            )}
          </label>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5">
          {(["ALL", ...POSITIONS] as const).map((p) => {
            const Icon = p === "ALL" ? LayoutGrid : POS_ICON[p];
            const active = pos === p;
            return (
              <button
                key={p}
                onClick={() => setPos(p)}
                aria-pressed={active}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-[13px] font-semibold transition-colors duration-150",
                  active ? "bg-foreground text-background" : "bg-surface-1 text-muted-foreground ring-1 ring-inset ring-hairline",
                )}
              >
                <Icon className="size-4" />
                {p === "ALL" ? P.all : copy.positions[p].label}
              </button>
            );
          })}
        </div>

        {stocks.status === "loading" && (
          <div className="mt-4 flex gap-3 overflow-hidden px-5">
            {[0, 1].map((i) => (
              <div key={i} className="h-[272px] w-[184px] shrink-0 animate-pulse rounded-[26px] bg-surface-1" />
            ))}
          </div>
        )}
        {stocks.status === "error" && <ErrorState title={copy.errors.stocks.title} message={copy.errors.stocks.body} onRetry={stocks.retry} />}

        {stocks.status === "success" && list.length === 0 && (
          <EmptyState
            title={P.emptyTitle}
            body={q ? P.emptySearch(query.trim()) : P.emptyFilter}
            icon={<Search className="size-6 text-muted-foreground" />}
            action={
              <button
                className="h-12 w-full rounded-2xl bg-surface-1 text-sm font-semibold ring-1 ring-inset ring-hairline"
                onClick={() => {
                  setQuery("");
                  setSector("ALL");
                  setPos("ALL");
                }}
              >
                {P.clearFilters}
              </button>
            }
          />
        )}

        {stocks.status === "success" && list.length > 0 && (
          <>
            <div className="mt-5 flex items-center justify-between px-5">
              <h3 className="font-display text-[15px] font-black uppercase">{P.topPicks}</h3>
              <span className="text-xs text-muted-foreground">{P.sortedBy(P.sort[sort])}</span>
            </div>
            <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1">
              {featured.map((s) => {
                const c = check(s);
                return (
                  <FeatureCard
                    key={s.id}
                    stock={s}
                    change={prices?.[s.id]?.change24h ?? s.change24h}
                    selected={squadIds.has(s.id)}
                    disabledReason={c.ok ? undefined : c.reason}
                    onPick={() => pick(s)}
                    onInfo={() => setDetail(s)}
                  />
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 px-5">
              <h3 className="font-display text-[15px] font-black uppercase">{P.count(list.length)}</h3>
              <Segmented
                id="picker-sort"
                size="sm"
                className="w-[220px]"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "credits", label: P.sort.credits },
                  { value: "form", label: P.sort.form },
                  { value: "ownership", label: P.sort.ownership },
                ]}
              />
            </div>
            <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-5">
              <Chip active={effectiveSector === "ALL"} onClick={() => setSector("ALL")}>
                {P.allSectors}
              </Chip>
              {sectors.map((s) => (
                <Chip key={s} active={effectiveSector === s} onClick={() => setSector(s)}>
                  {s}
                </Chip>
              ))}
            </div>
            <div className="mx-4 mt-3 overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
              {list.map((s) => {
                const c = check(s);
                return (
                  <StockRow
                    key={s.id}
                    stock={s}
                    live={prices?.[s.id]}
                    selected={squadIds.has(s.id)}
                    disabledReason={c.ok ? undefined : c.reason}
                    showPosition={pos === "ALL"}
                    onSelect={() => pick(s)}
                    onInfo={() => setDetail(s)}
                    spark={sparks.data?.[s.id]}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      <StockDetailSheet
        nested
        stock={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        actions={
          detail
            ? [
                {
                  label: replacing && detail.position === replacing.position ? P.swapIn(replacing.ticker) : P.addToSquad,
                  disabledReason: squadIds.has(detail.id)
                    ? P.inSquad
                    : (() => {
                        const c = check(detail);
                        return c.ok ? undefined : c.reason;
                      })(),
                  onClick: () => {
                    const s = detail;
                    setDetail(null);
                    pick(s);
                  },
                },
              ]
            : undefined
        }
      />
    </>
  );
}

/** Big poster card, like a fantasy player card. Orange when it's in your squad. */
function FeatureCard({ stock, change, selected, disabledReason, onPick, onInfo }: { stock: Stock; change: number; selected: boolean; disabledReason?: string; onPick: () => void; onInfo: () => void }) {
  const disabled = !!disabledReason && !selected;
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative flex w-[184px] shrink-0 snap-start flex-col rounded-[26px] p-2 transition-colors duration-200",
        selected ? "bg-brand text-brand-foreground shadow-[0_18px_40px_-18px_var(--brand-glow)]" : "bg-surface-1 ring-1 ring-inset ring-hairline",
        disabled && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between px-2 pt-1">
        <span className={cn("truncate text-[11px] font-semibold uppercase tracking-wide", selected ? "text-brand-foreground" : "text-muted-foreground")}>
          {stock.sector} · {copy.positions[stock.position].label}
        </span>
        <button onClick={onInfo} aria-label={`${stock.ticker} ${copy.common.details}`} className={cn("-mr-1 grid size-8 place-items-center rounded-full", selected ? "text-brand-foreground" : "text-muted-foreground")}>
          <Info className="size-4" />
        </button>
      </div>
      <button onClick={onPick} className="text-left" aria-label={`${stock.ticker}, ${credits(stock.credits)} ${copy.common.credits}`}>
        <StockArt ticker={stock.ticker} sector={stock.sector} className="mt-1 h-[124px] rounded-[20px]">
          <div className="flex h-full items-center justify-center">
            <StockAvatar ticker={stock.ticker} sector={stock.sector} size={64} />
          </div>
        </StockArt>
        <div className="px-2 pb-1 pt-3">
          <p className="truncate font-display text-[15px] font-black uppercase leading-tight">{stock.name}</p>
          <p className={cn("font-mono text-xs", selected ? "text-brand-foreground" : "text-muted-foreground")}>{stock.ticker}</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="num font-display text-[28px] font-black leading-none">{credits(stock.credits)}</p>
              {disabled ? (
                <p className="mt-1 text-[11px] font-semibold">{disabledReason}</p>
              ) : (
                <p className={cn("num mt-1 text-[12px] font-semibold", selected ? "text-brand-foreground" : tone(change))}>{pct(change)}</p>
              )}
            </div>
            <span className={cn("grid size-10 place-items-center rounded-full", selected ? "bg-brand-foreground text-brand" : "bg-surface-3 text-foreground")}>
              {selected ? <Check className="size-5" strokeWidth={3} /> : <Plus className="size-5" />}
            </span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

function Chip({ active, subtle, onClick, children }: { active: boolean; subtle?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150",
        active ? (subtle ? "bg-surface-3 text-foreground ring-1 ring-inset ring-foreground/30" : "bg-brand text-brand-foreground") : "bg-surface-2 text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
