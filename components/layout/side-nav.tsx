"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Activity, ArrowLeftRight, Crown, History, Search, Shirt, Sparkles, Trophy, UserRound } from "lucide-react";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useGame } from "@/lib/store/game";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { Logo, Wordmark } from "@/components/brand/logo";
import { useStockSheets } from "@/components/stock/stock-sheets";

const ITEMS = [
  { href: routes.live, label: copy.nav.live, icon: Activity },
  { href: routes.pick, label: copy.nav.team, icon: Shirt, match: [routes.pick, routes.squad, routes.lock] },
  { href: routes.transfers, label: copy.nav.transfers, icon: ArrowLeftRight },
  { href: routes.chips, label: copy.nav.chips, icon: Sparkles },
  { href: routes.leagues, label: copy.nav.leagues, icon: Trophy },
  { href: routes.history, label: copy.nav.history, icon: History },
  { href: routes.profile, label: copy.nav.profile, icon: UserRound },
];

/** Desktop navigation rail (1024px and up). */
export function SideNav() {
  const path = usePathname();
  const { openSearch } = useStockSheets();
  const demo = useGame((s) => s.demoMode);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-hairline px-4 py-6 lg:flex">
      <Link href={routes.landing} className="flex items-center gap-2.5 px-2">
        <Logo size={30} decorative />
        <Wordmark />
      </Link>

      <button
        onClick={openSearch}
        className="mt-7 flex h-11 items-center gap-2.5 rounded-full bg-surface-1 px-4 text-sm text-muted-foreground ring-1 ring-inset ring-hairline hover:text-foreground"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">{copy.nav.search}</span>
        <kbd className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>
      </button>

      <nav aria-label="Main" className="mt-5 flex flex-col gap-1">
        {ITEMS.map((it) => {
          const active = (it.match ?? [it.href]).some((m) => path.startsWith(m));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn("relative flex h-11 items-center gap-3 rounded-full px-4 text-[14px] font-semibold transition-colors", active ? "text-ink-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {active && <motion.span layoutId="side-pill" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
              <Icon className="relative size-[18px]" />
              <span className="relative">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link href={routes.pro} className="mt-auto block rounded-2xl bg-surface-1 p-4 ring-1 ring-inset ring-hairline">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Crown className="size-4 text-gold" /> {copy.profile.pro.title}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{copy.profile.pro.body}</span>
      </Link>
      {demo && <p className="mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-brand">{copy.common.demoMode}</p>}
    </aside>
  );
}
