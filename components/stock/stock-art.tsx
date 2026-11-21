import type { Sector } from "@/lib/data/types";
import { sectorArt } from "@/lib/sectors";
import { cn } from "@/lib/utils";

/**
 * Poster-style artwork for a stock: a sector-coloured mesh gradient with
 * giant ticker letters. Stands in for the player photo on fantasy cards.
 */
export function StockArt({ ticker, sector, className, children }: { ticker: string; sector: Sector; className?: string; children?: React.ReactNode }) {
  const [hi, mid, base] = sectorArt(sector);
  const letters = ticker.replace(/x$/, "").slice(0, 4);
  return (
    <div
      className={cn("relative isolate overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 90% at 18% 12%, ${hi} 0%, transparent 55%), radial-gradient(110% 100% at 92% 100%, ${mid} 0%, transparent 60%), linear-gradient(160deg, ${mid}, ${base})`,
      }}
    >
      <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "var(--noise)" }} />
      <div aria-hidden className="absolute -bottom-6 -right-4 select-none font-display text-[120px] font-black leading-none text-white/15">
        {letters}
      </div>
      <div className="relative h-full">{children}</div>
    </div>
  );
}
