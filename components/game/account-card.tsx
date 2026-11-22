"use client";

import { Check, Copy, LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/states/states";

const t = copy.account;
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

/** Profile account block: sign in as a guest, or who you are when signed in. */
export function AccountCard() {
  const { status, account, signIn, signOut } = useAuth();
  const [copied, setCopied] = useState(false);

  if (status === "unavailable") return null;
  if (status === "loading") return <Shimmer className="h-[132px] rounded-3xl" />;

  if (status === "guest" || !account) {
    return (
      <section className="rounded-3xl bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
            <UserRound className="size-5 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{t.guestTitle}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{t.guestBody}</p>
          </div>
        </div>
        <Button size="cta" className="mt-4 w-full" onClick={signIn}>
          {t.signIn}
        </Button>
      </section>
    );
  }

  const label = account.name ?? account.email ?? (account.address ? short(account.address) : t.playerId);
  const id = account.address;
  return (
    <section className="rounded-3xl bg-surface-1 p-5 ring-1 ring-inset ring-hairline">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-ink-foreground">{label.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{label}</p>
          <p className="truncate text-[13px] text-muted-foreground">{t.signedInWith[account.method]}</p>
        </div>
      </div>
      {id && (
        <button
          className="mt-4 flex w-full items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-left ring-1 ring-inset ring-hairline"
          onClick={() => {
            void navigator.clipboard?.writeText(id);
            setCopied(true);
            toast(t.copied);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <span>
            <span className="block text-[11px] text-muted-foreground">{t.playerId}</span>
            <span className="num block font-mono text-sm font-semibold">{short(id)}</span>
          </span>
          {copied ? <Check className="size-4 text-bull" /> : <Copy className="size-4 text-muted-foreground" />}
        </button>
      )}
      <Button
        variant="secondary"
        size="cta"
        className="mt-3 w-full"
        onClick={async () => {
          await signOut();
          toast(t.signedOut);
        }}
      >
        <LogOut /> {t.signOut}
      </Button>
    </section>
  );
}
