import { cn } from "@/lib/utils";

/** Bench below the pitch, like FPL's substitutes bar. */
export function BenchStrip({ children, label = "Bench", note, className }: { children: React.ReactNode; label?: string; note?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-surface-1 px-2 pb-2 pt-2.5 ring-1 ring-inset ring-hairline", className)}>
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="text-label font-semibold uppercase text-muted-foreground">{label}</span>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>
      <div className="flex justify-around">{children}</div>
    </div>
  );
}
