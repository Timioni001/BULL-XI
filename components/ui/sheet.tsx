"use client";

import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/utils";

/** Bottom sheet with BULL-XI styling. On desktop it sits centred, 480px wide. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Vaul.Content className={cn("fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-[480px] flex-col rounded-t-[28px] bg-surface-1 outline-none ring-1 ring-hairline", className)}>
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" />
          <div className="overflow-y-auto px-5 pb-safe pt-4">
            <Vaul.Title className="font-display text-2xl font-bold uppercase tracking-tight">{title}</Vaul.Title>
            {description ? <Vaul.Description className="mt-1 text-sm text-muted-foreground">{description}</Vaul.Description> : <Vaul.Description className="sr-only">{title}</Vaul.Description>}
            <div className="mt-4 pb-2">{children}</div>
          </div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-label font-semibold uppercase text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
      {error && <span className="mt-1.5 block text-xs text-foreground/80">{error}</span>}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl bg-surface-2 px-4 text-[16px] outline-none ring-1 ring-inset ring-hairline placeholder:text-muted-foreground";
