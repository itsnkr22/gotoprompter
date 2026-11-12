// Settings store (spec §2.1, Registry A).
import { ALL_LANGUAGES } from '@gotoprompter/prompter-core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeLocalStorage } from './storage';

export type ScrollingMode = 'voice' | 'sound' | 'constant';
export type TextAlign = 'left' | 'center' | 'right';
/** 'auto' follows the script's language (right-to-left for Arabic, Hebrew, Persian, Urdu). */
export type TextDirection = 'auto' | 'ltr' | 'rtl';
export type FontFamily = 'mono' | 'sans' | 'serif' | 'comic' | 'dyslexic';

export interface Settings {
  scrollingMode: ScrollingMode;
  scrollSpeed: number;
  soundSensitivity: number;
  languageSetting: string;
  textAlign: TextAlign;
  mirrorVertical: boolean;
  mirrorHorizontal: boolean;
  showStopSigns: boolean;
  voiceCommandsEnabled: boolean;
  screenRotated: boolean;
  preserveFormatting: boolean;
  smoothAnimations: boolean;
  highlightActiveWord: boolean;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  margin: number;
  dockOpacity: number;
  activeLinePosition: number;
  lookaheadWords: number;
  selectedVideoDeviceId: string | null;
  selectedAudioDeviceId: string | null;
  textColor: string;
  bgColor: string;
  textDirection: TextDirection;
  fontFamily: FontFamily;
}

export const DEFAULT_SETTINGS: Settings = {
  scrollingMode: 'voice',
  scrollSpeed: 3.5,
  soundSensitivity: 0.75,
  languageSetting: 'auto',
  textAlign: 'left',
  mirrorVertical: false,
  mirrorHorizontal: false,
  showStopSigns: false,
  voiceCommandsEnabled: false,
  screenRotated: false,
  preserveFormatting: true,
  smoothAnimations: false,
  highlightActiveWord: true,
  fontSize: 40,
  lineHeight: 1.0,
  paragraphSpacing: 0.5,
  margin: 0,
  dockOpacity: 50,
  activeLinePosition: 35,
  lookaheadWords: 5,
  selectedVideoDeviceId: null,
  selectedAudioDeviceId: null,
  textColor: '#ffffff',
  bgColor: '#000000',
  textDirection: 'auto',
  fontFamily: 'mono',
};

export const SETTINGS_RANGES = {
  scrollSpeed: { min: 1, max: 6, step: 0.1 },
  soundSensitivity: { min: 0, max: 1, step: 0.05 },
  fontSize: { min: 20, max: 100, step: 1 },
  lineHeight: { min: 0.6, max: 1.4, step: 0.1 },
  paragraphSpacing: { min: 0, max: 1, step: 0.1 },
  margin: { min: 0, max: 40, step: 4 },
  dockOpacity: { min: 30, max: 100, step: 5 },
  activeLinePosition: { min: 10, max: 90, step: 5 },
  lookaheadWords: { min: 1, max: 10, step: 1 },
} as const;

export type RangeKey = keyof typeof SETTINGS_RANGES;

export const SESSION_ONLY_KEYS = [
  'screenRotated',
  'mirrorVertical',
  'mirrorHorizontal',
  'selectedVideoDeviceId',
  'selectedAudioDeviceId',
] as const satisfies readonly (keyof Settings)[];

const ENUMS = {
  scrollingMode: ['voice', 'sound', 'constant'],
  textAlign: ['left', 'center', 'right'],
  textDirection: ['auto', 'ltr', 'rtl'],
  fontFamily: ['mono', 'sans', 'serif', 'comic', 'dyslexic'],
} as const;

const HEX = /^#[0-9a-f]{6}$/i;
const LANGUAGE_IDS = new Set(['auto', ...ALL_LANGUAGES.map((l) => l.id)]);

/** Clamp a number to a range and snap it to the range's step. */
export function clampRange(key: RangeKey, value: number): number {
  const { min, max, step } = SETTINGS_RANGES[key];
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS[key];
  const clamped = Math.min(max, Math.max(min, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  const decimals = (step.toString().split('.')[1] ?? '').length;
  return Number(Math.min(max, snapped).toFixed(decimals));
}

/**
 * Merge over defaults, drop unknown keys, clamp numbers to range (snap to step), validate enums,
 * validate hex colours, validate languageSetting against the language table.
 */
export function clampSettings(input: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  const outRec = out as unknown as Record<string, unknown>;
  if (!input || typeof input !== 'object') return out;
  const src = input as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (!(key in src)) continue;
    const v = src[key];
    const def = DEFAULT_SETTINGS[key];
    if (key in SETTINGS_RANGES) {
      if (typeof v === 'number') outRec[key] = clampRange(key as RangeKey, v);
    } else if (key in ENUMS) {
      const allowed = ENUMS[key as keyof typeof ENUMS] as readonly string[];
      if (typeof v === 'string' && allowed.includes(v)) outRec[key] = v;
    } else if (key === 'textColor' || key === 'bgColor') {
      if (typeof v === 'string' && HEX.test(v)) out[key] = v.toLowerCase();
    } else if (key === 'languageSetting') {
      if (typeof v === 'string' && LANGUAGE_IDS.has(v)) out.languageSetting = v;
    } else if (key === 'selectedVideoDeviceId' || key === 'selectedAudioDeviceId') {
      if (v === null || typeof v === 'string') out[key] = v;
    } else if (typeof v === typeof def) {
      outRec[key] = v;
    }
  }
  return out;
}

export interface SettingsStore extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  patch(partial: Partial<Settings>): void;
  applyTheme(theme: 'dark' | 'light'): void;
  reset(): void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      patch: (partial) => set(partial),
      applyTheme: (theme) =>
        set(
          theme === 'dark'
            ? { bgColor: '#000000', textColor: '#ffffff' }
            : { bgColor: '#ffffff', textColor: '#000000' },
        ),
      reset: () => {
        const keep: Partial<Settings> = {};
        for (const k of SESSION_ONLY_KEYS) (keep as Record<string, unknown>)[k] = get()[k];
        set({ ...DEFAULT_SETTINGS, ...keep });
      },
    }),
    {
      name: 'vp.settings.v1',
      version: 2,
      // v1 had no 'auto' direction and stored 'ltr' for everyone: let those follow the language.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2 && p['textDirection'] === 'ltr') p['textDirection'] = 'auto';
        return p as unknown as SettingsStore;
      },
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => {
        const out: Partial<Settings> = {};
        for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
          if ((SESSION_ONLY_KEYS as readonly string[]).includes(key)) continue;
          (out as Record<string, unknown>)[key] = state[key];
        }
        return out;
      },
      merge: (persisted, current) => {
        const clamped = clampSettings(persisted);
        const sessionOnly: Partial<Settings> = {};
        for (const k of SESSION_ONLY_KEYS) (sessionOnly as Record<string, unknown>)[k] = current[k];
        return { ...current, ...clamped, ...sessionOnly };
      },
    },
  ),
);

/** Plain snapshot of the settings values (no actions). */
export function getSettings(): Settings {
  const s = useSettingsStore.getState();
  const out: Partial<Settings> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    (out as Record<string, unknown>)[key] = s[key];
  }
  return out as Settings;
}
