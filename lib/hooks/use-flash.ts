"use client";

import { useState } from "react";

/**
 * Detects changes in a number during render (no effects, no timers).
 * Returns a direction and a key; render an element keyed by `key` that
 * fades out on its own to get a flash.
 */
export function useFlash(value: number) {
  const [prev, setPrev] = useState(value);
  const [flash, setFlash] = useState<{ dir: 1 | -1; key: number; delta: number } | null>(null);
  if (value !== prev) {
    setPrev(value);
    setFlash((f) => ({ dir: value > prev ? 1 : -1, key: (f?.key ?? 0) + 1, delta: value - prev }));
  }
  return flash;
}
