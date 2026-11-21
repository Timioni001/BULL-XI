"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import type { Stock } from "@/lib/data/types";
import { copy } from "@/lib/copy";
import { credits, pct, tone } from "@/lib/format";
import { useStocks } from "@/lib/hooks/use-stocks";
import { useLivePrices } from "@/lib/hooks/use-live-prices";
import { cn } from "@/lib/utils";
import { StockAvatar } from "./stock-avatar";
import { StockDetailSheet } from "./stock-detail-sheet";

interface Ctx {
  openStock: (stock: Stock) => void;
  openSearch: () => void;
}

const StockSheetsContext = createContext<Ctx>({ openStock: () => {}, openSearch: () => {} });
export const useStockSheets = () => useContext(StockSheetsContext);

/** App-wide stock search (cmd/ctrl + K) and stock detail sheet. */
export function StockSheetsProvider({ children }: { children: React.ReactNode }) {
  const [detail, setDetail] = useState<Stock | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const openStock = useCallback((s: Stock) => setDetail(s), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ openStock, openSearch }), [openStock, openSearch]);

  return (
    <StockSheetsContext.Provider value={value}>
      {children}
      <StockSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(s) => {
          setSearchOpen(false);
          setTimeout(() => setDetail(s), 120);
        }}
      />
      <StockDetailSheet stock={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} />
    </StockSheetsContext.Provider>
  );
}

function StockSearch({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (o: boolean) => void; onSelect: (s: Stock) => void }) {
  const stocks = useStocks();
  const prices = useLivePrices();
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={copy.nav.search}
      overlayClassName="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]"
      contentClassName="noise fixed inset-x-3 top-[max(env(safe-area-inset-top),12px)] z-50 mx-auto max-w-[560px] overflow-hidden rounded-3xl bg-surface-1 shadow-2xl ring-1 ring-hairline lg:top-[12vh]"
    >
      <div className="flex items-center gap-3 border-b border-hairline px-4">
        <Search className="size-4 text-muted-foreground" />
        <Command.Input autoFocus placeholder={copy.search.placeholder} className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground" />
        <kbd className="hidden rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground lg:block">esc</kbd>
      </div>
      <Command.List className="max-h-[60dvh] overflow-y-auto p-2">
        <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">{copy.search.empty}</Command.Empty>
        {(stocks.data ?? []).map((s) => {
          const c = prices?.[s.id]?.change24h ?? s.change24h;
          return (
            <Command.Item
              key={s.id}
              value={`${s.ticker} ${s.name} ${s.sector}`}
              onSelect={() => onSelect(s)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 data-[selected=true]:bg-surface-2")}
            >
              <StockAvatar ticker={s.ticker} sector={s.sector} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-sm font-semibold">{s.ticker}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {s.name} · {copy.positions[s.position].label}
                </span>
              </span>
              <span className="text-right">
                <span className="num block text-sm font-semibold">{credits(s.credits)}</span>
                <span className={cn("num block text-xs", tone(c))}>{pct(c)}</span>
              </span>
            </Command.Item>
          );
        })}
      </Command.List>
    </Command.Dialog>
  );
}
