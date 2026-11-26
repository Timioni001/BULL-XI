"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Crown, ExternalLink, Loader2, Share2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { getFriendsLeague, joinFriendsLeague, type FriendsLeague } from "@/lib/data";
import { copy } from "@/lib/copy";
import { explorer } from "@/lib/config";
import { routes } from "@/lib/routes";
import { useAuth } from "@/lib/auth/context";
import { useOnchainPlayer } from "@/lib/auth/player";
import { useInvite } from "@/lib/hooks/use-invite";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/layout/top-bar";
import { BottomBar } from "@/components/layout/bottom-bar";
import { EmptyState, Shimmer } from "@/components/states/states";

const f = copy.friends;
const when = (ms: number) => new Date(ms).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });

export function FriendsLeagueScreen({ code }: { code: string }) {
  const auth = useAuth();
  const player = useOnchainPlayer();
  const invite = useInvite();
  const [league, setLeague] = useState<FriendsLeague | null | undefined>(undefined);
  const [deviceAddr, setDeviceAddr] = useState<string | null>(null);
  const me = auth.account?.address ?? deviceAddr;
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setLeague(await getFriendsLeague(code).catch(() => null)), [code]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(load, 15_000);
    return () => (clearTimeout(first), clearInterval(id));
  }, [load]);
  useEffect(() => {
    if (!auth.account?.address && player.ready) void player.get().then((p) => setDeviceAddr(p.address));
  }, [auth.account?.address, player]);

  if (league === undefined)
    return (
      <>
        <PageHeader eyebrow={f.eyebrow} title={f.title} back={routes.leagues} />
        <main className="flex flex-col gap-3 px-4">
          <Shimmer className="h-48 rounded-[28px]" />
          <Shimmer className="h-64 rounded-3xl" />
        </main>
      </>
    );
  if (league === null)
    return (
      <>
        <PageHeader eyebrow={f.eyebrow} title={f.title} back={routes.leagues} />
        <main className="px-4">
          <EmptyState icon={<Ticket className="size-7 text-brand" />} title={f.notFound} body={copy.friends.joinBody} />
        </main>
      </>
    );

  const isMember = !!me && league.members.some((m) => m.address === me);
  // The crank kicks the gameweek off within a minute of its deadline; joining also checks it onchain.
  const open = league.gameweekStatus === 0;
  const ranked = [...league.members].map((m, i) => ({ ...m, joined: i })).sort((a, b) => (b.points ?? -1e9) - (a.points ?? -1e9) || a.joined - b.joined);
  const state = league.settled ? f.status.settled : league.gameweekStatus >= 4 ? f.status.final : league.gameweekStatus >= 1 ? f.status.live : f.status.open;

  const join = async () => {
    setBusy(true);
    haptic(12);
    try {
      setLeague(await joinFriendsLeague(await player.get(), code));
      toast(f.joined(league.name));
    } catch (e) {
      toast(e instanceof Error ? e.message : copy.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const cta = !isMember ? (
    <Button size="cta" className="w-full" disabled={!open || busy || !player.ready} onClick={() => void join()}>
      {busy ? <Loader2 className="animate-spin" /> : <Ticket />} {open ? (league.fee > 0 ? `${f.joinCta} · $${league.fee}` : f.joinCta) : f.tooLate}
    </Button>
  ) : open ? (
    <Button size="cta" className="w-full" asChild>
      <Link href={routes.lock}>{f.lockCta}</Link>
    </Button>
  ) : (
    <Button size="cta" variant="secondary" className="w-full" onClick={() => void invite(league.name, league.code, routes.friends(league.code))}>
      <Share2 /> {copy.leagues.invite}
    </Button>
  );

  return (
    <>
      <PageHeader eyebrow={f.eyebrow} title={f.title} back={routes.leagues} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-2 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex flex-col gap-3">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease }} className="theme-dark relative overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#2b2412,#141210_60%)] p-5 ring-1 ring-inset ring-gold/40">
            <div aria-hidden className="absolute -right-12 -top-12 size-44 rotate-45 bg-gold/10" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{state} · <span className="font-mono">{league.code}</span></p>
                <p className="mt-1 font-display text-[28px] font-bold uppercase leading-tight">{league.name}</p>
              </div>
              <button onClick={() => void invite(league.name, league.code, routes.friends(league.code))} aria-label={copy.leagues.invite} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
                <Share2 className="size-4" />
              </button>
            </div>
            <div className="relative mt-5 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[11px] text-white/60">{league.settled ? f.paid : f.pot}</p>
                <p className="num font-display text-[34px] font-bold leading-none text-gold">${(league.settled ? league.paidOut : league.pot).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/60">{f.fee}</p>
                <p className="num mt-1 text-lg font-semibold">{league.fee > 0 ? `$${league.fee}` : f.free}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-white/60">{league.gameweekStatus >= 1 ? f.fullTime : f.kickoff}</p>
                <p className="num mt-1 text-sm font-semibold">{when(league.gameweekStatus >= 1 ? league.end : league.deadline)}</p>
              </div>
            </div>
            {league.winner && (
              <p className="relative mt-4 flex items-center gap-2 rounded-2xl bg-black/30 px-4 py-3 text-sm font-semibold ring-1 ring-inset ring-white/10">
                <Crown className="size-4 text-gold" /> {f.winner}: {league.members.find((m) => m.address === league.winner)?.name ?? `${league.winner.slice(0, 4)}…`} · {league.winnerPoints} pts
              </p>
            )}
          </motion.section>
          <p className="px-1 text-xs text-muted-foreground">{isMember ? f.lockNote(when(league.deadline), league.kind === "flash" ? "hourly" : "daily") : f.notMember} {league.fee > 0 && !isMember ? f.feeNote(league.fee) : ""}</p>
        </div>

        <aside className="flex flex-col gap-3">
          <SectionTitle title={f.members(league.members.length, 8)} />
          <ol className="divide-y divide-hairline overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
            {ranked.map((m, i) => (
              <li key={m.address} className={cn("flex items-center gap-3 px-4 py-3", m.address === me && "bg-brand-soft/40")}>
                <span className="num w-5 text-center font-display text-sm font-bold text-muted-foreground">{m.points !== null ? i + 1 : "-"}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {league.winner === m.address && <Crown className="size-3.5 text-gold" />}
                    <span className="truncate">{m.name ?? `${m.address.slice(0, 4)}…${m.address.slice(-4)}`}</span>
                    {m.address === me && <span className="rounded-full bg-surface-3 px-1.5 text-[10px] font-semibold text-muted-foreground">{f.you}</span>}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{f.memberStatus[m.status]}</span>
                </span>
                <span className={cn("num font-display text-lg font-bold", m.points === null ? "text-muted-foreground" : m.points >= 0 ? "text-bull" : "text-bear")}>{m.points ?? "-"}</span>
              </li>
            ))}
          </ol>
          <p className="px-1 text-xs text-muted-foreground">{f.payoutNote}</p>
          <LeagueExplorerLink id={league.id} />
          <p className="px-1 text-xs text-muted-foreground">{copy.pro.preview}</p>
          <div className="hidden lg:block">{cta}</div>
        </aside>
      </main>
      <BottomBar>{cta}</BottomBar>
    </>
  );
}

function LeagueExplorerLink({ id }: { id: number }) {
  const [addr, setAddr] = useState<string | null>(null);
  useEffect(() => {
    void import("@/lib/onchain/bullxi").then(async (m) => setAddr((await m.findLeaguePda({ id }))[0]));
  }, [id]);
  if (!addr) return null;
  return (
    <a href={explorer("address", addr, { tee: true })} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-1 text-xs font-semibold text-muted-foreground underline underline-offset-2">
      {f.onchain} <ExternalLink className="size-3" />
    </a>
  );
}
