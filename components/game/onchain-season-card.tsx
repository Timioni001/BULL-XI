"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { existingDeviceAddress } from "@/lib/auth/player";
import { getManagerRecord } from "@/lib/data";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAsync } from "@/lib/hooks/use-async";

const t = copy.manager;

/** Your season as settled onchain (signed-in account, or this device), linking to your public profile. */
export function OnchainSeasonCard({ className }: { className?: string }) {
  const { status, account } = useAuth();
  const [device, setDevice] = useState<string | null>(null);
  useEffect(() => {
    if (status !== "signedIn") void existingDeviceAddress().then(setDevice);
  }, [status]);
  const addr = status === "signedIn" ? account?.address : device;
  if (!addr) return null;
  return <Card key={addr} address={addr} className={className} />;
}

function Card({ address, className }: { address: string; className?: string }) {
  const record = useAsync(() => getManagerRecord(address));
  if (record.status !== "success") return null;
  const r = record.data;
  return (
    <Link href={routes.manager(address)} className={`flex min-h-16 items-center gap-3 rounded-3xl bg-surface-1 px-4 py-3 ring-1 ring-inset ring-hairline ${className ?? ""}`}>
      <ShieldCheck className="size-5 shrink-0 text-bull" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{t.onSolana}</span>
        <span className="block truncate text-xs text-muted-foreground">{r && r.gameweeks > 0 ? t.onSolanaBody(r.gameweeks, r.totalPoints) : t.onSolanaEmpty}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
