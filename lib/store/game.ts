"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChipId, GameweekKind, GameweekResult, Lineup, LockReceipt, Position, SquadSlots } from "@/lib/data/types";
import { emptySquad, nextFreeTransfers, squadAfterGameweek } from "@/lib/game/rules";

export interface LockedEntry {
  receipt: LockReceipt;
  kind: GameweekKind;
  gameweekNumber: number;
  start: string;
  end: string;
  /** Snapshot of the lineup at lock time */
  lineup: Lineup;
  chip: ChipId | null;
  hedgeId: string | null;
  transferHit: number;
  /** Set when a demo kickoff starts the gameweek early */
  kickoffAt: number | null;
}

export interface TransferRecord {
  outId: string;
  inId: string;
}

interface GameState {
  hydrated: boolean;
  onboarded: boolean;
  demoMode: boolean;
  managerName: string;
  teamName: string;
  slots: SquadSlots;
  lineup: Lineup | null;
  gameweekKind: GameweekKind;
  locked: LockedEntry | null;
  locks: number;
  /** True once your first deadline has passed. Before that, transfers are free. */
  seasonStarted: boolean;

  chip: ChipId | null;
  hedgeId: string | null;
  chipsUsed: { chip: ChipId; gameweek: number }[];
  freeHitBackup: SquadSlots | null;

  freeTransfers: number;
  transfers: TransferRecord[];
  transferHit: number;

  results: GameweekResult[];

  setHydrated: () => void;
  completeOnboarding: () => void;
  setDemoMode: (on: boolean) => void;
  setProfile: (p: { managerName?: string; teamName?: string }) => void;
  setSlot: (pos: Position, idx: number, id: string | null) => void;
  setSlots: (slots: SquadSlots) => void;
  setLineup: (lineup: Lineup | null) => void;
  setGameweekKind: (kind: GameweekKind) => void;
  lock: (entry: Omit<LockedEntry, "kickoffAt" | "chip" | "hedgeId" | "transferHit">) => void;
  kickoff: (at: number) => void;
  unlock: () => void;
  setChip: (chip: ChipId | null, hedgeId?: string | null) => void;
  applyTransfers: (args: { slots: SquadSlots; transfers: TransferRecord[]; hit: number }) => void;
  finishGameweek: (result: GameweekResult) => void;
  resetAll: () => void;
}

const initial = {
  onboarded: false,
  demoMode: false,
  managerName: "Alex Morgan",
  teamName: "Your XI",
  slots: emptySquad(),
  lineup: null,
  gameweekKind: "daily" as GameweekKind,
  locked: null,
  locks: 0,
  seasonStarted: false,
  chip: null,
  hedgeId: null,
  // Mock history: Triple Captain was played in GW10
  chipsUsed: [{ chip: "tripleCaptain" as ChipId, gameweek: 10 }],
  freeHitBackup: null,
  freeTransfers: 1,
  transfers: [],
  transferHit: 0,
  results: [],
};

const swapIds = (lineup: Lineup | null, map: Map<string, string>): Lineup | null => {
  if (!lineup) return null;
  const m = (id: string) => map.get(id) ?? id;
  return { starters: lineup.starters.map(m), bench: lineup.bench.map(m), captainId: m(lineup.captainId), viceId: m(lineup.viceId) };
};

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      ...initial,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      completeOnboarding: () => set({ onboarded: true }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setProfile: (p) => set((s) => ({ managerName: p.managerName?.trim() || s.managerName, teamName: p.teamName?.trim() || s.teamName })),
      setSlot: (pos, idx, id) =>
        set((s) => {
          const prev = s.slots[pos][idx];
          const slots = { ...s.slots, [pos]: s.slots[pos].map((v, i) => (i === idx ? id : v)) };
          // Keep the lineup when one stock is swapped for another in the same slot.
          const lineup = prev && id ? swapIds(s.lineup, new Map([[prev, id]])) : null;
          return { slots, lineup };
        }),
      setSlots: (slots) => set({ slots, lineup: null }),
      setLineup: (lineup) => set({ lineup }),
      setGameweekKind: (gameweekKind) => set({ gameweekKind }),
      lock: (entry) =>
        set((s) => ({
          locked: { ...entry, kickoffAt: null, chip: s.chip, hedgeId: s.hedgeId, transferHit: s.transferHit },
          locks: s.locks + 1,
        })),
      kickoff: (at) => set((s) => (s.locked ? { locked: { ...s.locked, kickoffAt: at }, seasonStarted: true } : {})),
      unlock: () => set({ locked: null }),
      setChip: (chip, hedgeId = null) =>
        set((s) => {
          const backup = chip === "freeHit" ? (s.freeHitBackup ?? s.slots) : null;
          // Turning Free Hit off before the deadline restores the saved squad.
          const restore = s.chip === "freeHit" && chip !== "freeHit" && s.freeHitBackup ? { slots: s.freeHitBackup, lineup: null } : {};
          return { chip, hedgeId: chip === "hedge" ? hedgeId : null, freeHitBackup: backup, ...restore };
        }),
      applyTransfers: ({ slots, transfers, hit }) =>
        set((s) => ({
          slots,
          lineup: swapIds(s.lineup, new Map(transfers.map((t) => [t.outId, t.inId]))),
          transfers: [...s.transfers, ...transfers],
          transferHit: s.transferHit + hit,
        })),
      finishGameweek: (result) =>
        set((s) => {
          const chip = s.locked?.chip ?? null;
          const slots = squadAfterGameweek({ chip, before: s.freeHitBackup ?? s.slots, during: s.slots });
          return {
            results: [result, ...s.results],
            chipsUsed: chip ? [...s.chipsUsed, { chip, gameweek: result.gameweek }] : s.chipsUsed,
            freeTransfers: s.seasonStarted ? nextFreeTransfers(s.freeTransfers, s.transfers.length, chip) : s.freeTransfers,
            seasonStarted: true,
            transfers: [],
            transferHit: 0,
            chip: null,
            hedgeId: null,
            freeHitBackup: null,
            slots,
            lineup: chip === "freeHit" ? null : s.lineup,
            locked: null,
          };
        }),
      resetAll: () => set({ ...initial, slots: emptySquad(), onboarded: false }),
    }),
    {
      name: "bullxi:game",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted) => ({ ...initial, ...(persisted as object) }),
      partialize: ({ hydrated: _h, ...rest }) => {
        void _h;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
