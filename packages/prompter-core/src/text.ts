// Text utilities from docs/ENGINE_SPEC.md §3.1 and §3.3.

const NON_ALNUM = /[^\p{L}\p{N}]/gu;
const EMOJI = /\p{Extended_Pictographic}/u;
const SENTENCE_END = /[.!?。！？؟]["'”’)\]]*$/u;
const LETTER = /\p{L}/gu;
const SPACELESS_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Khmer}\p{Script=Lao}\p{Script=Myanmar}]/gu;
const SEGMENT_LANGUAGES = new Set(['ja', 'zh', 'th', 'km', 'lo', 'my']);

/** Lowercase, NFC-normalised letters and digits only. '' when nothing remains. */
export function cleanWord(piece: string): string {
  return piece.normalize('NFC').replace(NON_ALNUM, '').toLowerCase();
}

export function isEmoji(piece: string): boolean {
  return EMOJI.test(piece);
}

export function isSentenceEnd(piece: string): boolean {
  return SENTENCE_END.test(piece);
}

export function languageOf(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  return locale.split(/[-_]/)[0]?.toLowerCase();
}

/**
 * True when the text should be run through a word segmenter: the locale's language is one that
 * writes without spaces, or (locale unknown) more than 30 % of the letters belong to such a script.
 */
export function needsSegmentation(text: string, locale?: string): boolean {
  const lang = languageOf(locale);
  if (lang !== undefined) return SEGMENT_LANGUAGES.has(lang);
  const letters = text.match(LETTER)?.length ?? 0;
  if (letters === 0) return false;
  const spaceless = text.match(SPACELESS_SCRIPT)?.length ?? 0;
  return spaceless / letters > 0.3;
}

const OPENERS = new Set(['[', '(', '{', '"', '“', "'", '‘', '«', '「', '『', '（', '【']);

/**
 * Splits text into space-separated word pieces using Intl.Segmenter when needed; otherwise
 * returns the text unchanged. Punctuation is kept attached to the neighbouring word so that
 * sentence ends and [notes] survive segmentation: opening brackets/quotes attach to the next
 * word, everything else to the previous one.
 */
export function segmentIfNeeded(text: string, locale?: string): string {
  if (!needsSegmentation(text, locale)) return text;
  const segmenter = new Intl.Segmenter(locale ?? 'und', { granularity: 'word' });
  const pieces: string[] = [];
  let pending = '';
  for (const seg of segmenter.segment(text)) {
    const s = seg.segment;
    if (seg.isWordLike) {
      pieces.push(pending + s);
      pending = '';
      continue;
    }
    if (s.trim() === '') continue;
    for (const ch of s) {
      if (OPENERS.has(ch) || pieces.length === 0) pending += ch;
      else pieces[pieces.length - 1] += ch;
    }
  }
  if (pending !== '') pieces.push(pending);
  return pieces.join(' ');
}

/** Spoken text → cleaned tokens (empty ones dropped). */
export function splitSpoken(transcript: string, locale?: string): string[] {
  return segmentIfNeeded(transcript, locale)
    .split(/\s+/u)
    .map(cleanWord)
    .filter((w) => w.length > 0);
}
