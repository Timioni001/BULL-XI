import { cn } from "@/lib/utils";

/** Sticky action area in the thumb zone. Fades the content behind it. */
export function BottomBar({ children, className, aboveTabs }: { children: React.ReactNode; className?: string; aboveTabs?: boolean }) {
  return (
    <div className={cn("sticky z-30 mt-auto", aboveTabs ? "bottom-[calc(64px+env(safe-area-inset-bottom))]" : "bottom-0", className)}>
      <div className="pointer-events-none h-6 bg-gradient-to-t from-background to-transparent" />
      <div className={cn("bg-background px-4 pt-1", aboveTabs ? "pb-3" : "pb-safe")}>{children}</div>
    </div>
  );
}
