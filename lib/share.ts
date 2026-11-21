import type { GameweekResult } from "@/lib/data/types";

export const isBigWin = (r: GameweekResult) => r.points >= 60 || r.rank <= 3;

const W = 1080;
const H = 1350;

/** CSS font family behind a next/font variable, e.g. "--font-archivo". */
function family(varName: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Draws the 1080x1350 gameweek share card in the browser (no server needed)
 * and returns it as a PNG blob.
 */
export async function renderShareCard(r: GameweekResult): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const display = family("--font-archivo", "Arial Black, sans-serif");
  const sans = family("--font-geist-sans", "Helvetica, Arial, sans-serif");
  const mono = family("--font-geist-mono", "Menlo, monospace");
  await document.fonts?.ready;

  // Background, angled light and stripes
  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W, 0, 0, W, 0, 900);
  glow.addColorStop(0, "rgba(255,91,31,0.45)");
  glow.addColorStop(1, "rgba(255,91,31,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.rotate((35 * Math.PI) / 180);
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  for (let i = -4; i < 10; i++) ctx.fillRect(i * 220, -800, 110, 2600);
  ctx.restore();

  // Header
  try {
    const logo = await loadImage("/logo-white.png");
    ctx.drawImage(logo, 80, 70, 84, 84);
  } catch {
    /* logo is decorative */
  }
  ctx.fillStyle = "#fff";
  ctx.font = `900 40px ${display}`;
  ctx.textBaseline = "middle";
  ctx.fillText("BULL-XI", 184, 114);
  ctx.fillStyle = "#FF5B1F";
  roundRect(ctx, W - 80 - 250, 82, 250, 64, 32);
  ctx.fill();
  ctx.fillStyle = "#161618";
  ctx.font = `900 28px ${display}`;
  ctx.textAlign = "center";
  ctx.fillText("FULL TIME", W - 80 - 125, 115);
  ctx.textAlign = "left";

  // Points
  ctx.fillStyle = "#8e8e93";
  ctx.font = `900 42px ${display}`;
  ctx.fillText(`GAMEWEEK ${r.gameweek}`, 80, 300);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = r.points < 0 ? "#EA3943" : "#fff";
  ctx.font = `900 330px ${display}`;
  const pts = signed(r.points).replace("+", "");
  ctx.fillText(pts, 70, 640);
  const pw = ctx.measureText(pts).width;
  ctx.fillStyle = "#8e8e93";
  ctx.font = `900 70px ${display}`;
  ctx.fillText("PTS", 70 + pw + 24, 630);

  // Rank
  ctx.fillStyle = r.rank === 1 ? "#F5C451" : "#fff";
  ctx.font = `900 64px ${display}`;
  const rk = ordinal(r.rank);
  ctx.fillText(rk, 80, 760);
  const rw = ctx.measureText(rk).width;
  ctx.fillStyle = "#8e8e93";
  ctx.font = `500 40px ${sans}`;
  ctx.fillText(`of ${r.leagueSize} in ${r.leagueName}`.slice(0, 40), 80 + rw + 22, 755);

  // Cards
  const cards = [
    { label: "BEST PICK", t: r.bestPick.ticker, p: r.bestPick.points, gold: false },
    { label: "CAPTAIN", t: r.captain.ticker, p: r.captain.points, gold: true },
  ];
  cards.forEach((c, i) => {
    const x = 80 + i * (446 + 28);
    const y = 900;
    roundRect(ctx, x, y, 446, 250, 36);
    ctx.fillStyle = "#141416";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.gold ? "rgba(245,196,81,0.55)" : "rgba(255,255,255,0.08)";
    ctx.stroke();
    ctx.fillStyle = c.gold ? "#F5C451" : "#8e8e93";
    ctx.font = `600 26px ${sans}`;
    ctx.fillText(c.label, x + 36, y + 66);
    ctx.fillStyle = "#fff";
    ctx.font = `600 62px ${mono}`;
    ctx.fillText(c.t, x + 36, y + 146);
    ctx.fillStyle = c.p > 0 ? "#16C784" : c.p < 0 ? "#EA3943" : "#8e8e93";
    ctx.font = `900 52px ${display}`;
    ctx.fillText(`${signed(c.p)} pts`, x + 36, y + 214);
  });

  // Footer
  ctx.fillStyle = "#fff";
  ctx.font = `900 34px ${display}`;
  ctx.fillText(r.teamName.slice(0, 22), 80, 1250);
  ctx.fillStyle = "#8e8e93";
  ctx.font = `500 28px ${sans}`;
  ctx.textAlign = "right";
  ctx.fillText("The fantasy league for stocks", W - 80, 1250);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the card"))), "image/png"));
}
