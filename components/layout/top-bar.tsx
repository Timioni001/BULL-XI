"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { AppHeader } from "./app-header";

interface TopBarProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string | true;
  right?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, subtitle, back, right, className }: TopBarProps) {
  const router = useRouter();
  const btn = "mr-1 grid size-11 shrink-0 place-items-center rounded-full bg-surface-1 ring-1 ring-inset ring-hairline active:bg-surface-2";
  const backBtn =
    back === true ? (
      <button aria-label={copy.common.back} onClick={() => router.back()} className={btn}>
        <ChevronLeft className="size-5" />
      </button>
    ) : back ? (
      <Link aria-label={copy.common.back} href={back} className={cn(btn, "lg:hidden")}>
        <ChevronLeft className="size-5" />
      </Link>
    ) : null;

  return (
    <header className={cn("pt-safe sticky top-0 z-30 bg-background/80 backdrop-blur-xl lg:static lg:bg-transparent lg:backdrop-blur-none", className)}>
      <div className="flex h-14 items-center gap-2 px-4 lg:h-24 lg:px-0">
        {backBtn}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate font-display text-[15px] font-black uppercase leading-tight lg:text-[34px]">{title}</h1>}
          {subtitle && <p className="truncate text-xs text-muted-foreground lg:mt-1 lg:text-sm">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>
    </header>
  );
}

/**
 * Big two-tone page header, like a match programme: first line white,
 * second line grey. Avatar, search and notifications sit above it on phones.
 */
export function PageHeader({ eyebrow, title, right, back, className }: { eyebrow: string; title: string; right?: React.ReactNode; back?: string; className?: string }) {
  return (
    <header className={cn("lg:pt-8", className)}>
      {back ? (
        <div className="pt-safe flex h-16 items-center justify-between px-4 lg:hidden">
          <Link aria-label={copy.common.back} href={back} className="grid size-11 place-items-center rounded-full bg-surface-1 ring-1 ring-inset ring-hairline">
            <ChevronLeft className="size-5" />
          </Link>
          {right}
        </div>
      ) : (
        <AppHeader />
      )}
      <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-1 lg:px-0">
        <h1 className="font-display text-[42px] font-black uppercase leading-[0.92] lg:text-[64px]">
          <span className="block text-foreground">{eyebrow}</span>
          <span className="block text-heading-muted">{title}</span>
        </h1>
        {right && <div className={cn("shrink-0 items-center gap-2 pb-1", back ? "hidden lg:flex" : "flex")}>{right}</div>}
      </div>
    </header>
  );
}

/** One column on phones; main + sticky aside on desktop. */
export function ScreenGrid({ main, aside, className }: { main: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6", className)}>
      <div className="flex min-w-0 flex-col gap-3">{main}</div>
      {aside && <aside className="flex flex-col gap-3 lg:sticky lg:top-6">{aside}</aside>}
    </div>
  );
}

export function SectionTitle({ title, right, className }: { title: string; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2 mt-2 flex items-center justify-between px-1", className)}>
      <h2 className="font-display text-[16px] font-black uppercase">{title}</h2>
      {right && <span className="text-xs text-muted-foreground">{right}</span>}
    </div>
  );
}
