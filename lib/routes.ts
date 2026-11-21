/** Every internal URL in one place, so links never break. */
export const routes = {
  landing: "/",
  proof: "/proof",
  app: "/app",
  intro: "/app?intro",
  squad: "/app/squad",
  pick: "/app/pick",
  lock: "/app/lock",
  live: "/app/live",
  leagues: "/app/leagues",
  league: (id: string) => `/app/leagues/${encodeURIComponent(id)}`,
  join: (code: string) => `/join/${encodeURIComponent(code)}`,
  transfers: "/app/transfers",
  chips: "/app/chips",
  history: "/app/history",
  profile: "/app/profile",
  pro: "/app/pro",
  shareCard: "/api/card",
} as const;

export const external = {
  magicblockDocs: "https://docs.magicblock.gg",
  solanaExplorer: (address: string) => `https://explorer.solana.com/address/${address}`,
} as const;
