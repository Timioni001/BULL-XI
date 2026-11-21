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
