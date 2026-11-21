import type { Sector } from "@/lib/data/types";
import { sectorColor } from "@/lib/sectors";
import { cn } from "@/lib/utils";

/**
 * Designed monogram tile. Ticker letters, a thin sector ring and a small
 * triangle notch borrowed from the logo. No third-party logos.
 */
export function StockAvatar({
  ticker,
  sector,
  size = 40,
  inverted,
  className,
}: {
  ticker: string;
  sector?: Sector;
  size?: number;
  inverted?: boolean;
  className?: string;
}) {
  const letters = ticker.replace(/x$/, "").slice(0, 4);
  const fs = letters.length >= 4 ? size * 0.26 : letters.length === 3 ? size * 0.3 : size * 0.36;
  const ring = sector ? sectorColor(sector) : "transparent";
  const radius = size * 0.28;
  const notch = Math.max(5, size * 0.16);
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden font-mono font-bold tracking-tight",
        inverted ? "bg-[#f4f4f5] text-[#0a0a0a]" : "bg-surface-3 text-foreground",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: fs,
        boxShadow: inverted
          ? `inset 0 0 0 ${size >= 36 ? 2 : 1.5}px ${ring}, inset 0 -3px 0 rgb(0 0 0 / 0.08), 0 8px 16px -8px rgb(0 0 0 / 0.9)`
          : `inset 0 0 0 1.5px ${sector ? ring : "var(--hairline)"}`,
      }}
    >
      <span className="relative z-10">{letters}</span>
      {sector && (
        <span
          className="absolute bottom-0 right-0"
          style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: `0 0 ${notch}px ${notch}px`, borderColor: `transparent transparent ${ring} transparent` }}
        />
      )}
    </span>
  );
}
