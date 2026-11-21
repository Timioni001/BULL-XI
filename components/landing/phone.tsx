import { cn } from "@/lib/utils";

/** Minimal phone mockup. Children render in the dark app palette. */
export function Phone({ children, className, time = "9:41" }: { children: React.ReactNode; className?: string; time?: string }) {
  return (
    <div className={cn("relative w-[300px] shrink-0 rounded-[48px] bg-[#0b0b0c] p-[9px] shadow-[0_50px_100px_-40px_rgb(0_0_0/0.55),0_0_0_1px_rgb(0_0_0/0.08),inset_0_0_0_1.5px_rgb(255_255_255/0.12)]", className)}>
      <div className="theme-dark relative h-[610px] overflow-hidden rounded-[40px]">
        <div className="relative z-20 flex h-11 items-center justify-between px-7 text-[13px] font-semibold">
          <span className="num">{time}</span>
          <span aria-hidden className="absolute left-1/2 top-2.5 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
          <span aria-hidden className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-[3px] border border-white/70" />
          </span>
        </div>
        <div className="relative h-[calc(100%-44px)] overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
