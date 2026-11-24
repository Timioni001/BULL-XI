"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Award, ChevronRight, Crown, Flame, History, Info, Lock, Medal, Moon, Pencil, Play, RotateCcw, Shield, Star, Sun, Trophy, type LucideIcon } from "lucide-react";
import { setTheme, useTheme, type Theme } from "@/lib/theme";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "sonner";
import type { BadgeId } from "@/lib/data/types";
import { getBadges, getHistory, getLeagues, resetLocalData, updateProfileOnchain } from "@/lib/data";
import { existingDeviceAddress, useOnchainPlayer } from "@/lib/auth/player";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { ordinal } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { useGame } from "@/lib/store/game";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Field, Sheet, inputClass } from "@/components/ui/sheet";
import { PageHeader, SectionTitle } from "@/components/layout/top-bar";
import { TabBar } from "@/components/layout/tab-bar";
import { HowItWorksSheet } from "@/components/game/how-it-works-sheet";
import { Shimmer } from "@/components/states/states";
import { AccountCard } from "@/components/game/account-card";

const t = copy.profile;
const BADGE_ICON: Record<BadgeId, LucideIcon> = { lockedIn: Shield, captainsCall: Star, podium: Medal, ironXI: Flame, centurion: Award, champion: Crown };

export function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const managerName = useGame((s) => s.managerName);
  const teamName = useGame((s) => s.teamName);
  const locks = useGame((s) => s.locks);
  const results = useGame((s) => s.results);
  const demo = useGame((s) => s.demoMode);
  const setDemo = useGame((s) => s.setDemoMode);
  const resetAll = useGame((s) => s.resetAll);
  const hydrated = useGame((s) => s.hydrated);
  const leagues = useAsync(getLeagues);
  const history = useAsync(getHistory);
  const badges = useAsync(() => getBadges(locks));
  const [editing, setEditing] = useState(false);
  const [how, setHow] = useState(false);

  const global = leagues.data?.find((l) => l.kind === "global");
  const seasonPoints = (history.data ?? []).reduce((a, h) => a + h.points, 0) + results.reduce((a, r) => a + r.points, 0);
  const initials = managerName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[calc(104px+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:px-0 lg:pb-10">
        <div className="flex flex-col gap-3">
          <section className="relative overflow-hidden rounded-[28px] bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#ff8a5c,#ff5b1f)] font-display text-2xl font-black text-[#161618] shadow-[0_12px_32px_-12px_var(--brand-glow)]">
                {hydrated ? initials : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[24px] font-bold uppercase leading-tight">{hydrated ? teamName : "\u00a0"}</p>
                <p className="truncate text-sm text-muted-foreground">{hydrated && managerName}</p>
              </div>
              <Button variant="secondary" size="icon-cta" aria-label={copy.common.edit} onClick={() => setEditing(true)}>
                <Pencil />
              </Button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Stat label={t.seasonRank} value={global ? ordinal(global.yourRank) : "–"} sub={global?.name} />
              <Stat label={t.seasonPoints} value={history.status === "success" ? String(seasonPoints) : "–"} />
              <Stat label={t.leagues} value={leagues.data ? String(leagues.data.length) : "–"} />
            </div>
          </section>

          <AccountCard />

          <section>
            <SectionTitle title={t.badges} />
            <div className="grid grid-cols-3 gap-2">
              {(badges.data ?? Array.from({ length: 6 }, () => null)).map((b, i) =>
                b ? (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: dur.base, ease, delay: i * 0.04 }}
                    className={cn("flex flex-col items-center rounded-3xl bg-surface-1 px-2 py-4 text-center ring-1 ring-inset", b.earned ? "ring-gold/40" : "ring-hairline")}
                  >
                    <BadgeIcon id={b.id} earned={b.earned} />
                    <p className={cn("mt-2 text-[12px] font-semibold leading-tight", !b.earned && "text-muted-foreground")}>{copy.badges[b.id].name}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{b.earned ? copy.badges[b.id].body : t.badgeLocked}</p>
                  </motion.div>
                ) : (
                  <Shimmer key={i} className="h-[124px] rounded-3xl" />
                ),
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-3">
          <Link href={routes.pro} className="relative block overflow-hidden rounded-[28px] bg-brand p-5 text-brand-foreground shadow-[0_24px_48px_-24px_var(--brand-glow)]">
            <div aria-hidden className="absolute -right-10 -top-10 size-40 rotate-45 bg-black/10" />
            <Crown className="relative size-6 text-gold" />
            <p className="relative mt-3 font-display text-2xl font-bold uppercase">{t.pro.title}</p>
            <p className="relative mt-1 text-sm text-brand-foreground">{t.pro.body}</p>
          </Link>

          <div className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
            <Row href={routes.history} icon={History} label={copy.nav.history} />
            <Row href={routes.leagues} icon={Trophy} label={copy.nav.leagues} />
            <Row onClick={() => setHow(true)} icon={Info} label={t.howItWorks} />
          </div>

          <SectionTitle title={t.settings} />
          <div className="overflow-hidden rounded-3xl bg-surface-1 ring-1 ring-inset ring-hairline">
            <div className="flex min-h-14 items-center gap-3 border-b border-hairline px-4 py-3">
              {theme === "dark" ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
              <span className="flex-1">
                <span className="block text-sm font-semibold">{t.appearance}</span>
                <span className="block text-xs text-muted-foreground">{t.appearanceBody}</span>
              </span>
              <Segmented<Theme>
                id="theme"
                size="sm"
                className="w-[132px]"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "light", label: t.light },
                  { value: "dark", label: t.dark },
                ]}
              />
            </div>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-hairline px-4 py-3">
              <Play className="size-4 text-muted-foreground" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{t.demo}</span>
                <span className="block text-xs text-muted-foreground">{t.demoBody}</span>
              </span>
              <Switch checked={demo} onChange={setDemo} label={t.demo} />
            </label>
            <Row onClick={() => router.push(routes.intro)} icon={Lock} label={t.replay} />
            <Row
              onClick={() => {
                resetAll();
                resetLocalData();
                toast(t.resetDone);
                router.push(routes.intro);
              }}
              icon={RotateCcw}
              label={t.reset}
            />
          </div>
        </aside>
      </main>
      <TabBar />
      <EditProfile open={editing} onOpenChange={setEditing} />
      <HowItWorksSheet open={how} onOpenChange={setHow} />
    </>
  );
}

function BadgeIcon({ id, earned }: { id: BadgeId; earned: boolean }) {
  const Icon = BADGE_ICON[id];
  return (
    <span
      className={cn(
        "grid size-12 place-items-center",
        earned ? "bg-[linear-gradient(135deg,#ffe08a,#f5c451_45%,#c8921f)] text-black shadow-[0_0_20px_rgb(245_196_81/0.35)]" : "bg-surface-3 text-muted-foreground",
      )}
      style={{ clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)" }}
    >
      <Icon className="size-5" />
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-hairline">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="num font-display text-xl font-bold">{value}</p>
      {sub && <p className="truncate text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Row({ href, onClick, icon: Icon, label }: { href?: string; onClick?: () => void; icon: LucideIcon; label: string }) {
  const cls = "flex min-h-14 w-full items-center gap-3 border-b border-hairline px-4 text-left text-sm font-semibold last:border-0 hover:bg-surface-2";
  const inner = (
    <>
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-brand" : "bg-surface-3")}
    >
      <motion.span layout className={cn("absolute top-1 size-5 rounded-full bg-white", checked ? "right-1" : "left-1")} transition={{ type: "spring", stiffness: 600, damping: 35 }} />
    </button>
  );
}

function EditProfile({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const managerName = useGame((s) => s.managerName);
  const teamName = useGame((s) => s.teamName);
  const setProfile = useGame((s) => s.setProfile);
  const player = useOnchainPlayer();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={copy.common.edit}>
      {open && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const next = { managerName: String(f.get("manager") ?? ""), teamName: String(f.get("team") ?? "") };
            setProfile(next);
            toast(t.saved);
            onOpenChange(false);
            // Keep the public profile in step (only once it exists; never creates a device key).
            void (async () => {
              if (player.kind === "device" && !(await existingDeviceAddress())) return;
              const done = await updateProfileOnchain(await player.get(), next.managerName, next.teamName);
              if (done) toast(copy.manager.renamed);
            })().catch(() => {});
          }}
        >
          <Field label={t.managerName}>
            <input name="manager" defaultValue={managerName} maxLength={24} className={inputClass} autoComplete="name" />
          </Field>
          <Field label={t.teamName}>
            <input name="team" defaultValue={teamName} maxLength={24} className={inputClass} autoComplete="off" />
          </Field>
          <Button type="submit" size="cta">
            {t.save}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
