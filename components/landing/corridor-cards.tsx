import type { Stock } from "@/lib/data/types";
import { pct, signed } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { StockArt } from "@/components/stock/stock-art";
import { StockAvatar } from "@/components/stock/stock-avatar";

/** Artwork for the landing corridor. Each card fills its frame. */
export function corridorCards(stocks: Stock[]): React.ReactNode[] {
  const s = (i: number) => stocks[i % stocks.length];
  return [
    <TickerCard key="t0" stock={s(0)} />,
    <ScoreCard key="score" />,
    <TickerCard key="t1" stock={s(1)} />,
    <CaptainCard key="cap" stock={s(0)} />,
    <TickerCard key="t2" stock={s(2)} />,
    <PitchCard key="pitch" stocks={stocks} />,
    <TickerCard key="t3" stock={s(3)} />,
    <TableCard key="table" />,
    <TickerCard key="t4" stock={s(4)} />,
    <ChartCard key="chart" stock={s(9)} />,
    <TickerCard key="t5" stock={s(6)} />,
    <SealCard key="seal" />,
    <TickerCard key="t6" stock={s(7)} />,
    <TickerCard key="t7" stock={s(8)} />,
  ];
}

function TickerCard({ stock }: { stock: Stock }) {
  const up = stock.change24h >= 0;
  const pts = stock.recentPoints[stock.recentPoints.length - 1];
  return (
    <StockArt ticker={stock.ticker} sector={stock.sector} className="size-full">
      <div className="flex h-full flex-col justify-between p-[9%] text-white">
        <span className="font-mono text-[13px] font-semibold opacity-90">{stock.ticker}</span>
        <div className="grid place-items-center">
          <StockAvatar ticker={stock.ticker} sector={stock.sector} size={64} inverted />
        </div>
        <div className="flex items-center justify-between">
          <span className={cn("num rounded-full px-2 py-0.5 text-[12px] font-bold", up ? "bg-bull text-black" : "bg-bear text-white")}>{pct(stock.change24h, 1)}</span>
          <span className="num font-display text-[15px] font-black">{signed(pts)} pts</span>
        </div>
      </div>
    </StockArt>
  );
}

function ScoreCard() {
  return (
    <div className="flex size-full flex-col justify-between bg-[#161618] p-[10%] text-white">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Gameweek 13</span>
      <div>
        <span className="num block font-display text-[76px] font-black leading-[0.85]">73</span>
        <span className="font-display text-[15px] font-black uppercase text-white/60">pts</span>
      </div>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-foreground">
        <span className="size-1.5 rounded-full bg-brand-foreground" /> Live
      </span>
    </div>
  );
}

function CaptainCard({ stock }: { stock: Stock }) {
  return (
    <div className="relative grid size-full place-items-center overflow-hidden bg-[radial-gradient(120%_90%_at_30%_10%,#ffe08a,#f59e0b_45%,#3a2205)]">
      <div className="relative">
        <StockAvatar ticker={stock.ticker} sector={stock.sector} size={84} inverted />
        <span className="absolute -right-4 -top-4 grid size-11 place-items-center rounded-full bg-black font-display text-xl font-black text-[#f5c451] ring-2 ring-[#f5c451]">C</span>
      </div>
      <span className="absolute bottom-[9%] font-display text-[22px] font-black text-black/80">x2</span>
    </div>
  );
}

function PitchCard({ stocks }: { stocks: Stock[] }) {
  const rows = [[stocks[5]], [stocks[2], stocks[6], stocks[9]], [stocks[0], stocks[4]], [stocks[1]]];
  return (
    <div className="pitch-diagonal flex size-full flex-col justify-around py-[8%]">
      {rows.map((r, i) => (
        <div key={i} className="flex justify-center gap-2">
          {r.filter(Boolean).map((st) => (
            <StockAvatar key={st.id} ticker={st.ticker} sector={st.sector} size={34} inverted />
          ))}
        </div>
      ))}
    </div>
  );
}

function TableCard() {
  const rows = [
    { r: 1, t: "Your XI", p: 361, me: true },
    { r: 2, t: "Inter Margin", p: 352 },
    { r: 3, t: "Dividend FC", p: 349 },
    { r: 4, t: "Theta Gang FC", p: 341 },
  ];
  return (
    <div className="flex size-full flex-col gap-1.5 bg-white p-[8%] text-black">
      <span className="mb-1 font-display text-[13px] font-black uppercase">Office Legends</span>
      {rows.map((x) => (
        <div key={x.r} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]", x.me ? "bg-brand text-brand-foreground" : "bg-black/5")}>
          <span className="num w-3 font-bold">{x.r}</span>
          <span className="flex-1 truncate font-semibold">{x.t}</span>
          <span className="num font-bold">{x.p}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ stock }: { stock: Stock }) {
  const pts = [8, 14, 11, 19, 16, 24, 21, 30, 27, 36, 33, 42];
  const W = 100;
  const H = 60;
  const max = Math.max(...pts);
  const path = pts.map((p, i) => `${(i / (pts.length - 1)) * W},${H - (p / max) * H}`).join(" L ");
  return (
    <div className="flex size-full flex-col justify-between bg-[#0f1210] p-[9%] text-white">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] font-semibold">{stock.ticker}</span>
        <span className="num text-[12px] font-bold text-bull">+3.4%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[55%] w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#16C784" stopOpacity="0.4" />
            <stop offset="1" stopColor="#16C784" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0,${H} L ${path} L ${W},${H} Z`} fill="url(#cc)" />
        <path d={`M ${path}`} fill="none" stroke="#16C784" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="num font-display text-[22px] font-black">+34 pts</span>
    </div>
  );
}

function SealCard() {
  return (
    <div className="relative size-full overflow-hidden bg-brand">
      <div className="absolute inset-x-0 top-0 h-[58%] bg-[#ff7a45]" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      <div className="absolute left-1/2 top-[58%] grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#161618] ring-2 ring-white/80">
        <Logo size={34} />
      </div>
      <span className="absolute bottom-[9%] left-0 right-0 text-center font-display text-[13px] font-black uppercase tracking-wider text-brand-foreground">Squad locked</span>
    </div>
  );
}
