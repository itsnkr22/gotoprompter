// Language detection (spec §5.1) on top of the core tables (Registry C).
//
// Three layers, most reliable first:
//   1. Writing system. Greek, Thai, Korean, Georgian, Tamil … identify the language on their own.
//   2. The full statistical detector (tinyld, ~60 languages), loaded as a separate chunk.
//   3. The light detector (24 languages) bundled with the app, used until layer 2 has loaded.
import {
  ALL_LANGUAGES,
  LANGUAGES_AUTO,
  LANGUAGES_MANUAL,
  LANGUAGE_COUNT,
  languageById,
  regionalVariant,
  resolveLanguage,
} from '@gotoprompter/prompter-core';
import type { LanguageEntry } from '@gotoprompter/prompter-core';
import { detectAll as detectAllLight } from 'tinyld/light';

export { ALL_LANGUAGES, LANGUAGES_AUTO, LANGUAGES_MANUAL, LANGUAGE_COUNT };
export type { LanguageEntry };

type DetectAll = (text: string) => { lang: string; accuracy: number }[];

let detectAllFull: DetectAll | null = null;
const readyCallbacks = new Set<() => void>();

/** Resolves true once the full detector is available (false when its chunk failed to load). */
export const fullDetectorReady: Promise<boolean> = import('tinyld')
  .then((m) => {
    detectAllFull = m.detectAll as DetectAll;
    for (const cb of readyCallbacks) cb();
    readyCallbacks.clear();
    return true;
  })
  .catch(() => false);

/** Run `cb` once when the full detector finishes loading (never, if it already has). */
export function onFullDetectorReady(cb: () => void): () => void {
  if (detectAllFull) return () => {};
  readyCallbacks.add(cb);
  return () => readyCallbacks.delete(cb);
}

export function languageName(id: string): string {
  return ALL_LANGUAGES.find((l) => l.id === id)?.name ?? id;
}

export function isRtlLanguage(id: string): boolean {
  return languageById(id)?.rtl === true;
}

/** Only the start of a long script is inspected. */
const SAMPLE_CHARS = 4000;
const LETTER = /\p{L}/gu;

/** Scripts used by exactly one supported language. Order matters: kana before Han. */
const UNIQUE_SCRIPTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\p{Script=Hangul}/gu, 'ko'],
  [/\p{Script=Thai}/gu, 'th'],
  [/\p{Script=Greek}/gu, 'el'],
  [/\p{Script=Hebrew}/gu, 'he'],
  [/\p{Script=Georgian}/gu, 'ka'],
  [/\p{Script=Armenian}/gu, 'hy'],
  [/\p{Script=Khmer}/gu, 'km'],
  [/\p{Script=Lao}/gu, 'lo'],
  [/\p{Script=Sinhala}/gu, 'si'],
  [/\p{Script=Ethiopic}/gu, 'am'],
  [/\p{Script=Tamil}/gu, 'ta'],
  [/\p{Script=Telugu}/gu, 'te'],
  [/\p{Script=Kannada}/gu, 'kn'],
  [/\p{Script=Malayalam}/gu, 'ml'],
  [/\p{Script=Gujarati}/gu, 'gu'],
  [/\p{Script=Bengali}/gu, 'bn'],
  [/\p{Script=Devanagari}/gu, 'hi'],
];
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/gu;
const HAN = /\p{Script=Han}/gu;
const ARABIC = /\p{Script=Arabic}/gu;
const CYRILLIC = /\p{Script=Cyrillic}/gu;
// Letters that exist in only one of the languages sharing a script.
const URDU_ONLY = /[ٹڈڑںھہے]/gu; // ٹ ڈ ڑ ں ھ ہ ے
const PERSIAN_ONLY = /[پچژگی]/gu; // پ چ ژ گ ی
const UKRAINIAN_ONLY = /[їєґЇЄҐ]/gu;
const SERBIAN_ONLY = /[ђћљњџЂЋЉЊЏ]/gu;

const count = (text: string, re: RegExp): number => text.match(re)?.length ?? 0;

/**
 * ISO code when the writing system settles the language, otherwise undefined.
 * A script must make up more than half of the letters to count.
 */
export function detectByScript(text: string): string | undefined {
  const sample = text.slice(0, SAMPLE_CHARS);
  const letters = count(sample, LETTER);
  if (letters === 0) return undefined;
  const dominant = (n: number): boolean => n / letters > 0.5;

  const kana = count(sample, KANA);
  const han = count(sample, HAN);
  if (dominant(kana + han)) return kana / letters > 0.05 ? 'ja' : 'zh';
  for (const [re, iso] of UNIQUE_SCRIPTS) if (dominant(count(sample, re))) return iso;

  const arabic = count(sample, ARABIC);
  if (dominant(arabic)) {
    if (count(sample, URDU_ONLY) / arabic > 0.02) return 'ur';
    if (count(sample, PERSIAN_ONLY) / arabic > 0.02) return 'fa';
    return 'ar';
  }
  const cyrillic = count(sample, CYRILLIC);
  if (dominant(cyrillic)) {
    if (count(sample, UKRAINIAN_ONLY) / cyrillic > 0.005) return 'uk';
    if (count(sample, SERBIAN_ONLY) / cyrillic > 0.005) return 'sr';
  }
  return undefined;
}

function preferredLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

/** True when the table has an auto-detectable language for this detector code. */
function isUsable(iso: string): boolean {
  return iso === 'en' || iso === 'eng' || resolveLanguage(iso, 1).locale !== 'en-US';
}

/**
 * Detect the script's language and map it to a recognition locale. `confidence` below 0.5 means
 * "ask the user to pick"; unknown or unsupported text falls back to en-US.
 */
export function detectLanguage(text: string): { locale: string; confidence: number } {
  const finish = (iso: string | undefined, confidence: number) => ({
    locale: regionalVariant(resolveLanguage(iso, confidence).locale, preferredLanguages()),
    confidence,
  });

  const byScript = detectByScript(text);
  if (byScript) return finish(byScript, 1);

  const results = (detectAllFull ?? detectAllLight)(text);
  // The detector also knows languages no browser recognises (Latin, Esperanto …): take the best
  // candidate we can actually use rather than silently treating the text as English.
  const usable = results.find((r) => isUsable(r.lang));
  if (usable) return finish(usable.lang, usable.accuracy);
  return finish(undefined, 0);
}
