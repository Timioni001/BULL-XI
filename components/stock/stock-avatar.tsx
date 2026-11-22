import type { Sector } from "@/lib/data/types";
import { logoFor } from "@/lib/data/media";
import { cn } from "@/lib/utils";

/**
 * Stock tile: the company logo on a clean tile with a neutral hairline edge.
 * No coloured rings: colour is reserved for price moves. Falls back to ticker letters.
 */
export function StockAvatar({
  ticker,
  size = 40,
  inverted,
  className,
}: {
  ticker: string;
  sector?: Sector;
  size?: number;
  /** Kept for API compatibility: logo tiles are always light or dark by logo */
  inverted?: boolean;
  className?: string;
}) {
  const logo = logoFor(ticker);
  const letters = ticker.replace(/x$/, "").slice(0, 4);
  const fs = letters.length >= 4 ? size * 0.26 : letters.length === 3 ? size * 0.3 : size * 0.36;
  const radius = size * 0.28;
  const dark = logo ? logo.tone === "dark" : !inverted;
  const edge = dark ? "rgb(255 255 255 / 0.1)" : "rgb(0 0 0 / 0.08)";
  return (
    <span
      aria-hidden
      className={cn("relative grid shrink-0 place-items-center overflow-hidden font-mono font-bold tracking-tight", dark ? "bg-[#161618] text-white" : "bg-white text-[#0a0a0a]", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: fs,
        boxShadow: `0 8px 16px -8px rgb(0 0 0 / 0.35)`,
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo.src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn("relative z-0 select-none object-contain", logo.fill ? "size-full" : "size-[66%]")}
          style={logo.fill ? { borderRadius: radius } : undefined}
        />
      ) : (
        <span className="relative z-10">{letters}</span>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ borderRadius: radius, boxShadow: `inset 0 0 0 1px ${edge}` }} />
    </span>
  );
}
