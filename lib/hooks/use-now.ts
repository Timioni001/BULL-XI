"use client";

import { useSyncExternalStore } from "react";

let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let align: ReturnType<typeof setTimeout> | undefined;

function emit() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) {
    now = Date.now();
    align = setTimeout(() => {
      emit();
      timer = setInterval(emit, 1000);
    }, 1000 - (Date.now() % 1000));
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      clearTimeout(align);
      clearInterval(timer);
    }
  };
}

/** Wall clock that ticks every second. Returns 0 until mounted (server render). */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now, () => 0);
}
