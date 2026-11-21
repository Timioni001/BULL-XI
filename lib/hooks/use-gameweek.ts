"use client";

import { useEffect, useState } from "react";
import { getCurrentGameweek, type Gameweek, type GameweekKind } from "@/lib/data";

const cache = new Map<GameweekKind, Gameweek>();

/** Next enterable gameweek of a kind. Refetches once its deadline passes. */
export function useGameweek(kind: GameweekKind) {
  const [state, setState] = useState<{ kind: GameweekKind; gw?: Gameweek; error?: Error }>(() => ({ kind, gw: cache.get(kind) }));
  const [nonce, setNonce] = useState(0);
  const current = state.kind === kind ? state : { kind, gw: cache.get(kind) };

  useEffect(() => {
    let alive = true;
    const cached = cache.get(kind);
    if (cached && new Date(cached.deadline).getTime() > Date.now() && nonce === 0) return;
    getCurrentGameweek(kind).then(
      (gw) => {
        cache.set(kind, gw);
        if (alive) setState({ kind, gw });
      },
      (error: Error) => alive && setState({ kind, error }),
    );
    return () => {
      alive = false;
    };
  }, [kind, nonce]);

  return { gameweek: current.gw, error: current.error, retry: () => setNonce((n) => n + 1) };
}
