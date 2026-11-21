import { cn } from "@/lib/utils";

/** Monogram tile for a stock. No third-party logos: ticker letters only. */
export function StockAvatar({ ticker, size = 40, inverted, className }: { ticker: string; size?: number; inverted?: boolean; className?: string }) {
  const letters = ticker.replace(/x$/, "").slice(0, 4);
  const fs = letters.length >= 4 ? size * 0.27 : letters.length === 3 ? size * 0.31 : size * 0.36;
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden font-mono font-bold tracking-tight",
        inverted
          ? "bg-foreground text-background shadow-[inset_0_-2px_0_rgb(0_0_0/0.12),0_6px_14px_-6px_rgb(0_0_0/0.8)]"
          : "bg-surface-3 text-foreground ring-1 ring-inset ring-hairline",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28, fontSize: fs }}
    >
      {letters}
    </span>
  );
}
