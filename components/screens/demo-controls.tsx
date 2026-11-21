"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGame } from "@/lib/store/game";

/** Prototype helpers for reviewing the flow on a phone. */
export function DemoControls() {
  const router = useRouter();
  const resetAll = useGame((s) => s.resetAll);
  return (
    <div className="mx-auto mt-2 flex w-full max-w-[280px] flex-col gap-2 pb-28">
      <p className="text-center text-label font-semibold uppercase text-muted-foreground">Prototype</p>
      <button className="h-11 rounded-xl bg-surface-1 text-sm font-medium ring-1 ring-inset ring-hairline" onClick={() => router.push("/?intro")}>
        Replay intro
      </button>
      <button
        className="h-11 rounded-xl bg-surface-1 text-sm font-medium ring-1 ring-inset ring-hairline"
        onClick={() => {
          resetAll();
          toast("Demo reset");
          router.push("/?intro");
        }}
      >
        Reset demo
      </button>
    </div>
  );
}
