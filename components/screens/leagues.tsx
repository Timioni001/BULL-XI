"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, Coins, Globe2, Plus, Share2, Ticket, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { getLeagues, getMyFriendsLeagues, type FriendsLeague, type LeagueSummary } from "@/lib/data";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { ordinal } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { useInvite } from "@/lib/hooks/use-invite";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { CreateFriendsSheet, JoinFriendsSheet } from "@/components/game/friends-sheets";
import { useAuth } from "@/lib/auth/context";
import { useOnchainPlayer } from "@/lib/auth/player";
import { PageHeader, SectionTitle } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { EmptyState, ErrorState, Shimmer } from "@/components/states/states";

const t = copy.leagues;

export function Leagues() {
  const router = useRouter();
  const leagues = useAsync(getLeagues);
  const invite = useInvite();
  const [sheet, setSheet] = useState<"create" | "join" | null>(null);

  const actions = (
    <div className="grid grid-cols-2 gap-2">
      <Button size="cta-sm" onClick={() => setSheet("create")}>
        <Plus /> {t.create}
      </Button>
      <Button size="cta-sm" variant="secondary" onClick={() => setSheet("join")}>
        <Ticket /> {t.join}
      </Button>
    </div>
  );

  let body: React.ReactNode;
  if (leagues.status === "loading") {
    body = (
      <div className="flex flex-col gap-3" aria-busy>
        <Shimmer className="h-[168px] rounded-[28px]" />
        <Shimmer className="h-20 rounded-3xl" />
        <Shimmer className="h-20 rounded-3xl" />
      </div>
    );
  } else if (leagues.status === "error") {
    body = <ErrorState title={copy.errors.league.title} message={copy.errors.league.body} onRetry={leagues.retry} />;
  } else if (leagues.data.length === 0) {
    body = <EmptyState icon={<Trophy className="size-7 text-brand" />} title={t.emptyTitle} body={t.emptyBody} action={actions} />;
  } else {
    const [best, ...rest] = [...leagues.data].sort((a, b) => a.yourRank / a.size - b.yourRank / b.size);
    body = (
      <div className="flex flex-col gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease }}>
          <Link href={routes.league(best.id)} className="relative block overflow-hidden rounded-[28px] bg-brand p-5 text-brand-foreground shadow-[0_24px_48px_-24px_var(--brand-glow)]">
            <div aria-hidden className="absolute -right-10 -top-10 size-44 rotate-45 bg-black/10" />
            <p className="relative text-xs font-semibold uppercase tracking-wider text-brand-foreground">{best.kind === "global" ? t.global : t.private}</p>
            <p className="relative mt-1 font-display text-[28px] font-bold uppercase leading-tight">{best.name}</p>
            <div className="relative mt-5 flex items-end justify-between">
              <div>
                <p className="text-xs text-brand-foreground">{t.yourRank}</p>
                <p className="num font-display text-[56px] font-bold leading-none">{ordinal(best.yourRank)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{t.managers(best.size)}</p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    void invite(best.name, best.code);
                  }}
                  className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-full bg-brand-foreground px-4 text-[13px] font-semibold text-white"
                >
                  <Share2 className="size-4" /> {t.invite}
                </button>
              </div>
            </div>
          </Link>
        </motion.div>
        {rest.map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease, delay: 0.05 * (i + 1) }}>
            <LeagueRow league={l} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[calc(104px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex flex-col gap-3">
          <div className="lg:hidden">{actions}</div>
          <FriendsSection />
          {body}
        </div>
        <aside className="hidden flex-col gap-3 lg:flex">
          <SectionTitle title={t.createTitle} />
          <p className="px-1 text-sm text-muted-foreground">{t.createBody}</p>
          {actions}
        </aside>
      </main>
      <TabBar />

      <CreateFriendsSheet
        open={sheet === "create"}
        onOpenChange={(o) => !o && setSheet(null)}
        onDone={(code) => {
          setSheet(null);
          toast(copy.friends.created(code));
          router.push(routes.friends(code));
        }}
      />
      <JoinFriendsSheet
        open={sheet === "join"}
        onOpenChange={(o) => !o && setSheet(null)}
        onDone={(code, name) => {
          setSheet(null);
          toast(copy.friends.joined(name));
          router.push(routes.friends(code));
        }}
      />
    </>
  );
}

function LeagueRow({ league }: { league: LeagueSummary }) {
  return (
    <Link href={routes.league(league.id)} className="flex items-center gap-4 rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline transition-colors hover:bg-surface-2">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 ring-1 ring-inset ring-hairline">
        {league.kind === "global" ? <Globe2 className="size-5 text-muted-foreground" /> : <Trophy className="size-5 text-muted-foreground" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block font-display text-[14px] font-black uppercase leading-tight">{league.name}</span>
        <span className="block text-xs text-muted-foreground">
          {t.managers(league.size)} · {t.code} <span className="font-mono">{league.code}</span>
        </span>
      </span>
      <span className="text-right">
        <span className={cn("num block font-display text-2xl font-bold", league.yourRank === 1 && "text-gold")}>{ordinal(league.yourRank)}</span>
        <span className="block text-[11px] text-muted-foreground">{t.yourRank}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

/** Onchain friends leagues the player is in, with their pots. */
function FriendsSection() {
  const auth = useAuth();
  const player = useOnchainPlayer();
  const [mine, setMine] = useState<FriendsLeague[] | null>(null);
  useEffect(() => {
    if (!player.ready) return;
    let alive = true;
    void (async () => {
      const who = auth.account?.address ?? (await player.get()).address;
      const list = await getMyFriendsLeagues(who).catch(() => []);
      if (alive) setMine(list);
    })();
    return () => {
      alive = false;
    };
  }, [auth.account?.address, player]);
  const f = copy.friends;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-end justify-between px-1">
        <SectionTitle title={f.section} />
      </div>
      <p className="-mt-1 px-1 text-[13px] text-muted-foreground">{f.sectionBody}</p>
      {mine === null && <Shimmer className="h-20 rounded-3xl" />}
      {mine?.length === 0 && <p className="rounded-3xl bg-surface-1 p-4 text-sm text-muted-foreground ring-1 ring-inset ring-hairline">{f.none}</p>}
      {mine?.map((l) => <FriendsRow key={l.id} league={l} />)}
    </section>
  );
}

function FriendsRow({ league }: { league: FriendsLeague }) {
  const f = copy.friends;
  const state = league.settled ? f.status.settled : league.gameweekStatus >= 4 ? f.status.final : league.gameweekStatus >= 1 ? f.status.live : f.status.open;
  return (
    <Link href={routes.friends(league.code)} className="flex items-center gap-4 rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline transition-colors hover:bg-surface-2">
      <span className="grid size-12 place-items-center rounded-2xl bg-gold/15 ring-1 ring-inset ring-gold/30">
        {league.fee > 0 ? <Coins className="size-5 text-gold" /> : <Users className="size-5 text-muted-foreground" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 block font-display text-[14px] font-black uppercase leading-tight">{league.name}</span>
        <span className="block text-xs text-muted-foreground">
          {f.members(league.members.length, 8)} · {state} · <span className="font-mono">{league.code}</span>
        </span>
      </span>
      <span className="text-right">
        <span className="num block font-display text-xl font-bold text-gold">${(league.settled ? league.paidOut : league.pot).toFixed(0)}</span>
        <span className="block text-[11px] text-muted-foreground">{league.settled ? f.paid : f.pot}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
