/** Leagues you created or joined, kept in this browser until the game moves onchain. */
export interface LocalLeague {
  id: string;
  name: string;
  code: string;
  createdAt: number;
}

interface LocalState {
  created: LocalLeague[];
  joined: string[]; // league ids
}

const KEY = "bullxi:leagues";

export function readLocal(): LocalState {
  if (typeof window === "undefined") return { created: [], joined: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { created: [], joined: [], ...JSON.parse(raw) } : { created: [], joined: [] };
  } catch {
    return { created: [], joined: [] };
  }
}

export function writeLocal(next: LocalState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: leagues stay for this session only */
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(name: string): string {
  const prefix = (name.replace(/[^a-z]/gi, "").toUpperCase() + "XXX").slice(0, 3);
  let tail = "";
  for (let i = 0; i < 3; i++) tail += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}-${tail}`;
}
