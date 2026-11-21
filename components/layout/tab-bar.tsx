"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Activity, Shirt, Trophy, UserRound } from "lucide-react";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

export const MOBILE_TABS = [
  { href: routes.live, label: copy.nav.live, icon: Activity },
  { href: routes.pick, label: copy.nav.team, icon: Shirt, match: [routes.pick, routes.squad, routes.lock, routes.transfers, routes.chips] },
  { href: routes.leagues, label: copy.nav.leagues, icon: Trophy },
  { href: routes.profile, label: copy.nav.profile, icon: UserRound, match: [routes.profile, routes.history, routes.pro] },
];

/** Floating pill nav for phones. Hidden on desktop, where the side nav takes over. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden">
      <ul className="noise mx-auto flex h-16 max-w-[408px] items-center justify-between rounded-full bg-surface-1/90 px-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.9)] ring-1 ring-inset ring-hairline backdrop-blur-xl">
        {MOBILE_TABS.map((t) => {
          const active = (t.match ?? [t.href]).some((m) => path.startsWith(m));
          const Icon = t.icon;
          return (
            <li key={t.href} className={cn(active ? "flex-[1.6]" : "flex-1", "transition-[flex] duration-200")}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-12 items-center justify-center gap-2 rounded-full text-[13px] font-semibold", active ? "text-white" : "text-muted-foreground")}
              >
                {active && <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-0 rounded-full bg-brand shadow-[0_8px_24px_-8px_var(--brand-glow)]" />}
                <Icon className="relative size-[21px]" strokeWidth={active ? 2.3 : 1.9} />
                <span className={cn("relative", !active && "sr-only")}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
