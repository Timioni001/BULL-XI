import Image from "next/image";
import { cn } from "@/lib/utils";

/** BULL-XI mark. Source file: public/logo.png (black). Pass `light` on dark surfaces. */
export function Logo({ size = 28, className, priority, decorative, light }: { size?: number; className?: string; priority?: boolean; decorative?: boolean; /** White mark for dark surfaces */ light?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt={decorative ? "" : "BULL-XI"}
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none", light ? "invert" : "logo-mark", className)}
      draggable={false}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-[0.18em] text-[13px]", className)}>
      BULL<span className="text-muted-foreground">-</span>XI
    </span>
  );
}
