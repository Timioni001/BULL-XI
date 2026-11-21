"use client";

import { useEffect, useState } from "react";
import { Drawer as Vaul } from "vaul";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { GameweekResult } from "@/lib/data/types";
import { copy } from "@/lib/copy";
import { ordinal, signed } from "@/lib/format";
import { isBigWin, shareCardUrl } from "@/lib/share";
import { Button } from "@/components/ui/button";
import { PointsTicker } from "@/components/live/points-ticker";
import { Shimmer } from "@/components/states/states";

/** Full-time result with a shareable 1080x1350 card. Big wins get confetti. */
export function ResultSheet({ result, open, onOpenChange, onNext }: { result: GameweekResult | null; open: boolean; onOpenChange: (o: boolean) => void; onNext?: () => void }) {
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange}>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px]" />
        <Vaul.Content className="noise fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] max-w-[480px] flex-col rounded-t-[28px] bg-surface-1 outline-none ring-1 ring-hairline">
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" />
          {result && <Body key={result.finishedAt} result={result} onNext={onNext} />}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

function Body({ result, onNext }: { result: GameweekResult; onNext?: () => void }) {
  const r = copy.result;
  const url = shareCardUrl(result);
  const big = isBigWin(result);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!big || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const id = setTimeout(() => {
      void import("canvas-confetti").then(({ default: confetti }) => {
        if (cancelled) return;
        const colors = ["#F5C451", "#6C5CFF", "#FFFFFF"];
        confetti({ particleCount: 90, spread: 70, startVelocity: 42, origin: { y: 0.7 }, colors, zIndex: 60, disableForReducedMotion: true });
        setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.6 }, colors, zIndex: 60, disableForReducedMotion: true }), 250);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [big]);

  const share = async () => {
    try {
      const blob = await fetch(url).then((res) => res.blob());
      const file = new File([blob], `bull-xi-gw${result.gameweek}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: r.shareText(result.points, result.gameweek) });
        return;
      }
      await navigator.clipboard.writeText(`${r.shareText(result.points, result.gameweek)} ${window.location.origin}`);
      toast(copy.common.linkCopied);
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-safe">
      <Vaul.Title className="pt-4 font-display text-2xl font-bold uppercase tracking-tight">{r.title(result.gameweek)}</Vaul.Title>
      <Vaul.Description className="text-sm text-muted-foreground">{big ? r.bigWin : r.solid}</Vaul.Description>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label={r.points} value={<PointsTicker value={result.points} className={result.points >= 0 ? "text-foreground" : "text-bear"} />} />
        <Stat label={r.rank} value={<span className={result.rank === 1 ? "text-gold" : ""}>{ordinal(result.rank)}</span>} sub={result.leagueName} />
        <Stat label={r.bestPick} value={<span className="font-mono text-xl">{result.bestPick.ticker}</span>} sub={copy.common.signedPts(result.bestPick.points)} />
        <Stat label={r.captain} value={<span className="font-mono text-xl">{result.captain.ticker}</span>} sub={`${signed(result.captain.points)} ${copy.common.pts}`} />
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-[300px] overflow-hidden rounded-2xl ring-1 ring-hairline" style={{ aspectRatio: "1080 / 1350" }}>
        {!loaded && <Shimmer className="absolute inset-0 rounded-none" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={r.title(result.gameweek)} className="size-full object-cover" onLoad={() => setLoaded(true)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
        <Button size="cta" onClick={share}>
          <Share2 /> {r.share}
        </Button>
        <Button asChild size="cta" variant="secondary">
          <a href={url} download={`bull-xi-gw${result.gameweek}.png`}>
            <Download /> {r.save}
          </a>
        </Button>
      </div>
      {onNext && (
        <Button size="cta" variant="ghost" className="mb-2 w-full" onClick={onNext}>
          {r.next}
        </Button>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-3 ring-1 ring-inset ring-hairline">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num mt-0.5 font-display text-2xl font-bold leading-tight">{value}</p>
      {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
