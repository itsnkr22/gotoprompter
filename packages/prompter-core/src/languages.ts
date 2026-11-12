// Language tables from docs/ENGINE_SPEC.md §8 and docs/spec/00-conventions.md Registry C.
import type { LanguageEntry } from './types.js';

const byName = (a: LanguageEntry, b: LanguageEntry): number => a.name.localeCompare(b.name, 'en');

/**
 * Languages the script text can be identified as (statistical detector or a unique writing
 * system), so "Automatic" picks them without the user choosing.
 */
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
    { id: 'id-ID', name: 'Indonesian', group: 'auto', iso: 'id' },
    { id: 'cs-CZ', name: 'Czech', group: 'auto', iso: 'cs' },
    { id: 'el-GR', name: 'Greek', group: 'auto', iso: 'el' },
    { id: 'he-IL', name: 'Hebrew', group: 'auto', iso: 'he', rtl: true },
    { id: 'hu-HU', name: 'Hungarian', group: 'auto', iso: 'hu' },
    { id: 'ro-RO', name: 'Romanian', group: 'auto', iso: 'ro' },
    { id: 'sk-SK', name: 'Slovak', group: 'auto', iso: 'sk' },
    { id: 'th-TH', name: 'Thai', group: 'auto', iso: 'th' },
    { id: 'vi-VN', name: 'Vietnamese', group: 'auto', iso: 'vi' },
    { id: 'bg-BG', name: 'Bulgarian', group: 'auto', iso: 'bg' },
    { id: 'sr-RS', name: 'Serbian', group: 'auto', iso: 'sr' },
    { id: 'af-ZA', name: 'Afrikaans', group: 'auto', iso: 'af' },
    { id: 'am-ET', name: 'Amharic', group: 'auto', iso: 'am' },
    { id: 'hy-AM', name: 'Armenian', group: 'auto', iso: 'hy' },
    { id: 'bn-IN', name: 'Bengali', group: 'auto', iso: 'bn' },
    { id: 'et-EE', name: 'Estonian', group: 'auto', iso: 'et' },
    { id: 'fil-PH', name: 'Filipino', group: 'auto', iso: 'fil' },
    { id: 'ka-GE', name: 'Georgian', group: 'auto', iso: 'ka' },
    { id: 'gu-IN', name: 'Gujarati', group: 'auto', iso: 'gu' },
    { id: 'is-IS', name: 'Icelandic', group: 'auto', iso: 'is' },
    { id: 'kn-IN', name: 'Kannada', group: 'auto', iso: 'kn' },
    { id: 'km-KH', name: 'Khmer', group: 'auto', iso: 'km' },
    { id: 'lo-LA', name: 'Lao', group: 'auto', iso: 'lo' },
    { id: 'lv-LV', name: 'Latvian', group: 'auto', iso: 'lv' },
    { id: 'lt-LT', name: 'Lithuanian', group: 'auto', iso: 'lt' },
    { id: 'ml-IN', name: 'Malayalam', group: 'auto', iso: 'ml' },
    { id: 'fa-IR', name: 'Persian', group: 'auto', iso: 'fa', rtl: true },
    { id: 'si-LK', name: 'Sinhala', group: 'auto', iso: 'si' },
    { id: 'ta-IN', name: 'Tamil', group: 'auto', iso: 'ta' },
    { id: 'te-IN', name: 'Telugu', group: 'auto', iso: 'te' },
    { id: 'ur-PK', name: 'Urdu', group: 'auto', iso: 'ur', rtl: true },
  ] satisfies LanguageEntry[]
).sort(byName);

/**
 * Recognised, but picked by hand: languages the detector cannot tell apart from a close
 * relative, and regional variants of an auto-detected language (same `iso`).
 */
export const LANGUAGES_MANUAL: readonly LanguageEntry[] = (
  [
    { id: 'ms-MY', name: 'Malay', group: 'manual', iso: 'ms' },
    { id: 'ca-ES', name: 'Catalan', group: 'manual', iso: 'ca' },
    { id: 'hr-HR', name: 'Croatian', group: 'manual', iso: 'hr' },
    { id: 'az-AZ', name: 'Azerbaijani', group: 'manual', iso: 'az' },
    { id: 'eu-ES', name: 'Basque', group: 'manual', iso: 'eu' },
    { id: 'yue-Hant-HK', name: 'Cantonese', group: 'manual', iso: 'yue' },
    { id: 'gl-ES', name: 'Galician', group: 'manual', iso: 'gl' },
    { id: 'jv-ID', name: 'Javanese', group: 'manual', iso: 'jv' },
    { id: 'mr-IN', name: 'Marathi', group: 'manual', iso: 'mr' },
    { id: 'ne-NP', name: 'Nepali', group: 'manual', iso: 'ne' },
    { id: 'sl-SI', name: 'Slovenian', group: 'manual', iso: 'sl' },
    { id: 'su-ID', name: 'Sundanese', group: 'manual', iso: 'su' },
    { id: 'sw-KE', name: 'Swahili', group: 'manual', iso: 'sw' },
    { id: 'zu-ZA', name: 'Zulu', group: 'manual', iso: 'zu' },
    { id: 'en-GB', name: 'English (UK)', group: 'manual', iso: 'en' },
    { id: 'en-AU', name: 'English (Australia)', group: 'manual', iso: 'en' },
    { id: 'en-IN', name: 'English (India)', group: 'manual', iso: 'en' },
    { id: 'es-MX', name: 'Spanish (Mexico)', group: 'manual', iso: 'es' },
    { id: 'pt-BR', name: 'Portuguese (Brazil)', group: 'manual', iso: 'pt' },
    { id: 'fr-CA', name: 'French (Canada)', group: 'manual', iso: 'fr' },
    { id: 'zh-TW', name: 'Chinese (Traditional)', group: 'manual', iso: 'zh' },
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
  // ISO 639-1 codes and legacy aliases that differ from the table's `iso`
  nb: 'no',
  nn: 'no',
  tl: 'fil',
  tgl: 'fil',
  iw: 'he',
  in: 'id',
  ind: 'id',
  ces: 'cs',
  ell: 'el',
  heb: 'he',
  hun: 'hu',
  ron: 'ro',
  slk: 'sk',
  tha: 'th',
  vie: 'vi',
  bul: 'bg',
  srp: 'sr',
  afr: 'af',
  amh: 'am',
  hye: 'hy',
  ben: 'bn',
  est: 'et',
  fil: 'fil',
  kat: 'ka',
  guj: 'gu',
  isl: 'is',
  kan: 'kn',
  khm: 'km',
  lao: 'lo',
  lav: 'lv',
  lit: 'lt',
  mal: 'ml',
  fas: 'fa',
  pes: 'fa',
  sin: 'si',
  tam: 'ta',
  tel: 'te',
  urd: 'ur',
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

/** Number of distinct languages (regional variants counted once). */
export const LANGUAGE_COUNT: number = new Set(ALL_LANGUAGES.map((l) => l.iso)).size;

/**
 * Prefer the user's own regional variant of a detected language when the table has it:
 * a Brazilian browser (pt-BR) reading Portuguese gets pt-BR instead of the default pt-PT.
 * `preferred` is navigator.languages (most preferred first).
 */
export function regionalVariant(locale: string, preferred: readonly string[]): string {
  const iso = languageById(locale)?.iso;
  if (!iso) return locale;
  for (const tag of preferred) {
    const wanted = tag.toLowerCase();
    const hit = ALL_LANGUAGES.find((l) => l.iso === iso && l.id.toLowerCase() === wanted);
    if (hit) return hit.id;
  }
  return locale;
}
