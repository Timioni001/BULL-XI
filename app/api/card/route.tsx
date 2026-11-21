import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/**
 * Gameweek result share card, 1080x1350 (4:5, made for X and Instagram).
 * /api/card?gw=13&pts=73&rank=3&of=12&league=Office%20Legends&team=Your%20XI&best=NVDAx:34&cap=COINx:46
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const clip = (s: string | null, n: number, d: string) => (s ?? d).slice(0, n);
  const gw = clip(q.get("gw"), 4, "13");
  const pts = Number(q.get("pts") ?? 0) || 0;
  const rank = Number(q.get("rank") ?? 1) || 1;
  const of = Number(q.get("of") ?? 12) || 12;
  const league = clip(q.get("league"), 28, "Office Legends");
  const team = clip(q.get("team"), 24, "Your XI");
  const [bestT, bestP] = clip(q.get("best"), 20, "NVDAx:0").split(":");
  const [capT, capP] = clip(q.get("cap"), 20, "NVDAx:0").split(":");
  const chip = q.get("chip");

  const [bold, medium, mono, logo] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/Geist-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/GeistMono-SemiBold.ttf")),
    readFile(join(process.cwd(), "public/logo-white.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const ord = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
  };
  const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
  const bestN = Number(bestP) || 0;
  const capN = Number(capP) || 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0A0A0A", color: "#fff", fontFamily: "Geist", position: "relative", overflow: "hidden", padding: 80 }}>
        {/* angled light, from the logo's triangle */}
        <div style={{ position: "absolute", top: -420, right: -360, width: 1000, height: 1000, transform: "rotate(45deg)", background: "linear-gradient(180deg, rgba(108,92,255,0.45), rgba(108,92,255,0))", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -200, left: -200, width: 700, height: 700, borderRadius: 9999, background: "radial-gradient(circle, rgba(108,92,255,0.18), rgba(10,10,10,0) 70%)", display: "flex" }} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} style={{ position: "absolute", left: -400 + i * 220, top: 0, width: 110, height: 1700, background: "rgba(255,255,255,0.018)", transform: "rotate(35deg)", display: "flex" }} />
        ))}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={84} height={84} alt="" />
            <span style={{ fontFamily: "Space Grotesk", fontSize: 40, letterSpacing: 8 }}>BULL-XI</span>
          </div>
          <div style={{ display: "flex", padding: "14px 26px", borderRadius: 999, background: "#6C5CFF", fontFamily: "Space Grotesk", fontSize: 30, letterSpacing: 4 }}>FULL TIME</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 110 }}>
          <span style={{ fontFamily: "Space Grotesk", fontSize: 44, color: "#8e8e93", letterSpacing: 6 }}>GAMEWEEK {gw}</span>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
            <span style={{ fontFamily: "Space Grotesk", fontSize: 360, lineHeight: 0.9, letterSpacing: -14, color: pts < 0 ? "#EA3943" : "#fff" }}>{signed(pts).replace("+", "")}</span>
            <span style={{ fontFamily: "Space Grotesk", fontSize: 72, marginLeft: 24, marginBottom: 46, color: "#8e8e93" }}>PTS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24, fontSize: 40 }}>
            <span style={{ fontFamily: "Space Grotesk", fontSize: 64, color: rank === 1 ? "#F5C451" : "#fff" }}>{ord(rank)}</span>
            <span style={{ color: "#8e8e93" }}>
              of {of} in {league}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, marginTop: "auto" }}>
          {[
            { label: "BEST PICK", t: bestT, p: bestN, gold: false },
            { label: "CAPTAIN", t: capT, p: capN, gold: true },
          ].map((c) => (
            <div key={c.label} style={{ flex: 1, display: "flex", flexDirection: "column", padding: 36, borderRadius: 36, background: "#141416", border: c.gold ? "3px solid rgba(245,196,81,0.55)" : "3px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 26, letterSpacing: 4, color: c.gold ? "#F5C451" : "#8e8e93" }}>{c.label}</span>
              <span style={{ fontFamily: "Geist Mono", fontSize: 64, marginTop: 12 }}>{c.t}</span>
              <span style={{ fontFamily: "Space Grotesk", fontSize: 54, marginTop: 4, color: c.p > 0 ? "#16C784" : c.p < 0 ? "#EA3943" : "#8e8e93" }}>{signed(c.p)} pts</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 48, fontSize: 30, color: "#8e8e93" }}>
          <span style={{ color: "#fff", fontFamily: "Space Grotesk", fontSize: 36 }}>
            {team}
            {chip ? `  ·  ${chip.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}` : ""}
          </span>
          <span>Fantasy football for onchain stocks</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Space Grotesk", data: bold, weight: 700, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 600, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
