"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Ticket, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getLeagueByCode, joinLeague } from "@/lib/data";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAsync } from "@/lib/hooks/use-async";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Logo, Wordmark } from "@/components/brand/logo";
import { EmptyState, ErrorState, Shimmer } from "@/components/states/states";

const t = copy.leagues.joinPage;

/** Landing spot for invite links: /join/CODE */
export function JoinLeague({ code }: { code: string }) {
  const router = useRouter();
  const preview = useAsync(() => getLeagueByCode(code));
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    try {
      haptic(14);
      const l = await joinLeague(code);
      toast(copy.leagues.joined(l.name));
      router.push(routes.league(l.id));
    } catch {
      const e = copy.errors.leagueNotFound(code);
      toast(e.title, { description: e.body });
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5">
      <header className="pt-safe flex h-16 items-center">
        <Link href={routes.landing} className="flex items-center gap-2.5">
          <Logo size={28} />
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center pb-16">
        {preview.status === "loading" && <Shimmer className="h-[300px] rounded-[28px]" />}
        {preview.status === "error" && <ErrorState title={copy.errors.league.title} message={copy.errors.league.body} onRetry={preview.retry} />}
        {preview.status === "success" && !preview.data && (
          <EmptyState
            title={copy.errors.leagueNotFound(code).title}
            body={copy.errors.leagueNotFound(code).body}
            action={
              <Button asChild size="cta" className="w-full">
                <Link href={routes.leagues}>{copy.nav.leagues}</Link>
              </Button>
            }
          />
        )}
        {preview.status === "success" && preview.data && (
          <div className="noise cut-tr overflow-hidden rounded-[28px] bg-surface-1 p-6 ring-1 ring-inset ring-hairline">
            <p className="text-sm font-medium text-muted-foreground">{t.eyebrow}</p>
            <h1 className="mt-1 font-display text-[40px] font-bold uppercase leading-[0.95] tracking-tight">{preview.data.name}</h1>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-surface-2 p-3 ring-1 ring-inset ring-hairline">
                <p className="text-[11px] text-muted-foreground">{copy.leagues.code}</p>
                <p className="mt-0.5 font-mono text-lg font-bold tracking-wider">{preview.data.code}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3 ring-1 ring-inset ring-hairline">
                <p className="text-[11px] text-muted-foreground">{t.managers}</p>
                <p className="mt-0.5 font-display text-lg font-bold">{copy.leagues.managers(preview.data.size)}</p>
              </div>
            </div>
            {preview.data.leader && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="size-4 text-gold" /> {t.leader}: <span className="font-semibold text-foreground">{preview.data.leader.team}</span>
                <span className="num">{preview.data.leader.points} {copy.common.pts}</span>
              </p>
            )}
            <div className="mt-6">
              {preview.data.member ? (
                <>
                  <p className="mb-3 text-center text-sm text-muted-foreground">{t.already}</p>
                  <Button asChild size="cta" className="w-full">
                    <Link href={routes.league(preview.data.id)}>{t.open}</Link>
                  </Button>
                </>
              ) : (
                <Button size="cta" className="w-full" disabled={busy} onClick={join}>
                  {busy ? <Loader2 className="animate-spin" /> : <Ticket />} {t.cta}
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">{t.free}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
