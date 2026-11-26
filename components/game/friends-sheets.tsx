"use client";

import { useState } from "react";
import { Loader2, Plus, Ticket } from "lucide-react";
import { createFriendsLeague, joinFriendsLeague } from "@/lib/data";
import { copy } from "@/lib/copy";
import { useOnchainPlayer } from "@/lib/auth/player";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Sheet, inputClass } from "@/components/ui/sheet";

const t = copy.friends;
const FEES = [0, 5, 10];

function nextHourLabel() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + (new Date().getMinutes() >= 55 ? 2 : 1));
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function tonightLabel() {
  const d = new Date();
  d.setUTCHours(20, 0, 0, 0);
  if (d.getTime() - Date.now() < 5 * 60_000) d.setUTCDate(d.getUTCDate() + 1);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Choice<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; label: string; sub?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", options.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn("flex h-14 flex-col items-center justify-center rounded-2xl text-sm font-semibold ring-1 ring-inset transition-colors", value === o.v ? "bg-ink text-ink-foreground ring-ink" : "bg-surface-2 ring-hairline")}
        >
          {o.label}
          {o.sub && <span className={cn("num text-[11px] font-medium", value === o.v ? "text-ink-foreground/70" : "text-muted-foreground")}>{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export function CreateFriendsSheet({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (code: string) => void }) {
  const player = useOnchainPlayer();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"flash" | "daily">("flash");
  const [fee, setFee] = useState(5);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(copy.leagues.nameRequired);
    setBusy(true);
    haptic(12);
    try {
      const code = await createFriendsLeague(await player.get(), { name, kind, fee });
      setName("");
      onDone(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.generic);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.createTitle} description={t.createBody}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={copy.leagues.nameLabel} error={error}>
          <input value={name} onChange={(e) => (setName(e.target.value), setError(undefined))} maxLength={24} placeholder={copy.leagues.namePlaceholder} className={inputClass} autoComplete="off" />
        </Field>
        <Field label={t.gameweek}>
          <Choice label={t.gameweek} value={kind} onChange={setKind} options={[{ v: "flash", label: t.nextHour, sub: nextHourLabel() }, { v: "daily", label: t.tonight, sub: tonightLabel() }]} />
        </Field>
        <Field label={t.fee}>
          <Choice label={t.fee} value={fee} onChange={setFee} options={FEES.map((f) => ({ v: f, label: f === 0 ? t.free : `$${f}` }))} />
        </Field>
        <p className="text-xs text-muted-foreground">{fee > 0 ? t.feeNote(fee) : t.freeNote} {copy.pro.preview}</p>
        <Button type="submit" size="cta" disabled={busy || !player.ready}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />} {busy ? t.creating : copy.leagues.createCta}
        </Button>
      </form>
    </Sheet>
  );
}

export function JoinFriendsSheet({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (code: string, name: string) => void }) {
  const player = useOnchainPlayer();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) return setError(t.joinBody);
    setBusy(true);
    haptic(12);
    try {
      const l = await joinFriendsLeague(await player.get(), code);
      setCode("");
      onDone(l.code, l.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.notFound);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.joinTitle} description={t.joinBody}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={copy.leagues.codeLabel} error={error}>
          <input
            value={code}
            onChange={(e) => (setCode(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "")), setError(undefined))}
            maxLength={6}
            placeholder="7KQ2MX"
            className={cn(inputClass, "font-mono uppercase tracking-[0.3em]")}
            autoComplete="off"
            autoCapitalize="characters"
          />
        </Field>
        <Button type="submit" size="cta" disabled={busy || code.length !== 6 || !player.ready}>
          {busy ? <Loader2 className="animate-spin" /> : <Ticket />} {busy ? t.joining : t.joinCta}
        </Button>
      </form>
    </Sheet>
  );
}
