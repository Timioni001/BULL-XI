/**
 * Review switches for designing states. Add `?mock=slow`, `?mock=error` or
 * `?mock=empty` to any URL. The choice sticks for the browser tab;
 * `?mock=off` clears it.
 */
export type MockMode = "normal" | "slow" | "error" | "empty";

const KEY = "bullxi:mock";

export function mockMode(): MockMode {
  if (typeof window === "undefined") return "normal";
  try {
    const q = new URLSearchParams(window.location.search).get("mock");
    if (q === "off") sessionStorage.removeItem(KEY);
    else if (q === "slow" || q === "error" || q === "empty") sessionStorage.setItem(KEY, q);
    return (sessionStorage.getItem(KEY) as MockMode | null) ?? "normal";
  } catch {
    return "normal";
  }
}

export async function latency(base = 350): Promise<void> {
  const mode = mockMode();
  const ms = mode === "slow" ? 2500 : base + Math.random() * 200;
  await new Promise((r) => setTimeout(r, ms));
  if (mode === "error") throw new Error("We couldn't reach the market. Check your connection and try again.");
}
