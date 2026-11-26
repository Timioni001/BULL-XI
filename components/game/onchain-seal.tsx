"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { explorer } from "@/lib/config";
import { useAuth } from "@/lib/auth/context";
import { devicePlayer, useOnchainPlayer } from "@/lib/auth/player";
import { sealSquadOnchain } from "@/lib/data";
import { squadIds } from "@/lib/game/rules";
import { copy } from "@/lib/copy";
import { useGame, type LockedEntry } from "@/lib/store/game";
import { dur, ease } from "@/lib/motion";

const t = copy.lock.onchain;
type State = { kind: "idle" } | { kind: "sealing" } | { kind: "failed"; code?: string };

/**
 * Under the lock seal: seals the locked squad inside MagicBlock's Private ER
 * on Solana devnet with the player's account (a device key only as a
 * fallback). No fees, no pop-ups.
 */
export function OnchainSeal({ locked, deadline }: { locked: LockedEntry; deadline: string | null }) {
  const auth = useAuth();
  const player = useOnchainPlayer();
  const setOnchainSeal = useGame((s) => s.setOnchainSeal);
  const demo = useGame((s) => s.demoMode);
  const [state, setState] = useState<State>({ kind: "idle" });
  const started = useRef<string | null>(null);
  const sealKey = `${locked.receipt.sealId}:${player.kind}:${auth.account?.address ?? ""}`;

  const seal = useCallback(async () => {
    if (!deadline) return;
    setState({ kind: "sealing" });
    try {
      const g = useGame.getState();
      const input = {
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
      };
      let result;
      try {
        result = await sealSquadOnchain(await player.get(), input);
      } catch (e) {
        // If the account can't sign (sign-in hiccup), seal with this device so the squad still counts.
        if (player.kind !== "account" || (e as { code?: string }).code === "not-open") throw e;
        console.warn("Account seal failed, sealing with this device:", e instanceof Error ? e.message : e);
        result = await sealSquadOnchain(await devicePlayer(), input);
      }
      setOnchainSeal({ ...result });
      setState({ kind: "idle" });
    } catch (e) {
      setState({ kind: "failed", code: (e as { code?: string }).code });
    }
  }, [deadline, locked, player, setOnchainSeal]);

  // Seal automatically once per lock (not in demo mode: its kickoff is simulated).
  useEffect(() => {
    if (demo || !player.ready || locked.onchain || started.current === sealKey) return;
    started.current = sealKey;
    void seal();
  }, [demo, player.ready, locked.onchain, sealKey, seal]);

  if (demo) return null;
  const row = "mx-auto mt-4 flex max-w-[34ch] items-center justify-center gap-2 text-[13px]";

  if (locked.onchain) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.base, ease }} className="mx-auto mt-4 max-w-[34ch]">
        <p className="flex items-start justify-center gap-2 text-[13px] font-semibold">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-bull" /> {t.sealed}
        </p>
        <a href={explorer("address", locked.onchain.address)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2">
          {t.proof} <ExternalLink className="size-3" />
        </a>
        {player.kind === "device" && auth.status === "guest" && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t.guest}{" "}
            <button className="font-semibold text-foreground underline underline-offset-2" onClick={auth.signIn}>
              {t.signIn}
            </button>
          </p>
        )}
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
