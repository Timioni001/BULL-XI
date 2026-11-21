"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Logo } from "@/components/brand/logo";

/** Floating dark pill with the logo and a menu, plus two buttons on the right. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const L = copy.landing;
  const links = [
    { href: "#how", label: L.nav.how },
    { href: "#live", label: L.nav.live },
    { href: "#tech", label: L.nav.tech },
    { href: "#faq", label: L.nav.faq },
  ];
  return (
    <header className="pt-safe fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1240px] items-start justify-between px-4 pt-3 lg:px-6 lg:pt-4">
        <div className="relative w-[220px]">
          <div className="flex h-12 items-center justify-between rounded-2xl bg-[#1b1b1d] pl-3.5 pr-1.5 text-white shadow-[0_16px_32px_-16px_rgb(0_0_0/0.6)]">
            <Link href={routes.landing} className="flex items-center gap-2">
              <Logo size={22} decorative />
              <span className="font-display text-[13px] font-black tracking-wide">BULL-XI</span>
            </Link>
            <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="grid size-9 place-items-center rounded-xl hover:bg-white/10">
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
          <nav
            aria-hidden={!open}
            className={`absolute inset-x-0 top-14 rounded-2xl bg-[#1b1b1d] p-1.5 text-white shadow-2xl transition-all duration-200 ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1.5 opacity-0"}`}
          >
            {links.map((l) => (
              <a key={l.href} href={l.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="flex h-11 items-center rounded-xl px-3 text-sm hover:bg-white/10">
                {l.label}
              </a>
            ))}
            <Link href={routes.proof} tabIndex={open ? 0 : -1} className="flex h-11 items-center rounded-xl px-3 text-sm hover:bg-white/10">
              {L.footer.proof}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href={routes.proof} className="hidden h-11 items-center rounded-xl bg-white px-4 text-[13px] font-semibold text-black shadow-sm ring-1 ring-black/5 sm:inline-flex">
            {L.footer.proof}
          </Link>
          <Link href={routes.app} className="inline-flex h-11 items-center rounded-xl bg-brand px-4 text-[13px] font-semibold text-brand-foreground shadow-[0_10px_24px_-10px_var(--brand-glow)] hover:bg-[var(--brand-hover)]">
            {L.nav.open}
          </Link>
        </div>
      </div>
    </header>
  );
}
