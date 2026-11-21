import { logoFor } from "@/lib/data/media";
import { cn } from "@/lib/utils";

/** A clean logo on a soft tile. No rings, no notches: just the brand. */
export function LogoTile({ ticker, size = 64, className, style }: { ticker: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const logo = logoFor(ticker);
  const dark = logo?.tone === "dark";
  return (
    <span
      className={cn("grid shrink-0 place-items-center overflow-hidden", dark ? "bg-[#161618]" : "bg-white", className)}
      style={{ width: size, height: size, borderRadius: size * 0.26, boxShadow: "0 18px 36px -18px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(0 0 0 / 0.05)", ...style }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo.src} alt={ticker.replace(/x$/, "")} width={size} height={size} loading="lazy" decoding="async" className={cn("object-contain", logo.fill ? "size-full" : "size-[64%]")} />
      ) : (
        <span className="font-mono text-sm font-bold">{ticker.replace(/x$/, "")}</span>
      )}
    </span>
  );
}
