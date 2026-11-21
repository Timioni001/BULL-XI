"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const LivePreview = dynamic(() => import("./live-preview").then((m) => m.LivePreview), { ssr: false, loading: () => <div className="h-full bg-background" /> });

/**
 * Mount the live preview only when it's mostly on screen and the browser is
 * idle, so the headline paints first and phones don't pay for it until they scroll.
 */
export function DeferredPreview({ bare, fallback }: { bare?: boolean; fallback?: React.ReactNode } = {}) {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (w.requestIdleCallback) w.requestIdleCallback(() => setReady(true), { timeout: 1500 });
        else setTimeout(() => setReady(true), 300);
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={bare ? "h-full" : undefined}>{ready ? <LivePreview bare={bare} /> : (fallback ?? (bare ? <div className="h-full bg-background" /> : <Frame />))}</div>;
}

function Frame() {
  return (
    <div aria-hidden className="noise relative mx-auto w-full max-w-[380px] rounded-[36px] bg-surface-1 p-3 ring-1 ring-inset ring-hairline">
      <div className="h-[52px]" />
      <div className="mb-3 h-[84px] rounded-3xl bg-[linear-gradient(160deg,#2a1d18,#111112_60%)] ring-1 ring-inset ring-brand/30" />
      <div className="pitch-diagonal h-[388px] rounded-[28px] ring-1 ring-inset ring-hairline" />
    </div>
  );
}
