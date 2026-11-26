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
  league: (id: string) => `/app/league?id=${encodeURIComponent(id)}`,
  join: (code: string) => `/join?code=${encodeURIComponent(code)}`,
  friends: (code: string) => `/app/friends?code=${encodeURIComponent(code)}`,
  transfers: "/app/transfers",
  chips: "/app/chips",
  history: "/app/history",
  profile: "/app/profile",
  pro: "/app/pro",
  manager: (address: string) => `/app/manager?id=${encodeURIComponent(address)}`,
} as const;

export const external = {
  magicblockDocs: "https://docs.magicblock.gg",
  solanaExplorer: (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`,
} as const;
