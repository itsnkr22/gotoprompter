// Tokenizer from docs/ENGINE_SPEC.md §3.2.
import { cleanWord, isEmoji, isSentenceEnd, segmentIfNeeded } from './text.js';
import type { ScriptToken, TokenizeOptions } from './types.js';

export function tokenize(input: string, options: TokenizeOptions): ScriptToken[] {
  const text = input.replace(/\r\n?/g, '\n').trim();
  if (text === '') return [];
  const tokens: ScriptToken[] = [];
  let inBracket = false;

  const push = (t: Omit<ScriptToken, 'index'>): void => {
    tokens.push({ ...t, index: tokens.length });
  };
  const pushBreak = (): void =>
    push({ raw: '', clean: '', kind: 'break', skip: true, isNote: false, isSentenceEnd: false });
  const pushStop = (): void =>
    push({ raw: '🛑', clean: '', kind: 'stop', skip: true, isNote: false, isSentenceEnd: false });

  // preserveFormatting = true : every '\n' becomes a break token.
  // preserveFormatting = false: every run of one or more '\n' becomes ONE stop token.
  const chunks = options.preserveFormatting ? text.split('\n') : text.split(/\n+/);
  for (let ci = 0; ci < chunks.length; ci++) {
    if (ci > 0) {
      if (options.preserveFormatting) pushBreak();
      else pushStop();
    }
    const chunk = chunks[ci] ?? '';
    const pieces = segmentIfNeeded(chunk, options.locale)
      .split(/\s+/u)
      .filter((p) => p !== '');
    for (const piece of pieces) {
      const opens = piece.includes('[');
      const closes = piece.includes(']');
      if (opens) inBracket = true;
      const isNote = inBracket; // inclusive of the opening and closing pieces
      if (closes) inBracket = false;
      const clean = cleanWord(piece);
      const skip = isNote || isEmoji(piece) || clean === '';
      push({ raw: piece, clean, kind: 'word', skip, isNote, isSentenceEnd: isSentenceEnd(piece) });
    }
  }
  return tokens;
}
