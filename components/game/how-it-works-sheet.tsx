"use client";

import Link from "next/link";
import { Drawer as Vaul } from "vaul";
import { ArrowUpRight } from "lucide-react";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";

/** Where each part of the game runs, in plain words. */
export function HowItWorksSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const h = copy.howItWorks;
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange}>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Vaul.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-[520px] flex-col rounded-t-[28px] bg-surface-1 outline-none ring-1 ring-hairline">
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" />
          <div className="overflow-y-auto px-5 pb-6 pt-4">
            <Vaul.Title className="font-display text-2xl font-bold uppercase tracking-tight">{h.title}</Vaul.Title>
            <Vaul.Description className="mt-1 text-sm text-muted-foreground">{h.body}</Vaul.Description>
            <ol className="mt-5 space-y-2">
              {h.rows.map((r, i) => (
                <li key={r.moment} className="flex gap-3 rounded-2xl bg-surface-2 p-3.5 ring-1 ring-inset ring-hairline">
                  <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-xs font-bold text-brand">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{r.moment}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{r.plain}</p>
                    <p className="mt-1.5 inline-block rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">{r.tech}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href={routes.proof} className="mt-4 flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface-2 text-sm font-semibold ring-1 ring-inset ring-hairline">
              {h.proof} <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
