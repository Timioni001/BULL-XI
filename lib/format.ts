/** Number formatting. Every number in the UI goes through here. */

export const credits = (n: number) => n.toFixed(1);

export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export const pct = (n: number, dp = 2) => {
  const v = Math.abs(n).toFixed(dp);
  if (Number(v) === 0) return `${(0).toFixed(dp)}%`;
  return `${n > 0 ? "+" : "−"}${v}%`;
};

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: n < 50 ? 3 : 2 });

export const ownership = (n: number) => `${n.toFixed(1)}%`;

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

export function clock(ms: number): { d: number; h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (x: number) => String(x).padStart(2, "0");
  return { d, h: p(h), m: p(m), s: p(s) };
}

/** Colour for a signed number. Values that round to zero at `dp` are neutral. */
export const tone = (n: number, dp = 2) => {
  const r = Number(n.toFixed(dp));
  return r > 0 ? "text-bull" : r < 0 ? "text-bear" : "text-muted-foreground";
};
