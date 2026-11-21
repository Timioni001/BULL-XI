"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, Shirt, Trophy, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const TABS = [
  { href: "/live", label: "Live", icon: Activity },
  { href: "/pick", label: "Team", icon: Shirt, match: ["/pick", "/squad", "/lock"] },
  { href: "/leagues", label: "Leagues", icon: Trophy },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t border-hairline bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="grid h-16 grid-cols-4">
        {TABS.map((t) => {
          const active = (t.match ?? [t.href]).some((m) => path.startsWith(m));
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link href={t.href} className={cn("relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150", active ? "text-foreground" : "text-muted-foreground")}>
                {active && <motion.span layoutId="tab-pill" transition={spring} className="absolute top-0 h-0.5 w-8 rounded-full bg-foreground" />}
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
