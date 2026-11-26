import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import timeline from "./timeline.json";
import clips from "./clips.json";
import { C, F, ease, easeInOut } from "./theme";
import { scene, spoken } from "./timing";
import { Counter, DotGrid, Grain, Headline, IPhone, Label, Orb, Pill, SerifWords, StockTile, Vignette, useIn, useOut } from "./parts";

const MIX = "audio/mix.wav";

/** Playback rate so a clip covers `frames` (slower, never faster than real time). */
function fit(clip: keyof typeof clips, frames: number, from = 0) {
  const secs = clips[clip] - from;
  return Math.min(1, Math.max(0.6, secs / (frames / timeline.fps)));
}

/** Fades a scene's content out over its last frames. */
function Out({ id, children }: { id: string; children: React.ReactNode }) {
  const o = useOut(scene(id).frames, 10);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
}

function Float({ children, amp = 10, speed = 40, phase = 0, style }: { children: React.ReactNode; amp?: number; speed?: number; phase?: number; style?: React.CSSProperties }) {
  const f = useCurrentFrame();
  return <div style={{ transform: `translateY(${Math.sin(f / speed + phase) * amp}px)`, ...style }}>{children}</div>;
}

/* ------------------------------------------------------------------ 1. open */

function Wordmark({ color, at = 0, size = 64 }: { color: string; at?: number; size?: number }) {
  const f = useCurrentFrame();
  const letters = "BULL-XI".split("");
  const shown = interpolate(f, [at, at + 22], [0, letters.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", fontFamily: F.sans, fontWeight: 700, fontSize: size, letterSpacing: "0.12em", color }}>
      {letters.map((l, i) => {
        const vis = shown - i;
        if (vis <= 0) return null;
        // the newest letter arrives as a solid block first (like a cursor)
        if (vis < 0.8 && shown < letters.length) return <span key={i} style={{ display: "inline-block", width: size * 0.62, height: size * 0.62, background: color, transform: "skewX(-14deg)", margin: `0 ${size * 0.06}px` }} />;
        return <span key={i}>{l}</span>;
      })}
    </div>
  );
}

function Open() {
  const id = "open";
  const f = useCurrentFrame();
  const markOut = interpolate(f, [30, 42], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <AbsoluteFill style={{ display: "grid", placeItems: "center", opacity: markOut }}>
        <Wordmark color={C.creamInk} at={2} />
      </AbsoluteFill>
      <Out id={id}>
        <SerifWords
          color={C.creamInk}
          size={96}
          words={[
            { text: "Every weekend,", at: spoken(id, "Every weekend"), x: 640, y: 330 },
            { text: "millions", at: spoken(id, "millions"), x: 1330, y: 300, italic: true },
            { text: "pick a team,", at: spoken(id, "pick a team"), x: 560, y: 560 },
            { text: "wear the armband,", at: spoken(id, "wear the armband"), x: 1260, y: 600 },
            { text: "and argue", at: spoken(id, "and argue"), x: 760, y: 800 },
            { text: "all week.", at: spoken(id, "all week"), x: 1290, y: 820, italic: true },
          ]}
        />
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
          <Label at={60} color="rgba(31,30,28,0.55)" style={{ fontSize: 20 }}>{"\\ every-weekend \\"}</Label>
        </AbsoluteFill>
      </Out>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 2. question */

function Question() {
  const id = "question";
  const s = scene(id);
  const orbIn = useIn(0, 30);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(90% 80% at 50% 50%, #17140f 0%, #070707 70%)" }}>
      <AbsoluteFill style={{ display: "grid", placeItems: "center", opacity: orbIn, transform: `scale(${0.9 + orbIn * 0.1})` }}>
        <Sequence from={-s.start} layout="none">
          <Orb size={600} audio={MIX} energy={1.4} />
        </Sequence>
      </AbsoluteFill>
      <Out id={id}>
        <SerifWords
          color="#F3EFE6"
          size={92}
          words={[
            { text: "Markets", at: spoken(id, "markets"), x: 420, y: 250 },
            { text: "never close.", at: spoken(id, "never close"), x: 1500, y: 250, italic: true },
            { text: "What if stocks", at: spoken(id, "What if"), x: 620, y: 860 },
            { text: "were the players?", at: spoken(id, "were the players"), x: 1320, y: 860, italic: true },
          ]}
        />
      </Out>
      <Vignette strength={0.7} />
      <Grain opacity={0.14} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 3. title */

function Title() {
  const id = "title";
  const f = useCurrentFrame();
  const p = useIn(0, 26);
  const glow = interpolate(f, [0, 20, 90], [0, 1, 0.5], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Out id={id}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 34 }}>
          <div style={{ transform: `scale(${0.82 + p * 0.18})`, opacity: p, filter: `drop-shadow(0 0 ${60 * glow}px rgba(255,91,31,${0.55 * glow}))` }}>
            <Img src={staticFile("img/logo-white.png")} style={{ width: 230, height: 230 }} />
          </div>
          <Wordmark color="#fff" at={8} size={58} />
          <div style={{ opacity: useIn(spoken(id, "Fantasy football"), 18) }}>
            <Headline at={spoken(id, "Fantasy football")} size={64} color="rgba(255,255,255,0.86)" lines={[{ text: "Fantasy football for real stocks." }]} style={{ textAlign: "center" }} />
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
          <Label at={30} color="rgba(255,255,255,0.45)" style={{ fontSize: 20 }}>{"\\ solana · magicblock \\"}</Label>
        </AbsoluteFill>
      </Out>
      <Grain opacity={0.12} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 4. squad */

function Squad() {
  const id = "squad";
  const s = scene(id);
  const f = useCurrentFrame();
  const ph = useIn(0, 28);
  return (
    <AbsoluteFill style={{ background: C.light }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 170, top: 330 }}>
          <Label at={4}>01 · Pick</Label>
          <div style={{ height: 26 }} />
          <Headline at={spoken(id, "Pick fifteen")} color={C.lightInk} lines={[{ text: "Fifteen stocks." }, { text: "One tap.", color: "#9a9a96" }]} stagger={spoken(id, "One tap") - spoken(id, "Pick fifteen")} />
          <div style={{ marginTop: 40, fontFamily: F.mono, fontSize: 24, color: "#77776f", letterSpacing: "0.04em", opacity: useIn(spoken(id, "hundred credits"), 16) }}>100 credits · 2 ETF · 5 Blue Chip · 5 Growth · 3 High Risk</div>
        </div>
        <div style={{ position: "absolute", left: 1150, top: 70, perspective: 2200 }}>
          <div style={{ transform: `translateY(${(1 - ph) * 140}px) rotateY(-16deg) rotateX(4deg) rotateZ(2deg)`, opacity: ph, transformStyle: "preserve-3d" }}>
            <Float amp={8}>
              <IPhone clip="squad" width={400} playbackRate={fit("squad", s.frames)} />
            </Float>
          </div>
        </div>
        {[
          ["NVDA", 1040, 180, 0],
          ["TSLA", 1640, 300, 1.4],
          ["AAPL", 1060, 760, 2.2],
          ["COIN", 1670, 820, 0.7],
        ].map(([t, x, y, ph2], i) => {
          const p = interpolate(f, [10 + i * 5, 34 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          return (
            <div key={String(t)} style={{ position: "absolute", left: Number(x), top: Number(y), opacity: p, transform: `scale(${0.6 + 0.4 * p}) rotate(${(i % 2 ? 6 : -6) * p}deg)` }}>
              <Float amp={12} phase={Number(ph2)} speed={34}>
                <StockTile ticker={String(t)} size={92} />
              </Float>
            </div>
          );
        })}
      </Out>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 5. pick */

function Pick() {
  const id = "pick";
  const s = scene(id);
  const ph = useIn(0, 26);
  const badge = useIn(spoken(id, "captain"), 14);
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 250, top: 70, perspective: 2200 }}>
          <div style={{ transform: `translateX(${(1 - ph) * -120}px) rotateY(16deg) rotateX(3deg) rotateZ(-2deg)`, opacity: ph }}>
            <Float amp={8}>
              <IPhone clip="pick" width={400} playbackRate={fit("pick", s.frames)} />
            </Float>
          </div>
          <div style={{ position: "absolute", left: 420, top: 150, width: 96, height: 96, borderRadius: "50%", background: C.gold, color: "#1b1300", display: "grid", placeItems: "center", fontFamily: F.sans, fontWeight: 800, fontSize: 52, transform: `scale(${badge})`, boxShadow: "0 0 60px rgba(245,196,81,0.55)" }}>C</div>
        </div>
        <div style={{ position: "absolute", left: 1000, top: 360 }}>
          <Label at={4} color="rgba(255,255,255,0.5)">03 · Captain</Label>
          <div style={{ height: 26 }} />
          <Headline at={spoken(id, "Choose")} color="#fff" lines={[{ text: "Your captain" }, { text: "scores double.", color: C.gold }]} stagger={spoken(id, "captain scores") - spoken(id, "Choose")} />
        </div>
      </Out>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 6. seal */

type P = [number, number];
function bez(a: P, b: P, c: P, d: P, t: number): P {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
}
function Wire({ from, to, pulseAt, color, stopAt = 1, dim }: { from: P; to: P; pulseAt: number; color: string; stopAt?: number; dim?: boolean }) {
  const f = useCurrentFrame();
  const mx = (from[0] + to[0]) / 2;
  const b: P = [mx, from[1]];
  const c: P = [mx, to[1]];
  const d = `M${from[0]},${from[1]} C${b[0]},${b[1]} ${c[0]},${c[1]} ${to[0]},${to[1]}`;
  const t = interpolate(f, [pulseAt, pulseAt + 40], [0, stopAt], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const seg = Array.from({ length: 14 }, (_, i) => bez(from, b, c, to, Math.max(0, t - 0.12 + (i / 13) * 0.12)));
  const on = f >= pulseAt && f <= pulseAt + 60;
  return (
    <g>
      <path d={d} fill="none" stroke={dim ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.3)"} strokeWidth={3} strokeDasharray="10 12" />
      {on && <polyline points={seg.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${color})` }} />}
    </g>
  );
}

function Seal() {
  const id = "seal";
  const s = scene(id);
  const f = useCurrentFrame();
  const lockAt = spoken(id, "sealed inside");
  const rivalsAt = spoken(id, "rivals");
  const n1 = useIn(4, 16);
  const n2 = useIn(lockAt - 10, 16);
  const n3 = useIn(rivalsAt - 14, 16);
  const blocked = interpolate(f, [rivalsAt + 26, rivalsAt + 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ph = useIn(0, 26);
  return (
    <AbsoluteFill style={{ background: C.light }}>
      <DotGrid />
      <Out id={id}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <Wire from={[560, 470]} to={[860, 250]} pulseAt={lockAt} color={C.bull} />
          <Wire from={[560, 470]} to={[860, 690]} pulseAt={rivalsAt} color={C.bear} stopAt={0.55} dim />
        </svg>
        <div style={{ position: "absolute", left: 150, top: 432, opacity: n1, transform: `scale(${0.9 + 0.1 * n1})` }}>
          <Pill dark>Your squad</Pill>
        </div>
        <div style={{ position: "absolute", left: 860, top: 205, opacity: n2, transform: `scale(${0.9 + 0.1 * n2})` }}>
          <Pill dark glow={C.bull}>
            <svg width="34" height="38" viewBox="0 0 24 26" fill="none" stroke="#fff" strokeWidth="2.2"><rect x="3" y="11" width="18" height="13" rx="3" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Private rollup
          </Pill>
          <div style={{ marginTop: 16, marginLeft: 30, fontFamily: F.mono, fontSize: 20, letterSpacing: "0.12em", color: "#6f6f6a", textTransform: "uppercase" }}>MagicBlock TEE · members only</div>
        </div>
        <div style={{ position: "absolute", left: 860, top: 645, opacity: n3 * (1 - 0.45 * blocked), transform: `scale(${0.9 + 0.1 * n3})` }}>
          <Pill>Rivals</Pill>
          <div style={{ marginTop: 16, marginLeft: 30, fontFamily: F.mono, fontSize: 20, letterSpacing: "0.12em", color: C.bear, textTransform: "uppercase", opacity: blocked }}>Can't read it until kickoff</div>
        </div>
        <div style={{ position: "absolute", left: 705, top: 580, fontSize: 56, color: C.bear, fontFamily: F.sans, fontWeight: 300, opacity: blocked, transform: `scale(${0.6 + 0.4 * blocked})` }}>✕</div>
        <div style={{ position: "absolute", left: 150, top: 860 }}>
          <Label at={4}>04 · Seal</Label>
          <div style={{ height: 18 }} />
          <Headline at={spoken(id, "Lock it")} size={84} color={C.lightInk} lines={[{ text: "Sealed until kickoff." }]} />
        </div>
        <div style={{ position: "absolute", left: 1420, top: 70, perspective: 2200 }}>
          <div style={{ transform: `translateY(${(1 - ph) * 120}px) rotateY(-14deg) rotateZ(2deg)`, opacity: ph }}>
            <Float amp={7}>
              <IPhone clip="lock" width={400} startFrom={36} playbackRate={1.5} />
            </Float>
          </div>
        </div>
      </Out>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 7. points */

function Points() {
  const id = "points";
  const f = useCurrentFrame();
  const numAt = spoken(id, "Up one point");
  const twapAt = spoken(id, "time-weighted");
  const draw = interpolate(f, [twapAt - 10, twapAt + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  // a gentle rising price line
  const pts = Array.from({ length: 60 }, (_, i) => [i * 13, 150 - i * 1.6 - Math.sin(i * 0.7) * 14 - Math.sin(i * 0.23) * 10]);
  const shown = pts.slice(0, Math.max(2, Math.round(draw * pts.length)));
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 150, top: 380 }}>
          <Label at={4} color="rgba(255,255,255,0.5)">05 · Score</Label>
          <div style={{ height: 26 }} />
          <Headline at={numAt - 6} color="#fff" lines={[{ text: "Up 1.8%." }, { text: "18 points.", color: C.bull }]} stagger={18} />
          <div style={{ marginTop: 44, fontFamily: F.mono, fontSize: 26, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em", opacity: useIn(numAt + 30, 16) }}>
            price move × 10 · captain × 2 · capped at 50
          </div>
        </div>
        <div style={{ position: "absolute", right: 170, top: 250, textAlign: "right" }}>
          <div style={{ fontFamily: F.sans, fontWeight: 200, fontSize: 360, lineHeight: 1, letterSpacing: "-0.06em", color: C.bull, opacity: useIn(numAt, 10) }}>
            <Counter from={0} to={18} at={numAt} dur={34} prefix="+" />
          </div>
          <svg width={780} height={190} style={{ marginTop: 20, overflow: "visible" }}>
            <polyline points={shown.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.bull} strokeWidth={4} strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 10px rgba(22,199,132,0.6))" }} />
            {draw > 0.02 && <circle cx={shown.at(-1)![0]} cy={shown.at(-1)![1]} r={9} fill={C.bull} />}
          </svg>
          <div style={{ marginTop: 22, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", opacity: useIn(twapAt, 14) }}>
            TWAP · written onchain every minute
          </div>
        </div>
      </Out>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 8. golden */

function Golden() {
  const id = "golden";
  const s = scene(id);
  const f = useCurrentFrame();
  const drawAt = spoken(id, "draws a golden");
  const p = useIn(drawAt, 18);
  const ph = useIn(0, 26);
  const spin = interpolate(f, [drawAt, drawAt + 40], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(70% 70% at 70% 50%, #1d1708 0%, #0b0b0b 60%)" }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 150, top: 340 }}>
          <Label at={4} color="rgba(255,255,255,0.5)">06 · Golden stock</Label>
          <div style={{ height: 26 }} />
          <Headline at={spoken(id, "At kickoff")} color="#fff" lines={[{ text: "Drawn by VRF." }, { text: "Double points.", color: C.gold }]} stagger={spoken(id, "scores double") - spoken(id, "At kickoff")} />
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 48, opacity: p }}>
            <div style={{ position: "relative" }}>
              <StockTile ticker="UNH" size={86} style={{ boxShadow: `0 0 0 4px ${C.gold}, 0 0 50px rgba(245,196,81,0.6)` }} />
              <div style={{ position: "absolute", right: -16, top: -16, width: 40, height: 40, borderRadius: "50%", background: C.gold, display: "grid", placeItems: "center", fontSize: 24, transform: `rotate(${spin}deg)` }}>★</div>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              UNHx · drawn by MagicBlock VRF
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>devnet test gameweek · Nov 24</span>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 1180, top: 70, perspective: 2200 }}>
          <div style={{ transform: `translateY(${(1 - ph) * 120}px) rotateY(-12deg) rotateZ(1.5deg)`, opacity: ph }}>
            <Float amp={8}>
              <IPhone clip="live" width={400} playbackRate={fit("live", s.frames)} />
            </Float>
          </div>
        </div>
      </Out>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 9. hourly */

function Hourly() {
  const id = "hourly";
  const s = scene(id);
  const f = useCurrentFrame();
  const spread = interpolate(f, [0, s.frames], [0, 1], { easing: easeInOut });
  const p = useIn(0, 24);
  return (
    <AbsoluteFill style={{ background: C.light }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 120 - spread * 60, top: 90, perspective: 2000, opacity: p }}>
          <div style={{ transform: `rotateY(${22 - spread * 8}deg) rotateZ(-4deg) scale(0.9)` }}>
            <IPhone clip="league" width={380} playbackRate={fit("league", s.frames)} />
          </div>
        </div>
        <div style={{ position: "absolute", right: 120 - spread * 60, top: 110, perspective: 2000, opacity: p }}>
          <div style={{ transform: `rotateY(${-22 + spread * 8}deg) rotateZ(4deg) scale(0.9)` }}>
            <IPhone clip="proof" width={380} playbackRate={fit("proof", s.frames)} />
          </div>
        </div>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <Label at={4}>07 · Live 24/7</Label>
          <div style={{ height: 26 }} />
          <Headline at={spoken(id, "A new gameweek")} color={C.lightInk} size={104} lines={[{ text: "Every hour." }, { text: "Every day.", color: "#9a9a96" }]} stagger={14} style={{ textAlign: "center" }} />
          <div style={{ marginTop: 40, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.14em", textTransform: "uppercase", color: "#77776f", opacity: useIn(spoken(id, "cranks"), 14) }}>
            MagicBlock cranks run every step
          </div>
        </AbsoluteFill>
      </Out>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ thesis */

const REASONS = [
  { t: "NVDA", role: "Midfield", about: "Designs the graphics chips used to train most AI models." },
  { t: "SPY", role: "Keeper", about: "Tracks the S&P 500. One holding buys a whole basket." },
  { t: "GLD", role: "Keeper", about: "Tracks gold. Often moves differently from stocks." },
];

function Thesis() {
  const id = "thesis";
  const s = scene(id);
  const f = useCurrentFrame();
  const ph = useIn(0, 26);
  return (
    <AbsoluteFill style={{ background: C.light }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 230, top: 70, perspective: 2200 }}>
          <div style={{ transform: `translateX(${(1 - ph) * -120}px) rotateY(16deg) rotateZ(-2deg)`, opacity: ph }}>
            <Float amp={8}>
              <IPhone clip="thesis" width={400} playbackRate={fit("thesis", s.frames)} />
            </Float>
          </div>
        </div>
        <div style={{ position: "absolute", left: 960, top: 190 }}>
          <Label at={4}>02 · Why this squad</Label>
          <div style={{ height: 26 }} />
          <Headline at={spoken(id, "Auto-pick explains")} color={C.lightInk} lines={[{ text: "Every pick," }, { text: "explained.", color: "#9a9a96" }]} stagger={12} />
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16, width: 760 }}>
            {REASONS.map((r, i) => {
              const at = spoken(id, "real price") - 30 + i * 12;
              const p = interpolate(f, [at, at + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
              return (
                <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 22, padding: "20px 24px", borderRadius: 28, background: "#fff", boxShadow: "0 20px 40px -24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.06)", opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
                  <StockTile ticker={r.t} size={64} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: F.sans, fontWeight: 600, fontSize: 30, color: C.lightInk }}>
                      {r.t}x
                      <span style={{ fontFamily: F.mono, fontSize: 16, letterSpacing: "0.14em", textTransform: "uppercase", color: "#77776f", background: "#efefec", borderRadius: 999, padding: "4px 12px" }}>{r.role}</span>
                    </div>
                    <div style={{ fontFamily: F.sans, fontWeight: 300, fontSize: 24, color: "#55554f", marginTop: 4 }}>{r.about}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 26, fontFamily: F.mono, fontSize: 20, letterSpacing: "0.06em", color: "#77776f", opacity: useIn(spoken(id, "this week"), 14) }}>today and 1-week moves from live market data · not financial advice</div>
        </div>
      </Out>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ pro */

function Pro() {
  const id = "pro";
  const s = scene(id);
  const ph = useIn(0, 26);
  const lock = useIn(spoken(id, "kept private"), 16);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(70% 70% at 30% 50%, #241a0c 0%, #0b0b0b 62%)" }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 150, top: 300 }}>
          <Label at={4} color="rgba(255,255,255,0.5)">08 · Pro</Label>
          <div style={{ height: 26 }} />
          <Headline at={spoken(id, "Go Pro")} color="#fff" lines={[{ text: "Your picks." }, { text: "Your investments.", color: C.gold }]} stagger={spoken(id, "become your investments") - spoken(id, "Go Pro")} />
          <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              [spoken(id, "split across"), "$1,000 test dollars, split equally across 15 stocks"],
              [spoken(id, "kept private"), "Private in MagicBlock's rollup. Only you can read it"],
              [spoken(id, "sell any time"), "Sell back to cash at the onchain price, any time"],
            ].map(([at, text]) => (
              <div key={String(text)} style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.mono, fontSize: 24, color: "rgba(255,255,255,0.75)", opacity: useIn(Number(at), 14) }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: C.gold }} /> {text}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", left: 1220, top: 70, perspective: 2200 }}>
          <div style={{ transform: `translateY(${(1 - ph) * 120}px) rotateY(-14deg) rotateZ(2deg)`, opacity: ph }}>
            <Float amp={8}>
              <IPhone clip="pro" width={400} playbackRate={Math.max(1, clips.pro / (s.frames / timeline.fps))} />
            </Float>
          </div>
          <div style={{ position: "absolute", left: -70, top: 140, opacity: lock, transform: `scale(${0.8 + 0.2 * lock})` }}>
            <Pill dark glow={C.bull} style={{ fontSize: 30, padding: "18px 30px" }}>
              <svg width="26" height="30" viewBox="0 0 24 26" fill="none" stroke="#fff" strokeWidth="2.2"><rect x="3" y="11" width="18" height="13" rx="3" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Private
            </Pill>
          </div>
        </div>
      </Out>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ pot */

function Pot() {
  const id = "pot";
  const s = scene(id);
  const f = useCurrentFrame();
  const feeAt = spoken(id, "Entry fees");
  const winAt = spoken(id, "winner");
  const potIn = useIn(feeAt, 16);
  const winIn = useIn(winAt - 4, 16);
  const ph = useIn(0, 26);
  const potValue = interpolate(f, [feeAt + 6, feeAt + 40], [0, 15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const friends: [string, number][] = [["Alice", 170], ["Bola", 470], ["You", 770]];
  return (
    <AbsoluteFill style={{ background: C.light }}>
      <DotGrid />
      <Out id={id}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {friends.map(([n, y], i) => (
            <Wire key={n} from={[330, y + 38]} to={[640, 470]} pulseAt={feeAt + i * 6} color={C.gold} />
          ))}
          <Wire from={[930, 470]} to={[1060, 470]} pulseAt={winAt} color={C.bull} />
        </svg>
        {friends.map(([n, y], i) => {
          const p = interpolate(f, [4 + i * 5, 20 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          return (
            <div key={n} style={{ position: "absolute", left: 120, top: y, opacity: p, transform: `scale(${0.9 + 0.1 * p})` }}>
              <Pill dark={n === "You"} style={{ fontSize: 32, padding: "20px 34px" }}>
                {n} <span style={{ fontFamily: F.mono, fontSize: 22, color: n === "You" ? "rgba(255,255,255,0.6)" : "#8a8a86" }}>$5</span>
              </Pill>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 640, top: 420, opacity: potIn, transform: `scale(${0.85 + 0.15 * potIn})` }}>
          <Pill dark glow={C.gold} style={{ fontSize: 36 }}>
            Pot <span style={{ color: C.gold, fontVariantNumeric: "tabular-nums" }}>${potValue.toFixed(0)}</span>
          </Pill>
        </div>
        <div style={{ position: "absolute", left: 1060, top: 420, opacity: winIn, transform: `scale(${0.85 + 0.15 * winIn})` }}>
          <Pill glow={C.bull} style={{ fontSize: 36 }}>
            <span style={{ color: C.gold }}>♛</span> Winner
          </Pill>
        </div>
        <div style={{ position: "absolute", left: 120, top: 900 }}>
          <Label at={4}>09 · Friends leagues</Label>
          <div style={{ height: 14 }} />
          <Headline at={spoken(id, "Play your friends")} size={76} color={C.lightInk} lines={[{ text: "Winner takes the pot." }]} />
        </div>
        <div style={{ position: "absolute", left: 1450, top: 70, perspective: 2200 }}>
          <div style={{ transform: `translateY(${(1 - ph) * 120}px) rotateY(-14deg) rotateZ(2deg)`, opacity: ph }}>
            <Float amp={7}>
              <IPhone clip="pot" width={400} playbackRate={Math.max(1, clips.pot / (s.frames / timeline.fps))} />
            </Float>
          </div>
        </div>
      </Out>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 10. record */

const RECORD = [
  { who: "MSFT", title: "Squad sealed in the TEE", sig: "4UjTYPPF…tJgtWhX", value: "Captain MSFTx" },
  { who: "bull", title: "Gameweek ticked by a MagicBlock crank", sig: "3iFAYo9b…vQCnr", value: "every 10 s" },
  { who: "UNH", title: "Golden stock drawn by VRF", sig: "4xMXxc1B…XCteA", value: "UNHx" },
  { who: "CRCL", title: "Squad revealed at kickoff", sig: "5YjTEhun…gEZZhPK", value: "Top: CRCLx" },
  { who: "bull", title: "Scored and committed to Solana", sig: "23fdvXkW…tFyFmi", value: "+7 pts" },
  { who: "bull", title: "Season record on Solana", sig: "961VZjtT…6v9yc", value: "1 gameweek" },
];

function Record() {
  const id = "record";
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Out id={id}>
        <div style={{ position: "absolute", left: 150, top: 380 }}>
          <Headline at={spoken(id, "At full time")} color="#fff" size={96} lines={[{ text: "Every result has" }, { text: "a public record." }]} />
          <div style={{ marginTop: 40, fontFamily: F.mono, fontSize: 20, letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", opacity: useIn(30, 16) }}>{"\\ solana devnet · end-to-end run · nov 24 \\"}</div>
        </div>
        <div style={{ position: "absolute", left: 1000, top: 150, width: 780 }}>
          {RECORD.map((r, i) => {
            const at = 10 + i * 16;
            const p = interpolate(f, [at, at + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
            const fadeLast = i === RECORD.length - 1 ? 0.4 : 1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, padding: "22px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: p * fadeLast, transform: `translateY(${(1 - p) * 24}px)` }}>
                {r.who === "bull" ? (
                  <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#1b1b1b", display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}>
                    <Img src={staticFile("img/logo-white.png")} style={{ width: 38, height: 38 }} />
                  </div>
                ) : (
                  <StockTile ticker={r.who} size={62} style={{ borderRadius: "50%" }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.sans, fontWeight: 300, fontSize: 34, color: "#fff", letterSpacing: "-0.02em" }}>{r.title}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: "0.1em", color: "rgba(255,255,255,0.42)", marginTop: 4 }}>{r.sig}</div>
                </div>
                <div style={{ fontFamily: F.sans, fontWeight: 300, fontSize: 32, color: r.value.startsWith("+") ? C.bull : "rgba(255,255,255,0.85)", fontVariantNumeric: "tabular-nums" }}>{r.value}</div>
              </div>
            );
          })}
        </div>
      </Out>
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 11. everyone */

const ORBIT = ["NVDA", "TSLA", "AAPL", "SPY", "COIN", "META", "AMZN", "PLTR"];

function Everyone() {
  const id = "everyone";
  const s = scene(id);
  const f = useCurrentFrame();
  const p = useIn(0, 24);
  const rot = f * 0.35;
  return (
    <AbsoluteFill style={{ background: C.dark }}>
      <Out id={id}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 900, height: 900, top: -70, opacity: p }}>
            {[330, 440].map((r) => (
              <div key={r} style={{ position: "absolute", left: 450 - r, top: 450 - r, width: r * 2, height: r * 2, borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.12)" }} />
            ))}
            {ORBIT.map((t, i) => {
              const r = i % 2 ? 440 : 330;
              const a = ((i / ORBIT.length) * 360 + rot * (i % 2 ? 0.7 : 1)) * (Math.PI / 180);
              const pi = interpolate(f, [6 + i * 3, 24 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
              return (
                <div key={t} style={{ position: "absolute", left: 450 + Math.cos(a) * r - 50, top: 450 + Math.sin(a) * r * 0.62 - 50, transform: `scale(${pi})` }}>
                  <StockTile ticker={t} size={100} style={{ borderRadius: "50%" }} />
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 450 - 85, top: 450 - 85, width: 170, height: 170, display: "grid", placeItems: "center", transform: `scale(${0.8 + 0.2 * p})`, filter: "drop-shadow(0 0 40px rgba(255,91,31,0.45))" }}>
              <Img src={staticFile("img/logo-white.png")} style={{ width: 170, height: 170 }} />
            </div>
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110 }}>
          <Headline at={spoken(id, "No wallet")} size={86} color="#fff" lines={[{ text: "No wallet. No fees." }]} style={{ textAlign: "center" }} />
          <div style={{ height: 12 }} />
          <Headline at={spoken(id, "Just sign in")} size={86} color="rgba(255,255,255,0.55)" lines={[{ text: "Just sign in and play." }]} style={{ textAlign: "center" }} />
        </AbsoluteFill>
      </Out>
      <Grain opacity={0.1} />
      {s.frames > 0 && null}
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ 12. close */

function Close() {
  const id = "close";
  const s = scene(id);
  const f = useCurrentFrame();
  const markAt = Math.max(0, spoken(id, "BULL-XI") - 2);
  const builtAt = spoken(id, "Built on");
  const fadeToBlack = interpolate(f, [s.frames - 24, s.frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wordsAt = builtAt + 50;
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30, paddingBottom: 140 }}>
        <div style={{ opacity: useIn(markAt, 16), transform: `scale(${0.9 + 0.1 * useIn(markAt, 20)})` }}>
          <Img src={staticFile("img/logo.png")} style={{ width: 130, height: 130 }} />
        </div>
        <Wordmark color={C.creamInk} at={markAt + 4} size={70} />
        <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.06em", color: "rgba(31,30,28,0.75)", opacity: useIn(builtAt, 16) }}>bull-xi.timioni1490.workers.dev</div>
      </AbsoluteFill>
      <SerifWords
        color={C.creamInk}
        size={64}
        words={[
          { text: "Seal.", at: wordsAt, x: 690, y: 760 },
          { text: "Reveal.", at: wordsAt + 8, x: 870, y: 760 },
          { text: "Score.", at: wordsAt + 16, x: 1060, y: 760 },
          { text: "Settle.", at: wordsAt + 24, x: 1240, y: 760, italic: true },
        ]}
      />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 64 }}>
        <div style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: "0.08em", color: "rgba(31,30,28,0.5)", opacity: useIn(builtAt + 10, 16), textAlign: "center", lineHeight: 1.6 }}>
          Built on Solana and MagicBlock
          <br />
          Devnet preview with test tokens priced from real market data.
        </div>
      </AbsoluteFill>
      <Grain opacity={0.1} />
      <AbsoluteFill style={{ background: "#000", opacity: fadeToBlack }} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ film */

const SCENES: Record<string, () => React.ReactElement> = {
  open: Open,
  question: Question,
  title: Title,
  squad: Squad,
  thesis: Thesis,
  pick: Pick,
  seal: Seal,
  points: Points,
  golden: Golden,
  hourly: Hourly,
  pro: Pro,
  pot: Pot,
  record: Record,
  everyone: Everyone,
  close: Close,
};

export function Film() {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {timeline.scenes.map((s) => {
        const Scene = SCENES[s.id];
        return (
          <Sequence key={s.id} from={s.start} durationInFrames={s.frames} name={s.id}>
            <Scene />
          </Sequence>
        );
      })}
      <Audio src={staticFile(MIX)} />
    </AbsoluteFill>
  );
}
