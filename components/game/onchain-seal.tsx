"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { explorer } from "@/lib/config";
import { useAuth } from "@/lib/auth/context";
import { sealSquadOnchain } from "@/lib/data";
import { squadIds } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { useGame, type LockedEntry } from "@/lib/store/game";
import { dur, ease } from "@/lib/motion";

const t = copy.lock.onchain;
type State = { kind: "idle" } | { kind: "sealing" } | { kind: "failed"; reason: string; code?: string };

/**
 * Under the lock seal: for signed-in managers, seals the locked squad inside
 * MagicBlock's Private ER on Solana devnet. Guests see a sign-in nudge.
 */
export function OnchainSeal({ locked, deadline }: { locked: LockedEntry; deadline: string | null }) {
  const auth = useAuth();
  const setOnchainSeal = useGame((s) => s.setOnchainSeal);
  const [state, setState] = useState<State>({ kind: "idle" });
  const started = useRef<string | null>(null);

  const canSign = auth.status === "signedIn" && !!auth.account?.address && !!auth.signTransaction && !!auth.signMessage;
  const sealKey = `${locked.receipt.sealId}:${auth.account?.address ?? ""}`;

  const seal = useCallback(async () => {
    if (!canSign || !deadline) return;
    setState({ kind: "sealing" });
    try {
      const g = useGame.getState();
      const result = await sealSquadOnchain(
        { address: auth.account!.address!, signTransaction: auth.signTransaction!, signMessage: auth.signMessage! },
        {
          kind: locked.kind,
          deadline,
          managerName: g.managerName,
          teamName: g.teamName,
          squad: squadIds(g.slots),
          starters: locked.lineup.starters,
          bench: locked.lineup.bench,
          captainId: locked.lineup.captainId,
          viceId: locked.lineup.viceId,
          chip: locked.chip,
          hedgeId: locked.hedgeId,
          transferHit: locked.transferHit,
        },
      );
      setOnchainSeal({ ...result });
      setState({ kind: "idle" });
    } catch (e) {
      const code = (e as { code?: string }).code;
      setState({ kind: "failed", reason: e instanceof Error ? e.message : String(e), code });
    }
  }, [auth, canSign, deadline, locked, setOnchainSeal]);

  // Seal automatically once per lock.
  useEffect(() => {
    if (!canSign || locked.onchain || locked.kind !== "daily" || started.current === sealKey) return;
    started.current = sealKey;
    void seal();
  }, [canSign, locked.onchain, locked.kind, sealKey, seal]);

  if (auth.status === "unavailable" || auth.status === "loading") return null;

  const row = "mx-auto mt-4 flex max-w-[34ch] items-center justify-center gap-2 text-[13px]";

  if (auth.status === "guest") {
    return (
      <p className={`${row} flex-wrap text-muted-foreground`}>
        {t.guest}
        <button className="font-semibold text-foreground underline underline-offset-2" onClick={auth.signIn}>
          {t.signIn}
        </button>
      </p>
    );
  }
  if (locked.kind !== "daily") return <p className={`${row} text-muted-foreground`}>{t.flash}</p>;

  if (locked.onchain) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.base, ease }} className="mx-auto mt-4 max-w-[34ch]">
        <p className="flex items-start justify-center gap-2 text-[13px] font-semibold">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-bull" /> {t.sealed}
        </p>
        <a href={explorer("address", locked.onchain.address)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2">
          {t.proof} <ExternalLink className="size-3" />
        </a>
      </motion.div>
    );
  }
  if (state.kind === "failed") {
    return (
      <div className="mx-auto mt-4 max-w-[34ch] text-[13px] text-muted-foreground">
        <p>{state.code === "not-open" ? t.notOpen : t.failed}</p>
        {state.code !== "not-open" && (
          <button onClick={() => void seal()} className="mt-1 inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-2">
            <RotateCcw className="size-3.5" /> {t.retry}
          </button>
        )}
      </div>
    );
  }
  return (
    <p className={`${row} text-muted-foreground`}>
      <Loader2 className="size-4 animate-spin" /> {t.sealing}
    </p>
  );
}
