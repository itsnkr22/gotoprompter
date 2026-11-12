import { describe, expect, it } from 'vitest';
import {
  ALL_LANGUAGES,
  ISO_TO_LOCALE,
  LANGUAGES_AUTO,
  LANGUAGES_MANUAL,
  LANGUAGE_COUNT,
  languageById,
  regionalVariant,
  resolveLanguage,
} from '../src/languages.js';

describe('languages', () => {
  it('has 51 auto and 21 manual entries covering 65 languages, sorted by name', () => {
    expect(LANGUAGES_AUTO).toHaveLength(51);
    expect(LANGUAGES_MANUAL).toHaveLength(21);
    expect(ALL_LANGUAGES).toHaveLength(72);
    expect(LANGUAGE_COUNT).toBe(65);
    for (const group of [LANGUAGES_AUTO, LANGUAGES_MANUAL]) {
      const names = group.map((l) => l.name);
      expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
    }
    expect(new Set(ALL_LANGUAGES.map((l) => l.id)).size).toBe(72);
    expect(new Set(ALL_LANGUAGES.map((l) => l.name)).size).toBe(72);
  });
  it('gives every auto-detected language exactly one default locale', () => {
    expect(new Set(LANGUAGES_AUTO.map((l) => l.iso)).size).toBe(LANGUAGES_AUTO.length);
    for (const l of ALL_LANGUAGES)
      expect(l.id, l.name).toMatch(/^[a-z]{2,3}(-[A-Z][a-z]{3})?-[A-Z]{2}$/);
  });
  it('maps ISO codes to locales', () => {
    expect(ISO_TO_LOCALE['en']).toBe('en-US');
    expect(ISO_TO_LOCALE['no']).toBe('no-NO');
    expect(ISO_TO_LOCALE['id']).toBe('id-ID');
    expect(ISO_TO_LOCALE['pt']).toBe('pt-PT'); // the regional variant never replaces the default
    expect(ISO_TO_LOCALE['ms']).toBeUndefined(); // manual group has no auto mapping
  });
  it('resolveLanguage handles ISO-1, ISO-3, aliases, unknown and confidence', () => {
    expect(resolveLanguage('fr', 0.9)).toEqual({ locale: 'fr-FR', lowConfidence: false });
    expect(resolveLanguage('deu', 0.4)).toEqual({ locale: 'de-DE', lowConfidence: true });
    expect(resolveLanguage('tl', 1).locale).toBe('fil-PH');
    expect(resolveLanguage('nb', 1).locale).toBe('no-NO');
    expect(resolveLanguage('UK', 1).locale).toBe('uk-UA');
    expect(resolveLanguage('xx', 1)).toEqual({ locale: 'en-US', lowConfidence: false });
    expect(resolveLanguage(undefined, 0)).toEqual({ locale: 'en-US', lowConfidence: true });
  });
  it('flags RTL locales', () => {
    for (const id of ['ar-SA', 'he-IL', 'fa-IR', 'ur-PK']) expect(languageById(id)?.rtl).toBe(true);
    expect(languageById('en-US')?.rtl).toBeUndefined();
  });
  it("prefers the reader's regional variant when the table has it", () => {
    expect(regionalVariant('pt-PT', ['pt-BR', 'en-US'])).toBe('pt-BR');
    expect(regionalVariant('en-US', ['fr-FR', 'en-gb'])).toBe('en-GB');
    expect(regionalVariant('en-US', ['en-ZA'])).toBe('en-US'); // not in the table
    expect(regionalVariant('fr-FR', ['pt-BR'])).toBe('fr-FR'); // different language
    expect(regionalVariant('de-DE', [])).toBe('de-DE');
    expect(regionalVariant('zz-ZZ', ['en-GB'])).toBe('zz-ZZ');
  });
});
