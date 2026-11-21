import type { Stock } from "@/lib/data/types";
import { photoFor } from "@/lib/data/media";
import { pct, signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StockAvatar } from "@/components/stock/stock-avatar";

/**
 * Artwork for the landing corridor: company photos with one consistent layout.
 * Top: logo and today's move. Bottom: company, ticker and gameweek points.
 */
export function corridorCards(stocks: Stock[]): React.ReactNode[] {
  const withPhoto = stocks.filter((s) => photoFor(s.id));
  const pick = (i: number) => withPhoto[i % withPhoto.length];
  return [
    <PhotoCard key="p0" stock={pick(0)} captain />,
    <PhotoCard key="p1" stock={pick(1)} />,
    <ScoreCard key="score" />,
    <PhotoCard key="p2" stock={pick(2)} />,
    <PhotoCard key="p3" stock={pick(3)} />,
    <PhotoCard key="p4" stock={pick(4)} />,
    <PhotoCard key="p5" stock={pick(5)} />,
    <PhotoCard key="p6" stock={pick(6)} />,
    <PhotoCard key="p7" stock={pick(7)} />,
    <PhotoCard key="p8" stock={pick(8)} />,
  ];
}

function PhotoCard({ stock, captain }: { stock: Stock; captain?: boolean }) {
  const photo = photoFor(stock.id)!;
  const up = stock.change24h >= 0;
  const pts = stock.recentPoints[stock.recentPoints.length - 1] * (captain ? 2 : 1);
  return (
    <div className="relative size-full bg-[#161618]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" width={480} height={600} loading="lazy" decoding="async" fetchPriority="low" className="absolute inset-0 size-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.35)_0%,transparent_28%,transparent_52%,rgb(0_0_0/0.82)_100%)]" />
      <div className="relative flex h-full flex-col justify-between p-[8%] text-white">
        <div className="flex items-start justify-between">
          <div className="relative">
            <StockAvatar ticker={stock.ticker} size={38} />
            {captain && (
              <span className="absolute -right-2.5 -top-2.5 grid size-6 place-items-center rounded-full bg-[#f5c451] font-display text-[11px] font-black text-black ring-2 ring-black/40">C</span>
            )}
          </div>
          <span className={cn("num rounded-full px-2 py-1 text-[11px] font-bold leading-none", up ? "bg-bull text-black" : "bg-bear text-white")}>{pct(stock.change24h, 1)}</span>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-black uppercase leading-tight">{stock.name}</p>
            <p className="font-mono text-[11px] text-white/75">{stock.ticker}</p>
          </div>
          <p className="num shrink-0 font-display text-[17px] font-black leading-none">
            {signed(pts)}
            <span className="ml-0.5 text-[10px] font-bold text-white/70">PTS</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCard() {
  return (
    <div className="flex size-full flex-col justify-between bg-[#161618] p-[9%] text-white">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Gameweek 13</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-wider text-brand-foreground">
          <span className="size-1.5 rounded-full bg-brand-foreground" /> Live
        </span>
      </div>
      <div>
        <span className="num block font-display text-[84px] font-black leading-[0.85]">73</span>
        <span className="font-display text-[14px] font-black uppercase text-white/60">points</span>
      </div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-white/60">Office Legends</span>
        <span className="num font-display font-black text-[#f5c451]">1st</span>
      </div>
    </div>
  );
}
