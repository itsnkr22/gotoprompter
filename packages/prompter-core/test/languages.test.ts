import { describe, expect, it } from 'vitest';
import {
  ALL_LANGUAGES,
  ISO_TO_LOCALE,
  LANGUAGES_AUTO,
  LANGUAGES_MANUAL,
  languageById,
  resolveLanguage,
} from '../src/languages.js';

describe('languages', () => {
  it('has 20 auto and 14 manual entries, 34 total, sorted by name', () => {
    expect(LANGUAGES_AUTO).toHaveLength(20);
    expect(LANGUAGES_MANUAL).toHaveLength(14);
    expect(ALL_LANGUAGES).toHaveLength(34);
    const names = LANGUAGES_AUTO.map((l) => l.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
    expect(new Set(ALL_LANGUAGES.map((l) => l.id)).size).toBe(34);
  });
  it('maps ISO codes to locales', () => {
    expect(ISO_TO_LOCALE['en']).toBe('en-US');
    expect(ISO_TO_LOCALE['no']).toBe('no-NO');
    expect(ISO_TO_LOCALE['id']).toBeUndefined(); // manual group has no auto mapping
  });
  it('resolveLanguage handles ISO-1, ISO-3, unknown and confidence', () => {
    expect(resolveLanguage('fr', 0.9)).toEqual({ locale: 'fr-FR', lowConfidence: false });
    expect(resolveLanguage('deu', 0.4)).toEqual({ locale: 'de-DE', lowConfidence: true });
    expect(resolveLanguage('xx', 1)).toEqual({ locale: 'en-US', lowConfidence: false });
    expect(resolveLanguage(undefined, 0)).toEqual({ locale: 'en-US', lowConfidence: true });
  });
  it('flags RTL locales', () => {
    expect(languageById('ar-SA')?.rtl).toBe(true);
    expect(languageById('he-IL')?.rtl).toBe(true);
    expect(languageById('en-US')?.rtl).toBeUndefined();
  });
});
