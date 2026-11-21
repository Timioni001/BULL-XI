"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Drawer as Vaul } from "vaul";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import type { Position, Sector, Stock } from "@/lib/data/types";
import { POSITIONS, canAddToSquad } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { getSparklines } from "@/lib/data";
import { useAsync } from "@/lib/hooks/use-async";
import { credits } from "@/lib/format";
import { useStocks } from "@/lib/hooks/use-stocks";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState } from "@/components/states/states";
import { StockRow, StockRowSkeleton } from "./stock-row";
import { StockDetailSheet } from "./stock-detail-sheet";

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
        <Vaul.Content className="noise fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[92dvh] max-w-[480px] flex-col rounded-t-[28px] bg-surface-1 outline-none ring-1 ring-hairline">
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" />
          {/* Remount per open so filters start from the tapped slot */}
          {props.open && <PickerBody {...props} />}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

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

  return (
    <>
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="flex items-baseline justify-between">
          <Vaul.Title className="font-display text-xl font-bold uppercase tracking-tight">
            {replacing ? P.replace(replacing.ticker) : P.add(copy.positions[position].label)}
          </Vaul.Title>
          <span className="text-xs text-muted-foreground">
            <span className="num font-semibold text-foreground">{credits(budget)}</span> {P.toSpend}
          </span>
        </div>
        <Vaul.Description className="mt-0.5 text-xs text-muted-foreground">
          {P.playsLike(copy.positions[position].label, copy.positions[position].football)}
        </Vaul.Description>

        <label className="mt-3 flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 ring-1 ring-inset ring-hairline focus-within:ring-foreground/40">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={P.search}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            inputMode="search"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label={P.clearSearch} className="grid size-6 place-items-center rounded-full bg-surface-3">
              <X className="size-3.5" />
            </button>
          )}
        </label>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
          {(["ALL", ...POSITIONS] as const).map((p) => (
            <Chip key={p} active={pos === p} onClick={() => setPos(p)}>
              {p === "ALL" ? P.all : copy.positions[p].label}
            </Chip>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
          <Chip subtle active={effectiveSector === "ALL"} onClick={() => setSector("ALL")}>
            {P.allSectors}
          </Chip>
          {sectors.map((s) => (
            <Chip subtle key={s} active={effectiveSector === s} onClick={() => setSector(s)}>
              {s}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            <span className="num">{P.count(list.length)}</span>
          </span>
          <Segmented
            id="picker-sort"
            size="sm"
            className="w-[230px]"
            value={sort}
            onChange={setSort}
            options={[
              { value: "credits", label: P.sort.credits },
              { value: "form", label: P.sort.form },
              { value: "ownership", label: P.sort.ownership },
            ]}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-hairline pb-[max(env(safe-area-inset-bottom),16px)]" data-vaul-no-drag>
        {stocks.status === "loading" && Array.from({ length: 8 }).map((_, i) => <StockRowSkeleton key={i} />)}
        {stocks.status === "error" && <ErrorState title={copy.errors.stocks.title} message={copy.errors.stocks.body} onRetry={stocks.retry} />}
        {stocks.status === "success" && list.length === 0 && (
          <EmptyState
            title={P.emptyTitle}
            body={q ? P.emptySearch(query.trim()) : P.emptyFilter}
            icon={<Search className="size-6 text-muted-foreground" />}
            action={
              <button
                className="h-11 w-full rounded-full bg-surface-2 text-sm font-semibold ring-1 ring-inset ring-hairline"
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
        {stocks.status === "success" &&
          list.map((s) => {
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
                  disabledReason: squadIds.has(detail.id) ? P.inSquad : (() => {
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

function Chip({ active, subtle, onClick, children }: { active: boolean; subtle?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150",
        active ? (subtle ? "bg-surface-3 text-foreground ring-1 ring-inset ring-foreground/30" : "bg-brand text-white") : "bg-surface-2 text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
