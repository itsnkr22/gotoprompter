// Language tables from docs/ENGINE_SPEC.md §8 and docs/spec/00-conventions.md Registry C.
import type { LanguageEntry } from './types.js';

const byName = (a: LanguageEntry, b: LanguageEntry): number => a.name.localeCompare(b.name, 'en');

export const LANGUAGES_AUTO: readonly LanguageEntry[] = (
  [
    { id: 'en-US', name: 'English', group: 'auto', iso: 'en' },
    { id: 'es-ES', name: 'Spanish', group: 'auto', iso: 'es' },
    { id: 'fr-FR', name: 'French', group: 'auto', iso: 'fr' },
    { id: 'de-DE', name: 'German', group: 'auto', iso: 'de' },
    { id: 'it-IT', name: 'Italian', group: 'auto', iso: 'it' },
    { id: 'pt-PT', name: 'Portuguese', group: 'auto', iso: 'pt' },
    { id: 'ru-RU', name: 'Russian', group: 'auto', iso: 'ru' },
    { id: 'ja-JP', name: 'Japanese', group: 'auto', iso: 'ja' },
    { id: 'zh-CN', name: 'Chinese', group: 'auto', iso: 'zh' },
    { id: 'ko-KR', name: 'Korean', group: 'auto', iso: 'ko' },
    { id: 'ar-SA', name: 'Arabic', group: 'auto', iso: 'ar', rtl: true },
    { id: 'nl-NL', name: 'Dutch', group: 'auto', iso: 'nl' },
    { id: 'pl-PL', name: 'Polish', group: 'auto', iso: 'pl' },
    { id: 'uk-UA', name: 'Ukrainian', group: 'auto', iso: 'uk' },
    { id: 'hi-IN', name: 'Hindi', group: 'auto', iso: 'hi' },
    { id: 'tr-TR', name: 'Turkish', group: 'auto', iso: 'tr' },
    { id: 'sv-SE', name: 'Swedish', group: 'auto', iso: 'sv' },
    { id: 'da-DK', name: 'Danish', group: 'auto', iso: 'da' },
    { id: 'fi-FI', name: 'Finnish', group: 'auto', iso: 'fi' },
    { id: 'no-NO', name: 'Norwegian', group: 'auto', iso: 'no' },
  ] satisfies LanguageEntry[]
).sort(byName);

export const LANGUAGES_MANUAL: readonly LanguageEntry[] = (
  [
    { id: 'id-ID', name: 'Indonesian', group: 'manual', iso: 'id' },
    { id: 'ms-MY', name: 'Malay', group: 'manual', iso: 'ms' },
    { id: 'ca-ES', name: 'Catalan', group: 'manual', iso: 'ca' },
    { id: 'cs-CZ', name: 'Czech', group: 'manual', iso: 'cs' },
    { id: 'el-GR', name: 'Greek', group: 'manual', iso: 'el' },
    { id: 'he-IL', name: 'Hebrew', group: 'manual', iso: 'he', rtl: true },
    { id: 'hu-HU', name: 'Hungarian', group: 'manual', iso: 'hu' },
    { id: 'ro-RO', name: 'Romanian', group: 'manual', iso: 'ro' },
    { id: 'sk-SK', name: 'Slovak', group: 'manual', iso: 'sk' },
    { id: 'th-TH', name: 'Thai', group: 'manual', iso: 'th' },
    { id: 'vi-VN', name: 'Vietnamese', group: 'manual', iso: 'vi' },
    { id: 'bg-BG', name: 'Bulgarian', group: 'manual', iso: 'bg' },
    { id: 'hr-HR', name: 'Croatian', group: 'manual', iso: 'hr' },
    { id: 'sr-RS', name: 'Serbian', group: 'manual', iso: 'sr' },
  ] satisfies LanguageEntry[]
).sort(byName);

export const ALL_LANGUAGES: readonly LanguageEntry[] = [...LANGUAGES_AUTO, ...LANGUAGES_MANUAL];

/** ISO 639-1 → recognition locale, auto-detect group only. */
export const ISO_TO_LOCALE: Readonly<Record<string, string>> = Object.fromEntries(
  LANGUAGES_AUTO.map((l) => [l.iso, l.id]),
);

/** ISO 639-3 codes some detectors return → ISO 639-1. */
export const ISO3_TO_ISO1: Readonly<Record<string, string>> = {
  eng: 'en',
  spa: 'es',
  fra: 'fr',
  fre: 'fr',
  deu: 'de',
  ger: 'de',
  ita: 'it',
  por: 'pt',
  rus: 'ru',
  jpn: 'ja',
  zho: 'zh',
  cmn: 'zh',
  chi: 'zh',
  kor: 'ko',
  ara: 'ar',
  nld: 'nl',
  dut: 'nl',
  pol: 'pl',
  ukr: 'uk',
  hin: 'hi',
  tur: 'tr',
  swe: 'sv',
  dan: 'da',
  fin: 'fi',
  nor: 'no',
  nob: 'no',
  nno: 'no',
};

export const DEFAULT_LOCALE = 'en-US';

/**
 * Map a detector result (ISO 639-1 or 639-3) and its confidence (0..1) to a recognition locale.
 * Unknown or unsupported languages fall back to en-US; confidence below 0.5 is flagged.
 */
export function resolveLanguage(
  iso: string | undefined,
  confidence: number,
): { locale: string; lowConfidence: boolean } {
  const code = iso ? (ISO3_TO_ISO1[iso.toLowerCase()] ?? iso.toLowerCase()) : undefined;
  const locale = (code && ISO_TO_LOCALE[code]) || DEFAULT_LOCALE;
  return { locale, lowConfidence: confidence < 0.5 };
}

export function languageById(id: string): LanguageEntry | undefined {
  return ALL_LANGUAGES.find((l) => l.id === id);
}
