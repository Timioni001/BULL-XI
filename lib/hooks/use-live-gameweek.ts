"use client";

import { useEffect, useState } from "react";
import { subscribeLiveGameweek, type LiveGameweekInput, type LiveGameweekSnapshot } from "@/lib/data";

/** Subscribe to the live gameweek. Pass null to stay idle. */
export function useLiveGameweek(input: LiveGameweekInput | null) {
  const [snapshot, setSnapshot] = useState<LiveGameweekSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = input ? `${input.gameweek.id}:${input.kickoffAt}:${input.lineup.starters.join()}:${input.lineup.captainId}:${input.chip ?? ""}` : null;

  useEffect(() => {
    if (!input) return;
    return subscribeLiveGameweek(input, setSnapshot, setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return {
    snapshot,
    error,
    retry: () => {
      setError(null);
      setSnapshot(null);
      setNonce((n) => n + 1);
    },
  };
}
