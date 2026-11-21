import type { Sector } from "@/lib/data/types";

/** Sector families for the colour rings on stock tiles. Game rules use the finer `Sector`. */
export type SectorFamily = "tech" | "finance" | "energy" | "consumer" | "health" | "industrial" | "crypto" | "index";

const FAMILY: Record<Sector, SectorFamily> = {
  Index: "index",
  "Big Tech": "tech",
  Chips: "tech",
  Software: "tech",
  Consumer: "consumer",
  Finance: "finance",
  Health: "health",
  Energy: "energy",
  Crypto: "crypto",
  Mobility: "industrial",
};

export const familyOf = (s: Sector): SectorFamily => FAMILY[s];
export const sectorColor = (s: Sector) => `var(--sector-${FAMILY[s]})`;

/**
 * Vivid art palette for big stock cards and the landing corridor.
 * No greens or reds: those colours mean gains and losses.
 */
const ART: Record<SectorFamily, [string, string, string]> = {
  tech: ["#38bdf8", "#2563eb", "#0b1530"],
  finance: ["#fcd34d", "#d97706", "#2a1a05"],
  energy: ["#fdba74", "#ea580c", "#2a1206"],
  consumer: ["#f9a8d4", "#db2777", "#2a0716"],
  health: ["#a5f3fc", "#0891b2", "#04212a"],
  industrial: ["#cbd5e1", "#475569", "#0f141c"],
  crypto: ["#d8b4fe", "#7c3aed", "#1a0b33"],
  index: ["#f1f5f9", "#94a3b8", "#14161a"],
};

export const sectorArt = (s: Sector) => ART[FAMILY[s]];
