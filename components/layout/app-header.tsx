"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Search, Trophy, Lock, Flag } from "lucide-react";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useGame } from "@/lib/store/game";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { useStockSheets } from "@/components/stock/stock-sheets";

/** Avatar on the left, search and notifications on the right. */
export function AppHeader({ className }: { className?: string }) {
  const managerName = useGame((s) => s.managerName);
  const hydrated = useGame((s) => s.hydrated);
  const { openSearch } = useStockSheets();
  const initials = managerName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className={cn("pt-safe flex h-16 items-center justify-between px-4 lg:hidden", className)}>
      <Link href={routes.profile} aria-label={copy.nav.profileShort} className="relative">
        <span className="grid size-11 place-items-center rounded-full bg-ink font-display text-[12px] font-black text-ink-foreground">{hydrated ? initials : ""}</span>
        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full bg-brand text-[13px] font-bold leading-none text-brand-foreground ring-2 ring-background">
          +
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <button onClick={openSearch} aria-label={copy.nav.search} className="grid size-11 place-items-center rounded-full bg-surface-1 ring-1 ring-inset ring-hairline">
          <Search className="size-[18px]" />
        </button>
        <Notifications />
      </div>
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const locked = useGame((s) => s.locked);
  const results = useGame((s) => s.results);
  const items = useMemo(() => {
    const out: { icon: typeof Bell; title: string; body: string; href: string }[] = [];
    if (locked) out.push({ icon: Lock, title: copy.lock.lockedTitle, body: copy.live.gameweek(locked.gameweekNumber), href: routes.lock });
    if (results[0]) out.push({ icon: Flag, title: copy.result.title(results[0].gameweek), body: `${copy.common.signedPts(results[0].points)} · ${results[0].leagueName}`, href: routes.history });
    out.push({ icon: Trophy, title: copy.leagues.joinPage.eyebrow, body: "Trading Floor · TRD-9X4", href: routes.join("TRD-9X4") });
    return out;
  }, [locked, results]);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setSeen(true);
        }}
        aria-label={copy.nav.notifications}
        className="relative grid size-11 place-items-center rounded-full bg-surface-1 ring-1 ring-inset ring-hairline"
      >
        <Bell className="size-[18px]" />
        {!seen && items.length > 0 && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-brand ring-2 ring-surface-1" />}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={copy.nav.notifications}>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{copy.nav.noNotifications}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((n) => (
              <li key={n.title}>
                <Link href={n.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-3">
                    <n.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
