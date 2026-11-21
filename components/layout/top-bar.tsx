"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string | true;
  right?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, subtitle, back, right, className }: TopBarProps) {
  const router = useRouter();
  const btn = "-ml-2 grid size-11 place-items-center rounded-full active:bg-surface-2 hover:bg-surface-1";
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
          {title && <h1 className="truncate font-display text-[19px] font-bold leading-tight tracking-tight lg:text-[34px] lg:uppercase">{title}</h1>}
          {subtitle && <p className="truncate text-xs text-muted-foreground lg:mt-1 lg:text-sm">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>
    </header>
  );
}

/** Big broadcast-style page header: small eyebrow over a giant uppercase title. */
export function PageHeader({ eyebrow, title, right, back, className }: { eyebrow: string; title: string; right?: React.ReactNode; back?: string; className?: string }) {
  return (
    <header className={cn("pt-safe px-4 pb-4 pt-4 lg:px-0 lg:pt-8", className)}>
      {back && (
        <Link aria-label={copy.common.back} href={back} className="-ml-2 mb-1 grid size-11 place-items-center rounded-full active:bg-surface-2 lg:hidden">
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span aria-hidden className="inline-block size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-brand" />
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-giant font-bold uppercase lg:text-[64px]">{title}</h1>
        </div>
        {right && <div className="flex shrink-0 items-center gap-2 pb-1">{right}</div>}
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
      <h2 className="font-display text-[17px] font-bold uppercase tracking-tight">{title}</h2>
      {right && <span className="text-xs text-muted-foreground">{right}</span>}
    </div>
  );
}
