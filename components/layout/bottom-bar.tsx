import { cn } from "@/lib/utils";

/** Sticky action area in the thumb zone. On desktop it sits in the aside instead. */
export function BottomBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("sticky bottom-0 z-30 mt-auto lg:hidden", className)}>
      <div className="pointer-events-none h-6 bg-gradient-to-t from-background to-transparent" />
      <div className="pb-safe bg-background px-4 pt-1">{children}</div>
    </div>
  );
}
