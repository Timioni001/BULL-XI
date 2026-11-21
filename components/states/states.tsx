"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

export function EmptyState({ title, body, action, icon, className }: { title: string; body?: string; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-8 py-12 text-center", className)}>
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-surface-1 ring-1 ring-inset ring-hairline">{icon ?? <Logo size={30} className="opacity-60" />}</div>
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      {body && <p className="mt-1.5 max-w-[30ch] text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-6 w-full max-w-[280px]">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = copy.errors.generic, message, onRetry, className }: { title?: string; message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-8 py-12 text-center", className)}>
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-surface-1 ring-1 ring-inset ring-hairline">
        <span className="font-mono text-xl font-bold text-muted-foreground">!</span>
      </div>
      <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      {message && <p className="mt-1.5 max-w-[32ch] text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button size="cta-sm" variant="secondary" className="mt-6" onClick={onRetry}>
          <RotateCw /> {copy.common.retry}
        </Button>
      )}
    </div>
  );
}

/** Shimmering placeholder block. */
export function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("animate-shimmer rounded-lg bg-surface-2", className)}
      style={{ backgroundImage: "linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 0.05) 50%, transparent 100%)", backgroundSize: "200% 100%", ...style }}
    />
  );
}

export function PitchSkeleton({ rows = [2, 5, 5, 3] }: { rows?: number[] }) {
  return (
    <div className="pitch-diagonal rounded-[28px] p-3 ring-1 ring-inset ring-hairline">
      <div className="flex flex-col gap-5 py-2">
        {rows.map((n, r) => (
          <div key={r} className="flex justify-center gap-3">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Shimmer className="size-11 rounded-[12px]" />
                <Shimmer className="h-3.5 w-14 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
