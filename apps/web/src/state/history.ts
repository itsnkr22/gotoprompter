// Recent scripts (spec §2.2, Registry B).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from './storage';

export interface HistoryItem {
  id: number;
  text: string;
  preview: string;
  date: string;
  tag?: 'demo';
  googleDocUrl?: string;
}

export const HISTORY_MAX = 10;
export const PREVIEW_CHARS = 40;

export function makePreview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > PREVIEW_CHARS ? `${flat.slice(0, PREVIEW_CHARS)}…` : flat;
}

export interface HistoryStore {
  items: HistoryItem[];
  save(text: string, googleDocUrl?: string | null): void;
  seedDemo(text: string): void;
  clear(): void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      items: [],
      save: (text, googleDocUrl) => {
        const items = get().items;
        if (items[0]?.text === text) return;
        const item: HistoryItem = {
          id: Date.now(),
          text,
          preview: makePreview(text),
          date: new Date().toISOString(),
          ...(googleDocUrl ? { googleDocUrl } : {}),
        };
        set({ items: [item, ...items].slice(0, HISTORY_MAX) });
      },
      seedDemo: (text) => {
        if (get().items.length > 0) return;
        set({
          items: [
            {
              id: Date.now(),
              text,
              preview: makePreview(text),
              date: new Date().toISOString(),
              tag: 'demo',
            },
          ],
        });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: 'vp.history.v1',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => {
        const p = persisted as { items?: unknown } | undefined;
        const items = Array.isArray(p?.items)
          ? (p.items as HistoryItem[])
              .filter((i) => i && typeof i.text === 'string')
              .slice(0, HISTORY_MAX)
          : [];
        return { ...current, items };
      },
    },
  ),
);
