"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A 3D tunnel of cards. Two streams start small at the centre and fly out to
 * the edges, growing and turning to face the middle, like walking down a
 * gallery. Transforms are written straight to the DOM each frame, so React
 * never re-renders while it runs. Pauses off screen and for reduced motion.
 */
export function Corridor({ cards, perSide = 5, speed = 0.014, className }: { cards: React.ReactNode[]; perSide?: number; speed?: number; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const total = perSide * 2;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let t = 0.37;
    let last = performance.now();

    const place = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      const mobile = W < 640;
      const base = mobile ? Math.min(W * 0.44, 190) : Math.min(W * 0.21, 320);
      // Phones show fewer cards so the tunnel stays calm.
      const count = mobile ? Math.max(3, perSide - 1) : perSide;
      for (let i = 0; i < total; i++) {
        const node = items.current[i];
        if (!node) continue;
        const side = i % 2 === 0 ? -1 : 1;
        const k = Math.floor(i / 2);
        if (k >= count) {
          node.style.opacity = "0";
          continue;
        }
        const v = (((k / count + t + (side > 0 ? 0.5 / count : 0)) % 1) + 1) % 1; // 0 = far centre, 1 = near edge
        const scale = 0.24 + 1.04 * v * v;
        const x = side * (base * 0.075 + W * (mobile ? 0.52 : 0.48) * Math.pow(v, 1.4));
        const rot = -side * 64 * Math.pow(v, 0.85);
        const y = (mobile ? 0.04 : 0) * H;
        const fade = Math.min(1, v / 0.03) * Math.min(1, (1 - v) / 0.08);
        node.style.width = `${base}px`;
        node.style.height = `${base * 1.25}px`;
        node.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) perspective(${(base * 3.4).toFixed(0)}px) rotateY(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        node.style.opacity = fade.toFixed(3);
        node.style.zIndex = String(Math.round(v * 100));
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      t = (t + dt * speed) % 1;
      place();
      raf = requestAnimationFrame(frame);
    };

    // Start moving only after the page has loaded and gone idle, so the
    // headline paints first. The first frame is placed straight away.
    let started = false;
    const start = () => {
      started = true;
      if (visible && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const kick = () => (w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 800));
    if (document.readyState === "complete") kick();
    else window.addEventListener("load", kick, { once: true });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && started && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(el);
    const ro = new ResizeObserver(place);
    ro.observe(el);
    place();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", kick);
      io.disconnect();
      ro.disconnect();
    };
  }, [perSide, speed, total]);

  return (
    <div ref={root} aria-hidden className={cn("overflow-hidden", className)}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          ref={(n) => {
            items.current[i] = n;
          }}
          className="absolute left-1/2 top-1/2 overflow-hidden rounded-[18px] opacity-0 shadow-[0_24px_40px_-28px_rgb(0_0_0/0.5)] will-change-transform"
          style={{ transformOrigin: "50% 50%" }}
        >
          {cards[i % cards.length]}
        </div>
      ))}
    </div>
  );
}
