"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { routes } from "@/lib/routes";

/** Dark prompt pill that types out things you can do, then links into the app. */
export function TypingPrompt({ phrases, label }: { phrases: readonly string[]; label: string }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [go, setGo] = useState(false);

  // Begin typing after load so it never competes with first paint.
  useEffect(() => {
    const id = setTimeout(() => setGo(true), 1800);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setN(phrases[0].length), 0);
      return () => clearTimeout(id);
    }
    if (!go) return;
    const full = phrases[i];
    const done = !deleting && n === full.length;
    const empty = deleting && n === 0;
    const id = setTimeout(
      () => {
        if (done) setDeleting(true);
        else if (empty) {
          setDeleting(false);
          setI((x) => (x + 1) % phrases.length);
        } else setN((x) => x + (deleting ? -1 : 1));
      },
      done ? 1600 : empty ? 250 : deleting ? 22 : 48,
    );
    return () => clearTimeout(id);
  }, [i, n, deleting, phrases, go]);

  return (
    <Link
      href={routes.app}
      className="group mx-auto flex h-14 w-full max-w-[380px] items-center gap-3 rounded-2xl bg-[#1b1b1d] pl-4 pr-2 text-left text-white shadow-[0_24px_48px_-20px_rgb(0_0_0/0.55)] ring-1 ring-white/10 transition-transform hover:-translate-y-0.5"
    >
      <Logo size={22} className="shrink-0" decorative />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-white/80">
        {go ? phrases[i].slice(0, n) : phrases[0]}
        <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-white/70" />
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 transition-colors group-hover:bg-brand">
        <ArrowUpRight className="size-[18px]" />
      </span>
    </Link>
  );
}
