"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Share2, Users } from "lucide-react";
import { getLeague, getLeagueFixtures, type Fixture } from "@/lib/data";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAsync } from "@/lib/hooks/use-async";
import { useInvite } from "@/lib/hooks/use-invite";
import { useGame } from "@/lib/store/game";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SectionTitle, TopBar } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { EmptyState, ErrorState, Shimmer } from "@/components/states/states";

const t = copy.leagues;

export function LeagueDetail({ id }: { id: string }) {
  const lineup = useGame((s) => s.lineup);
  const teamName = useGame((s) => s.teamName);
  const league = useAsync(() => getLeague(id, lineup ?? undefined));
  const fixtures = useAsync(() => getLeagueFixtures(id));
  const invite = useInvite();
  const [tab, setTab] = useState<"table" | "fixtures">("table");

  if (league.status === "loading") {
    return (
      <>
        <TopBar back={routes.leagues} title={copy.nav.leagues} />
        <main className="flex flex-col gap-3 px-4 lg:px-0" aria-busy>
          <Shimmer className="h-28 rounded-3xl" />
          <Shimmer className="h-11 rounded-xl" />
          <Shimmer className="h-80 rounded-3xl" />
        </main>
        <TabBar />
      </>
    );
  }
  if (league.status === "error") {
    return (
      <>
        <TopBar back={routes.leagues} title={copy.nav.leagues} />
        <ErrorState className="flex-1 justify-center pb-28" title={copy.errors.league.title} message={copy.errors.league.body} onRetry={league.retry} />
        <TabBar />
      </>
    );
  }

  const l = league.data;
  const onlyYou = l.managers.length === 1;
  const name = (m: { isYou?: boolean; team: string }) => (m.isYou ? teamName : m.team);

  return (
    <>
      <TopBar
        back={routes.leagues}
        title={l.name}
        subtitle={
          <>
            {t.managers(l.managers.length)} · {t.code} <span className="font-mono text-foreground">{l.code}</span>
          </>
        }
        right={
          <Button size="cta-sm" variant="secondary" className="h-11" onClick={() => void invite(l.name, l.code)}>
            <Share2 /> <span className="hidden min-[400px]:inline">{t.invite}</span>
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[calc(104px+env(safe-area-inset-bottom))] lg:max-w-[760px] lg:px-0 lg:pb-10">
        {onlyYou ? (
          <EmptyState
            icon={<Users className="size-7 text-brand" />}
            title={t.onlyYouTitle}
            body={t.onlyYouBody}
            action={
              <div className="flex flex-col gap-2">
                <div className="rounded-2xl bg-surface-1 py-3 text-center font-mono text-2xl font-bold tracking-[0.2em] ring-1 ring-inset ring-hairline">{l.code}</div>
                <Button size="cta" className="w-full" onClick={() => void invite(l.name, l.code)}>
                  <Share2 /> {t.invite}
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <Segmented id="league-tab" value={tab} onChange={setTab} options={[{ value: "table", label: t.tabs.table }, { value: "fixtures", label: t.tabs.fixtures }]} />
            {tab === "table" ? (
              <div className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
                <div className="grid grid-cols-[36px_1fr_64px] gap-2 border-b border-hairline px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
                  <span>{copy.live.table.rank}</span>
                  <span>{copy.live.table.manager}</span>
                  <span className="text-right">{copy.live.table.total}</span>
                </div>
                {l.managers.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: dur.base, ease, delay: Math.min(i, 12) * 0.02 }}
                    className={cn("grid grid-cols-[36px_1fr_64px] items-center gap-2 px-4 py-3", m.isYou && "bg-brand-soft shadow-[inset_3px_0_0_var(--brand)]")}
                  >
                    <span className={cn("num font-display text-lg font-bold", m.lastRank === 1 && "text-gold")}>{m.lastRank}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{name(m)}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.isYou ? copy.live.table.you : m.name}</span>
                    </span>
                    <span className="num text-right font-display text-lg font-bold">{m.seasonPoints}</span>
                  </motion.div>
                ))}
              </div>
            ) : fixtures.status === "loading" ? (
              <Shimmer className="h-80 rounded-3xl" />
            ) : fixtures.status === "error" ? (
              <ErrorState title={copy.errors.league.title} message={copy.errors.league.body} onRetry={fixtures.retry} />
            ) : (
              <>
                <p className="px-1 text-xs text-muted-foreground">{t.fixturesNote}</p>
                <SectionTitle title={copy.live.gameweek(fixtures.data.current.gameweek)} />
                <div className="flex flex-col gap-2">
                  {fixtures.data.current.fixtures.map((f, i) => (
                    <FixtureCard key={i} f={f} you={teamName} />
                  ))}
                </div>
                <SectionTitle title={copy.live.gameweek(fixtures.data.previous.gameweek)} />
                <div className="flex flex-col gap-2">
                  {fixtures.data.previous.fixtures.map((f, i) => (
                    <FixtureCard key={i} f={f} you={teamName} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <TabBar />
    </>
  );
}

function FixtureCard({ f, you }: { f: Fixture; you: string }) {
  const played = f.home.points !== undefined && f.away.points !== undefined;
  const homeWin = played && f.home.points! > f.away.points!;
  const awayWin = played && f.away.points! > f.home.points!;
  const mine = f.home.isYou || f.away.isYou;
  const side = (s: Fixture["home"], win: boolean, align: "left" | "right") => (
    <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
      <p className={cn("truncate text-[14px] font-semibold", win && "text-gold")}>{s.isYou ? you : s.team}</p>
      <p className="truncate text-xs text-muted-foreground">{s.isYou ? copy.live.table.you : s.name}</p>
    </div>
  );
  return (
    <div className={cn("flex items-center gap-3 rounded-3xl bg-surface-1 px-4 py-3.5 ring-1 ring-inset ring-hairline", mine && "glow-brand")}>
      {side(f.home, homeWin, "left")}
      <div className="flex shrink-0 items-center gap-2 font-display">
        {played ? (
          <>
            <span className={cn("num text-2xl font-bold", homeWin && "text-gold")}>{f.home.points}</span>
            <span className="text-muted-foreground">:</span>
            <span className={cn("num text-2xl font-bold", awayWin && "text-gold")}>{f.away.points}</span>
          </>
        ) : (
          <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold uppercase text-muted-foreground">{copy.leagues.vs}</span>
        )}
      </div>
      {side(f.away, awayWin, "right")}
    </div>
  );
}
