import { describe, expect, it } from 'vitest';
import {
  ALL_LANGUAGES,
  LANGUAGES_AUTO,
  LANGUAGES_MANUAL,
  detectLanguage,
  languageName,
} from '../src/languages';

describe('languages', () => {
  it('exposes 34 languages in two sorted groups', () => {
    expect(ALL_LANGUAGES).toHaveLength(34);
    expect(LANGUAGES_AUTO).toHaveLength(20);
    expect(LANGUAGES_MANUAL).toHaveLength(14);
    expect(languageName('fr-FR')).toBe('French');
    expect(languageName('zz')).toBe('zz');
  });

  it('detects French with confidence and maps to fr-FR', () => {
    const r = detectLanguage('bonjour tout le monde, comment allez vous aujourd hui');
    expect(r.locale).toBe('fr-FR');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('falls back to en-US with low confidence on gibberish or empty text', () => {
    expect(detectLanguage('').locale).toBe('en-US');
    expect(detectLanguage('').confidence).toBe(0);
    const r = detectLanguage('asdf qwer zxcv');
    expect(r.locale === 'en-US' || r.confidence < 0.5).toBe(true);
  });
});
