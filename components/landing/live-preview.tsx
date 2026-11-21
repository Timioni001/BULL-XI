"use client";

import { useMemo } from "react";
import { getFeaturedEntry } from "@/lib/data";
import { POSITIONS } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { ordinal } from "@/lib/format";
import { useLiveGameweek } from "@/lib/hooks/use-live-gameweek";
import { useNow } from "@/lib/hooks/use-now";
import { useFlash } from "@/lib/hooks/use-flash";
import { Pitch, PitchRow } from "@/components/pitch/pitch";
import { LiveSlot } from "@/components/live/live-slot";
import { PointsTicker } from "@/components/live/points-ticker";
import { RankDelta } from "@/components/live/rank-delta";
import { Shimmer } from "@/components/states/states";

/** Hero preview: a real lineup scoring live against the simulated market. */
export function LivePreview() {
  const now = useNow();
  const hour = now ? Math.floor(now / 3_600_000) : 0;
  const entry = useMemo(() => (hour ? getFeaturedEntry(hour * 3_600_000) : null), [hour]);
  const { snapshot } = useLiveGameweek(entry);
  const flash = useFlash(snapshot?.totalPoints ?? 0);

  return (
    <div className="noise relative mx-auto w-full max-w-[380px] rounded-[36px] bg-surface-1 p-3 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),0_0_80px_-30px_var(--brand-glow)] ring-1 ring-inset ring-hairline">
      <div className="flex items-center justify-between px-3 pb-3 pt-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{copy.landing.previewLabel}</p>
          <p className="font-display text-sm font-bold uppercase">{entry?.teamName ?? " "}</p>
        </div>
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-brand px-2.5 text-[10px] font-bold tracking-[0.14em] text-white">
          <span className="size-1.5 animate-live-dot rounded-full bg-white" /> {copy.live.pill}
        </span>
      </div>
      <div className="mb-3 flex items-end justify-between rounded-3xl bg-[linear-gradient(160deg,#16142a,#111112_60%)] px-4 py-3 ring-1 ring-inset ring-brand/30">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{copy.live.gwPoints}</p>
          {snapshot ? <PointsTicker value={snapshot.totalPoints} className="font-display text-[44px] font-bold leading-none tracking-tighter" /> : <Shimmer className="mt-1 h-10 w-20" />}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{copy.live.leagueRank}</p>
          <p className="flex items-center justify-end gap-1.5 font-display text-2xl font-bold">
            {snapshot && <RankDelta delta={snapshot.yourLastRank - snapshot.yourRank} />}
            {snapshot ? ordinal(snapshot.yourRank) : " "}
          </p>
        </div>
      </div>
      <Pitch glow={flash ? (flash.dir > 0 ? "up" : "down") : null}>
        <div className="flex flex-col gap-2.5 py-3">
          {POSITIONS.map((pos) => (
            <PitchRow key={pos}>
              {entry?.lineup.starters
                .filter((id) => entry.stocks[id].position === pos)
                .map((id) => (
                  <LiveSlot
                    key={id}
                    stock={entry.stocks[id]}
                    position={pos}
                    score={snapshot?.scores[id]}
                    role={id === entry.lineup.captainId ? "C" : id === entry.lineup.viceId ? "V" : null}
                  />
                ))}
            </PitchRow>
          ))}
          {!entry && <div className="h-[300px]" />}
        </div>
      </Pitch>
    </div>
  );
}
