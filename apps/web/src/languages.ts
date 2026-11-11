// Language detection (spec §5.1) on top of the core tables (Registry C).
import {
  ALL_LANGUAGES,
  LANGUAGES_AUTO,
  LANGUAGES_MANUAL,
  resolveLanguage,
} from '@gotoprompter/prompter-core';
import type { LanguageEntry } from '@gotoprompter/prompter-core';
import { detectAll } from 'tinyld/light';

export { ALL_LANGUAGES, LANGUAGES_AUTO, LANGUAGES_MANUAL };
export type { LanguageEntry };

export function languageName(id: string): string {
  return ALL_LANGUAGES.find((l) => l.id === id)?.name ?? id;
}

export function detectLanguage(text: string): { locale: string; confidence: number } {
  const results = detectAll(text);
  const top = results[0];
  const { locale } = resolveLanguage(top?.lang, top?.accuracy ?? 0);
  return { locale, confidence: top?.accuracy ?? 0 };
}
