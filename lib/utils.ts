import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** tailwind-merge that knows BULL-XI's custom colour and type tokens. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "brand",
        "brand-soft",
        "bull",
        "bear",
        "gold",
        "surface-1",
        "surface-2",
        "surface-3",
        "hairline",
        "pitch",
        "pitch-stripe",
        "pitch-line",
        "sector-tech",
        "sector-finance",
        "sector-energy",
        "sector-consumer",
        "sector-health",
        "sector-industrial",
        "sector-crypto",
        "sector-index",
      ],
      text: ["label", "stat", "mega", "giant"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
