"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ChipId, GameweekKind, Lineup, LockReceipt, Position, SquadSlots } from "@/lib/data/types";
import { emptySquad } from "@/lib/game/rules";

export interface LockedEntry {
  receipt: LockReceipt;
  kind: GameweekKind;
  gameweekNumber: number;
  start: string;
  end: string;
  /** Snapshot of the lineup at lock time */
  lineup: Lineup;
  chip: ChipId | null;
  /** Set when the gameweek kicks off (demo: "Go to kickoff") */
  kickoffAt: number | null;
}

interface GameState {
  hydrated: boolean;
  onboarded: boolean;
  teamName: string;
  slots: SquadSlots;
  lineup: Lineup | null;
  gameweekKind: GameweekKind;
  locked: LockedEntry | null;
  chip: ChipId | null;
  hedgeId: string | null;

  setHydrated: () => void;
  completeOnboarding: () => void;
  setSlot: (pos: Position, idx: number, id: string | null) => void;
  setSlots: (slots: SquadSlots) => void;
  clearSquad: () => void;
  setLineup: (lineup: Lineup | null) => void;
  setGameweekKind: (kind: GameweekKind) => void;
  lock: (entry: Omit<LockedEntry, "kickoffAt">) => void;
  kickoff: (at: number) => void;
  unlock: () => void;
  resetAll: () => void;
}

const initial = {
  onboarded: false,
  teamName: "Your XI",
  slots: emptySquad(),
  lineup: null,
  gameweekKind: "daily" as GameweekKind,
  locked: null,
  chip: null,
  hedgeId: null,
};

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      ...initial,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      completeOnboarding: () => set({ onboarded: true }),
      setSlot: (pos, idx, id) =>
        set((s) => {
          const slots = { ...s.slots, [pos]: s.slots[pos].map((v, i) => (i === idx ? id : v)) };
          return { slots, lineup: null };
        }),
      setSlots: (slots) => set({ slots, lineup: null }),
      clearSquad: () => set({ slots: emptySquad(), lineup: null }),
      setLineup: (lineup) => set({ lineup }),
      setGameweekKind: (gameweekKind) => set({ gameweekKind }),
      lock: (entry) => set({ locked: { ...entry, kickoffAt: null } }),
      kickoff: (at) => set((s) => (s.locked ? { locked: { ...s.locked, kickoffAt: at } } : {})),
      unlock: () => set({ locked: null }),
      resetAll: () => set({ ...initial, slots: emptySquad() }),
    }),
    {
      name: "bullxi:game",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ hydrated: _h, ...rest }) => {
        void _h;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
