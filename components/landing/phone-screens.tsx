import type { Stock } from "@/lib/data/types";
import { credits, pct, tone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LogoTile } from "./logo-tile";

/** Static app screens for the side phones in the hero. */
export function PickerScreen({ stocks }: { stocks: Stock[] }) {
  return (
    <div className="h-full bg-background px-4 pt-2">
      <p className="font-display text-[24px] font-black uppercase leading-[0.92]">
        <span className="block">Choose a</span>
        <span className="block text-heading-muted">stock</span>
      </p>
      <div className="mt-3 flex h-9 items-center rounded-xl bg-surface-1 px-3 text-[12px] text-muted-foreground">Search ticker or company</div>
      <div className="mt-3 space-y-2">
        {stocks.slice(0, 7).map((s, i) => (
          <div key={s.id} className={cn("flex items-center gap-2.5 rounded-2xl p-2", i === 0 ? "bg-brand text-brand-foreground" : "bg-surface-1")}>
            <LogoTile ticker={s.ticker} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold">{s.name}</p>
              <p className={cn("font-mono text-[10px]", i === 0 ? "opacity-70" : "text-muted-foreground")}>{s.ticker}</p>
            </div>
            <div className="text-right">
              <p className="num text-[12px] font-bold">{credits(s.credits)}</p>
              <p className={cn("num text-[10px] font-semibold", i === 0 ? "" : tone(s.change24h))}>{pct(s.change24h, 1)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeagueScreen() {
  const rows = [
    { r: 1, t: "Your XI", p: 361, d: "▲2", you: true },
    { r: 2, t: "Inter Margin", p: 352, d: "▼1" },
    { r: 3, t: "Dividend FC", p: 349, d: "▼1" },
    { r: 4, t: "Theta Gang FC", p: 341, d: "–" },
    { r: 5, t: "Paper Hands XI", p: 333, d: "▲1" },
    { r: 6, t: "Bear Necessities", p: 327, d: "▼1" },
  ];
  return (
    <div className="h-full bg-background px-4 pt-2">
      <p className="font-display text-[24px] font-black uppercase leading-[0.92]">
        <span className="block">Your</span>
        <span className="block text-heading-muted">leagues</span>
      </p>
      <div className="mt-3 rounded-2xl bg-brand p-3 text-brand-foreground">
        <p className="text-[10px] font-semibold uppercase opacity-70">Office Legends</p>
        <p className="num font-display text-[34px] font-black leading-none">1st</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-2xl bg-surface-1">
        {rows.map((x) => (
          <div key={x.r} className={cn("flex items-center gap-2 px-3 py-2.5 text-[12px]", x.you && "bg-brand-soft")}>
            <span className={cn("num w-3 font-bold", x.r === 1 && "text-gold")}>{x.r}</span>
            <span className="flex-1 truncate font-semibold">{x.t}</span>
            <span className={cn("num text-[10px]", x.d.startsWith("▲") ? "text-bull" : x.d.startsWith("▼") ? "text-bear" : "text-muted-foreground")}>{x.d}</span>
            <span className="num w-8 text-right font-bold">{x.p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Static live screen shown until the real live preview mounts. */
export function LiveStaticScreen({ stocks }: { stocks: Stock[] }) {
  const rows = [stocks.slice(0, 1), stocks.slice(1, 5), stocks.slice(5, 9), stocks.slice(9, 11)];
  return (
    <div className="h-full bg-background px-2.5 pt-1">
      <div className="flex items-center justify-between px-3 pb-3 pt-2">
        <p className="font-display text-sm font-bold uppercase">Bulls on Parade</p>
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-brand px-2.5 text-[10px] font-bold tracking-[0.14em] text-brand-foreground">LIVE</span>
      </div>
      <div className="theme-dark mb-3 flex items-end justify-between rounded-3xl bg-[linear-gradient(160deg,#2a1d18,#111112_60%)] px-4 py-3 ring-1 ring-inset ring-brand/30">
        <span className="num font-display text-[44px] font-bold leading-none">24</span>
        <span className="num font-display text-2xl font-bold">3rd</span>
      </div>
      <div className="pitch-diagonal flex flex-col gap-4 rounded-[28px] py-4">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-center gap-3">
            {r.map((s) => (
              <LogoTile key={s.id} ticker={s.ticker} size={42} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
