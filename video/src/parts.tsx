import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import { C, F, ease } from "./theme";

/** 0 -> 1 from `at` over `dur` frames, eased. */
export function useIn(at: number, dur = 18) {
  const f = useCurrentFrame();
  return interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

/** 1 -> 0 near the end of a scene (frames from the end). */
export function useOut(total: number, dur = 12) {
  const f = useCurrentFrame();
  return interpolate(f, [total - dur, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/* ------------------------------------------------------------------ texture */

/** Film grain: animated SVG noise. */
export function Grain({ opacity = 0.08 }: { opacity?: number }) {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 50;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width="100%" height="100%">
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
}

export function Vignette({ strength = 0.55 }: { strength?: number }) {
  return <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,${strength}) 100%)` }} />;
}

/** Dotted canvas like a design tool. */
export function DotGrid({ color = "rgba(0,0,0,0.16)", gap = 46 }: { color?: string; gap?: number }) {
  return <AbsoluteFill style={{ backgroundImage: `radial-gradient(${color} 1.6px, transparent 1.8px)`, backgroundSize: `${gap}px ${gap}px`, backgroundPosition: "12px 12px" }} />;
}

/* ------------------------------------------------------------------ type */

/** Small monospaced label, e.g. "01 · PICK". */
export function Label({ children, at = 0, color = C.muted, style }: { children: React.ReactNode; at?: number; color?: string; style?: React.CSSProperties }) {
  const p = useIn(at, 16);
  return (
    <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", color, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, ...style }}>
      {children}
    </div>
  );
}

/** Light sans headline, one line at a time sliding up out of a mask. */
export function Headline({ lines, at = 0, size = 112, color, stagger = 8, weight = 300, style }: { lines: { text: string; color?: string }[]; at?: number; size?: number; color: string; stagger?: number; weight?: number; style?: React.CSSProperties }) {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.045em", color, ...style }}>
      {lines.map((l, i) => {
        const p = interpolate(f, [at + i * stagger, at + i * stagger + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
            <div style={{ transform: `translateY(${(1 - p) * 105}%)`, color: l.color ?? color }}>{l.text}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Serif words that blur in one by one at their own spots (Anthropic-style). */
export function SerifWords({ words, size = 92, color }: { words: { text: string; at: number; x: number; y: number; size?: number; italic?: boolean }[]; size?: number; color: string }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {words.map((w, i) => {
        const p = interpolate(f, [w.at, w.at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: w.x,
              top: w.y,
              transform: "translate(-50%, -50%)",
              fontFamily: F.serif,
              fontStyle: w.italic ? "italic" : "normal",
              fontSize: w.size ?? size,
              color,
              whiteSpace: "nowrap",
              opacity: p,
              filter: `blur(${(1 - p) * 14}px)`,
              letterSpacing: "-0.01em",
            }}
          >
            {w.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Number that counts up, tabular. */
export function Counter({ from, to, at, dur = 30, prefix = "", suffix = "", decimals = 0, style }: { from: number; to: number; at: number; dur?: number; prefix?: string; suffix?: string; decimals?: number; style?: React.CSSProperties }) {
  const f = useCurrentFrame();
  const v = interpolate(f, [at, at + dur], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
}

/* ------------------------------------------------------------------ iPhone */

const SCREEN_W = 393;
const SCREEN_H = 852;
const STATUS_H = 54;

function StatusBar({ scale, dark }: { scale: number; dark?: boolean }) {
  const ink = dark ? "#fff" : "#000";
  return (
    <div style={{ position: "absolute", inset: 0, height: STATUS_H * scale, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${30 * scale}px 0 ${50 * scale}px`, paddingTop: 4 * scale, fontFamily: F.sans, fontWeight: 600, fontSize: 17 * scale, color: ink, letterSpacing: "-0.01em" }}>
      <span>9:41</span>
      <svg width={78 * scale} height={14 * scale} viewBox="0 0 78 14" fill={ink}>
        {/* signal */}
        <rect x="0" y="9" width="3.2" height="4.5" rx="1" />
        <rect x="4.8" y="6.5" width="3.2" height="7" rx="1" />
        <rect x="9.6" y="4" width="3.2" height="9.5" rx="1" />
        <rect x="14.4" y="1.5" width="3.2" height="12" rx="1" />
        {/* wifi */}
        <path d="M31 3.2a11 11 0 0 1 14.6 0l-1.5 1.6a8.8 8.8 0 0 0-11.6 0z M33.6 6a7.2 7.2 0 0 1 9.4 0l-1.6 1.6a5 5 0 0 0-6.2 0z M36.2 8.8a3.4 3.4 0 0 1 4.2 0L38.3 11z" />
        {/* battery */}
        <rect x="52.5" y="1" width="22" height="12" rx="3.6" fill="none" stroke={ink} strokeOpacity="0.4" strokeWidth="1" />
        <rect x="54.3" y="2.8" width="18.4" height="8.4" rx="2.2" />
        <path d="M76 5v4.2a2.2 2.2 0 0 0 0-4.2z" fillOpacity="0.45" />
      </svg>
    </div>
  );
}

/**
 * iPhone 15 Pro: titanium frame, Dynamic Island, status bar, and an app clip
 * (recorded at 393x798, the screen below the status bar).
 */
export function IPhone({ clip, width = 430, startFrom = 0, playbackRate = 1, screenBg = C.light, still, style }: { clip?: string; width?: number; startFrom?: number; playbackRate?: number; screenBg?: string; still?: string; style?: React.CSSProperties }) {
  const s = width / SCREEN_W;
  const bezel = 13 * s;
  const W = width + bezel * 2;
  const H = SCREEN_H * s + bezel * 2;
  return (
    <div style={{ position: "relative", width: W, height: H, ...style }}>
      {/* side buttons */}
      {[
        [-3.2, 118, 30],
        [-3.2, 178, 60],
        [-3.2, 250, 60],
      ].map(([x, y, h], i) => (
        <div key={i} style={{ position: "absolute", left: x * s, top: y * s, width: 4 * s, height: h * s, borderRadius: 2 * s, background: "linear-gradient(90deg,#55565a,#2a2b2e)" }} />
      ))}
      <div style={{ position: "absolute", right: -3.2 * s, top: 205 * s, width: 4 * s, height: 96 * s, borderRadius: 2 * s, background: "linear-gradient(270deg,#55565a,#2a2b2e)" }} />
      {/* frame */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 68 * s,
          background: "linear-gradient(145deg,#6b6c70 0%,#2c2d30 18%,#1a1a1c 50%,#3a3b3f 82%,#77787c 100%)",
          boxShadow: `0 ${60 * s}px ${120 * s}px -${30 * s}px rgba(0,0,0,0.55), 0 ${18 * s}px ${40 * s}px -${12 * s}px rgba(0,0,0,0.35)`,
          padding: 2.2 * s,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: 66 * s, background: "#050505", padding: bezel - 2.2 * s }}>
          {/* screen */}
          <div style={{ position: "relative", width: width, height: SCREEN_H * s, borderRadius: 55 * s, overflow: "hidden", background: screenBg }}>
            <div style={{ position: "absolute", left: 0, top: STATUS_H * s, width: width, height: (SCREEN_H - STATUS_H) * s, overflow: "hidden" }}>
              {clip && <OffthreadVideo src={staticFile(`clips/${clip}.mp4`)} startFrom={startFrom} playbackRate={playbackRate} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
              {still && <Img src={staticFile(still)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
            </div>
            <StatusBar scale={s} />
            {/* Dynamic Island */}
            <div style={{ position: "absolute", left: "50%", top: 11 * s, width: 126 * s, height: 37 * s, marginLeft: -63 * s, borderRadius: 20 * s, background: "#000" }}>
              <div style={{ position: "absolute", right: 14 * s, top: 12 * s, width: 13 * s, height: 13 * s, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #2b3550, #0a0c12 70%)" }} />
            </div>
            {/* glass */}
            <div style={{ position: "absolute", inset: 0, borderRadius: 55 * s, background: "linear-gradient(125deg, rgba(255,255,255,0.10) 0%, transparent 28%)", pointerEvents: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ audio orb */

/**
 * Dotted halftone orb that breathes with the soundtrack: low frequencies in the
 * middle, highs at the rim; warm core, cool edge.
 */
export function Orb({ size = 520, audio, energy = 1 }: { size?: number; audio: string; energy?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = useAudioData(staticFile(audio));
  const bands = data ? visualizeAudio({ fps, frame, audioData: data, numberOfSamples: 32, optimizeFor: "speed" }) : new Array(32).fill(0);
  const level = bands.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  const R = size / 2;
  const gap = size / 38;
  const dots: React.ReactNode[] = [];
  const breathe = 1 + 0.035 * Math.sin(frame / 18);
  for (let y = -R; y <= R; y += gap) {
    for (let x = -R; x <= R; x += gap) {
      const d = Math.hypot(x, y) / R;
      if (d > 1) continue;
      const band = Math.min(31, Math.floor(d * 20));
      const a = Math.min(1, (bands[band] ?? 0) * 3.2 * energy);
      const jitter = random(`${x}:${y}`) * 0.25;
      const r = gap * 0.46 * Math.pow(1 - d, 0.28) * (0.55 + 1.1 * a + 0.6 * level * energy + jitter * 0.3);
      // warm core -> teal -> deep blue rim
      const hue = interpolate(d + (1 - a) * 0.08, [0, 0.35, 0.7, 1], [26, 36, 168, 228], { extrapolateRight: "clamp" });
      const light = interpolate(d, [0, 0.5, 1], [66, 58, 50]);
      dots.push(<circle key={`${x}:${y}`} cx={x} cy={y} r={Math.max(0.3, r)} fill={`hsl(${hue} 85% ${light}%)`} opacity={0.55 + 0.45 * (1 - d * 0.5)} />);
    }
  }
  return (
    <svg width={size * 1.2} height={size * 1.2} viewBox={`${-R * 1.2} ${-R * 1.2} ${size * 1.2} ${size * 1.2}`} style={{ transform: `scale(${breathe + level * 0.15 * energy})`, filter: `drop-shadow(0 0 ${30 + level * 80}px rgba(255,140,60,${0.15 + level * 0.35}))` }}>
      {dots}
    </svg>
  );
}

/* ------------------------------------------------------------------ stock tiles */

const DARK = new Set(["AMZN", "GME", "MARA", "QQQ", "UBER", "UNH", "V"]);
const FULL = new Set(["AAPL", "CRCL", "DIA", "IWM", "TLT"]);

/** Company logo tile, same rules as the app (dark tiles for light logos). */
export function StockTile({ ticker, size = 84, style }: { ticker: string; size?: number; style?: React.CSSProperties }) {
  const dark = DARK.has(ticker);
  const full = FULL.has(ticker);
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.26, background: dark ? "#161618" : "#fff", boxShadow: `0 10px 30px -10px rgba(0,0,0,0.35), inset 0 0 0 1px ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`, overflow: "hidden", display: "grid", placeItems: "center", ...style }}>
      <Img src={staticFile(`img/logos/${ticker}.webp`)} style={{ width: full ? "100%" : "66%", height: full ? "100%" : "66%", objectFit: full ? "cover" : "contain" }} />
    </div>
  );
}

export function Pill({ children, dark, glow, style }: { children: React.ReactNode; dark?: boolean; glow?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: "26px 46px",
        borderRadius: 999,
        fontFamily: F.sans,
        fontSize: 40,
        fontWeight: 400,
        letterSpacing: "-0.02em",
        background: dark ? "#0E0E0E" : "#fff",
        color: dark ? "#fff" : "#111",
        boxShadow: `${glow ? `0 0 0 3px ${glow}, 0 0 40px ${glow}66,` : ""} 0 20px 40px -18px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,${dark ? 0 : 0.08})`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
