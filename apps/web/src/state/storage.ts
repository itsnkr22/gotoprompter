// localStorage wrapper that degrades to memory in private mode / on quota errors (spec §2.5).
import type { StateStorage } from 'zustand/middleware';

const memory = new Map<string, string>();
let useMemory = false;
let warned = false;

function fallback(): void {
  if (!warned) {
    warned = true;
    console.warn('[storage] localStorage unavailable, using memory');
  }
  useMemory = true;
}

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    if (!useMemory) {
      try {
        return localStorage.getItem(name);
      } catch {
        fallback();
      }
    }
    return memory.get(name) ?? null;
  },
  setItem: (name, value) => {
    if (!useMemory) {
      try {
        localStorage.setItem(name, value);
        return;
      } catch {
        fallback();
      }
    }
    memory.set(name, value);
  },
  removeItem: (name) => {
    if (!useMemory) {
      try {
        localStorage.removeItem(name);
        return;
      } catch {
        fallback();
      }
    }
    memory.delete(name);
  },
};

/** Test helper: forget the memory fallback state. */
export function __resetStorageForTests(): void {
  memory.clear();
  useMemory = false;
  warned = false;
}
