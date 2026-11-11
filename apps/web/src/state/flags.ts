// Device-local feature flags (spec §2.3, Registry B).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from './storage';

export interface Flags {
  betaHMirror?: true;
  swUpdateDismissedAt?: string;
}

export interface FlagsStore extends Flags {
  set(partial: Partial<Flags>): void;
}

export const useFlagsStore = create<FlagsStore>()(
  persist((set) => ({ set: (partial) => set(partial) }), {
    name: 'vp.flags.v1',
    version: 1,
    storage: createJSONStorage(() => safeLocalStorage),
    partialize: (s) => ({
      ...(s.betaHMirror ? { betaHMirror: true as const } : {}),
      ...(s.swUpdateDismissedAt ? { swUpdateDismissedAt: s.swUpdateDismissedAt } : {}),
    }),
  }),
);
