"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
  const backBtn =
    back === true ? (
      <button aria-label="Back" onClick={() => router.back()} className="-ml-2 grid size-10 place-items-center rounded-full active:bg-surface-2">
        <ChevronLeft className="size-5" />
      </button>
    ) : back ? (
      <Link aria-label="Back" href={back} className="-ml-2 grid size-10 place-items-center rounded-full active:bg-surface-2">
        <ChevronLeft className="size-5" />
      </Link>
    ) : null;

  return (
    <header className={cn("pt-safe sticky top-0 z-30 bg-background/85 backdrop-blur-xl", className)}>
      <div className="flex h-14 items-center gap-2 px-4">
        {backBtn}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate text-[17px] font-semibold leading-tight tracking-tight">{title}</h1>}
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>
    </header>
  );
}
