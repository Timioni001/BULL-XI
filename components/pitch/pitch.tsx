import { cn } from "@/lib/utils";

/**
 * Monochrome pitch. Charcoal stripes and faint white lines so the only
 * colour on screen is money moving (green / red) and the armband (gold).
 */
export function Pitch({ children, className, glow }: { children: React.ReactNode; className?: string; glow?: "up" | "down" | null }) {
  return (
    <div
      className={cn("pitch-diagonal noise relative isolate overflow-hidden rounded-[28px] ring-1 ring-inset ring-hairline", className)}
    >
      <PitchLines />
      {glow !== undefined && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-700"
          style={{
            background:
              glow === "up"
                ? "radial-gradient(120% 60% at 50% 0%, rgb(22 199 132 / 0.16), transparent 70%)"
                : glow === "down"
                  ? "radial-gradient(120% 60% at 50% 0%, rgb(234 57 67 / 0.14), transparent 70%)"
                  : "radial-gradient(120% 60% at 50% 0%, rgb(108 92 255 / 0.10), transparent 70%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function PitchLines() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 size-full" viewBox="0 0 100 140" preserveAspectRatio="none" fill="none" stroke="var(--pitch-line)" strokeWidth="0.35" vectorEffect="non-scaling-stroke">
      <rect x="4" y="3" width="92" height="134" rx="1.5" vectorEffect="non-scaling-stroke" />
      <line x1="4" y1="70" x2="96" y2="70" vectorEffect="non-scaling-stroke" />
      <ellipse cx="50" cy="70" rx="13" ry="9.5" vectorEffect="non-scaling-stroke" />
      <rect x="24" y="3" width="52" height="19" vectorEffect="non-scaling-stroke" />
      <rect x="37" y="3" width="26" height="7" vectorEffect="non-scaling-stroke" />
      <rect x="24" y="118" width="52" height="19" vectorEffect="non-scaling-stroke" />
      <rect x="37" y="130" width="26" height="7" vectorEffect="non-scaling-stroke" />
      <path d="M40 22 Q50 28 60 22" vectorEffect="non-scaling-stroke" />
      <path d="M40 118 Q50 112 60 118" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function PitchRow({ label, children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {label && <span className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">{label}</span>}
      <div className="flex w-full items-start justify-center gap-0.5 px-1">{children}</div>
    </div>
  );
}
