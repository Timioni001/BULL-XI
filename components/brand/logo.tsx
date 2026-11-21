import Image from "next/image";
import { cn } from "@/lib/utils";

/** BULL-XI mark. Source file: public/logo.png (black). Inverted in dark mode. */
export function Logo({ size = 28, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt="BULL-XI"
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none dark:invert", className)}
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
