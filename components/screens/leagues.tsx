"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, Globe2, Loader2, Plus, Share2, Ticket, Trophy } from "lucide-react";
import { toast } from "sonner";
import { createLeague, getLeagues, joinLeague, type LeagueSummary } from "@/lib/data";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { ordinal } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { useInvite } from "@/lib/hooks/use-invite";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Field, Sheet, inputClass } from "@/components/ui/sheet";
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
          <Link href={routes.league(best.id)} className="cut-tr noise relative block overflow-hidden rounded-[28px] bg-brand p-5 text-white shadow-[0_24px_48px_-24px_var(--brand-glow)]">
            <div aria-hidden className="absolute -right-10 -top-10 size-44 rotate-45 bg-white/10" />
            <p className="relative text-xs font-semibold uppercase tracking-wider text-white/75">{best.kind === "global" ? t.global : t.private}</p>
            <p className="relative mt-1 font-display text-[28px] font-bold uppercase leading-tight">{best.name}</p>
            <div className="relative mt-5 flex items-end justify-between">
              <div>
                <p className="text-xs text-white/75">{t.yourRank}</p>
                <p className="num font-display text-[56px] font-bold leading-none">{ordinal(best.yourRank)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{t.managers(best.size)}</p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    void invite(best.name, best.code);
                  }}
                  className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-black"
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
          {leagues.status === "success" && leagues.data.length > 0 && <div className="lg:hidden">{actions}</div>}
          {body}
        </div>
        <aside className="hidden flex-col gap-3 lg:flex">
          <SectionTitle title={t.createTitle} />
          <p className="px-1 text-sm text-muted-foreground">{t.createBody}</p>
          {actions}
        </aside>
      </main>
      <TabBar />

      <CreateSheet
        open={sheet === "create"}
        onOpenChange={(o) => !o && setSheet(null)}
        onDone={(l) => {
          setSheet(null);
          toast(t.created(l.name), { action: { label: t.invite, onClick: () => void invite(l.name, l.code) } });
          router.push(routes.league(l.id));
        }}
      />
      <JoinSheet
        open={sheet === "join"}
        onOpenChange={(o) => !o && setSheet(null)}
        onDone={(l) => {
          setSheet(null);
          toast(t.joined(l.name));
          router.push(routes.league(l.id));
        }}
      />
    </>
  );
}

function LeagueRow({ league }: { league: LeagueSummary }) {
  return (
    <Link href={routes.league(league.id)} className="noise flex items-center gap-4 rounded-3xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline transition-colors hover:bg-surface-2">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 ring-1 ring-inset ring-hairline">
        {league.kind === "global" ? <Globe2 className="size-5 text-muted-foreground" /> : <Trophy className="size-5 text-muted-foreground" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[17px] font-bold uppercase">{league.name}</span>
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

function CreateSheet({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (l: LeagueSummary) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t.nameRequired);
    setBusy(true);
    try {
      haptic(12);
      const l = await createLeague(name);
      setName("");
      onDone(l);
    } catch {
      setError(copy.errors.generic);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.createTitle} description={t.createBody}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t.nameLabel} error={error}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
            maxLength={32}
            placeholder={t.namePlaceholder}
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        <Button type="submit" size="cta" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />} {t.createCta}
        </Button>
      </form>
    </Sheet>
  );
}

function JoinSheet({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (l: LeagueSummary) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      haptic(12);
      const l = await joinLeague(code);
      setCode("");
      onDone(l);
    } catch {
      setError(copy.errors.leagueNotFound(code.trim().toUpperCase()).body);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.joinTitle} description={t.joinBody}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t.codeLabel} error={error}>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(undefined);
            }}
            maxLength={12}
            placeholder={t.codePlaceholder}
            className={cn(inputClass, "font-mono uppercase tracking-widest")}
            autoComplete="off"
            autoCapitalize="characters"
          />
        </Field>
        <Button type="submit" size="cta" disabled={busy || !code.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Ticket />} {t.joinCta}
        </Button>
      </form>
    </Sheet>
  );
}
