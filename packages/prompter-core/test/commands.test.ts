import { describe, expect, it } from 'vitest';
import {
  commandTargetIndex,
  createCommandState,
  detectCommand,
  matchCommandPhrase,
} from '../src/commands.js';
import { tokenize } from '../src/tokenizer.js';

const t = tokenize('first part here.\nsecond part here.\nthird part here.', {
  preserveFormatting: true,
});

describe('detectCommand', () => {
  it('detects the four commands and the "go to" forms', () => {
    const s = createCommandState();
    expect(detectCommand('please go next', s, t, 0)).toEqual({ command: 'go next' });
    s.armed = true;
    expect(detectCommand('go back', s, t, 0)).toEqual({ command: 'go back' });
    s.armed = true;
    expect(detectCommand('go to start', s, t, 0)).toEqual({ command: 'go start' });
    s.armed = true;
    expect(detectCommand('and go to finish', s, t, 0)).toEqual({ command: 'go finish' });
  });

  it('needs at least two words and re-arms on non-commands', () => {
    const s = createCommandState();
    s.armed = false;
    expect(detectCommand('go', s, t, 0)).toBeNull();
    expect(s.armed).toBe(true);
    s.armed = false;
    expect(detectCommand('hello there', s, t, 0)).toBeNull();
    expect(s.armed).toBe(true);
  });

  it('fires once per utterance until re-armed', () => {
    const s = createCommandState();
    expect(detectCommand('go next', s, t, 0)).toEqual({ command: 'go next' });
    expect(detectCommand('go next', s, t, 0)).toBeNull();
    expect(detectCommand('go next please', s, t, 0)).toBeNull();
    expect(s.armed).toBe(true);
    expect(detectCommand('go next', s, t, 0)).toEqual({ command: 'go next' });
  });

  it('suppresses a command that the script itself says near the reading position', () => {
    const script = tokenize('when you are done go back to the office and rest', {
      preserveFormatting: true,
    });
    const s = createCommandState();
    expect(detectCommand('done go back', s, script, 2)).toBeNull();
    expect(s.armed).toBe(true);
    // far away from the phrase the command works
    expect(detectCommand('go back', s, script, 9)).toEqual({ command: 'go back' });
  });
});

describe('command aliases', () => {
  const fire = (said: string, script = t, at = 0) =>
    detectCommand(said, createCommandState(), script, at)?.command ?? null;

  it('accepts back / forward / restart and their synonyms', () => {
    expect(fire('go forward')).toBe('go next');
    expect(fire('go previous')).toBe('go back');
    expect(fire('go restart')).toBe('go start');
    expect(fire('go beginning')).toBe('go start');
    expect(fire('go top')).toBe('go start');
    expect(fire('go end')).toBe('go finish');
    expect(fire('go bottom')).toBe('go finish');
  });

  it('accepts "go to", "go the" and "go to the" forms', () => {
    expect(fire('now go to the end')).toBe('go finish');
    expect(fire('go to the beginning')).toBe('go start');
    expect(fire('go the next')).toBe('go next');
    expect(matchCommandPhrase(['go', 'to', 'the', 'end'])).toEqual({
      command: 'go finish',
      words: ['go', 'to', 'the', 'end'],
    });
  });

  it('rejects near misses', () => {
    expect(fire('back')).toBeNull();
    expect(fire('going back')).toBeNull();
    expect(fire('go right back')).toBeNull();
    expect(fire('go to a start')).toBeNull();
    expect(fire('go back now')).toBeNull();
    expect(fire('ago forward')).toBeNull();
    expect(matchCommandPhrase([])).toBeNull();
    expect(matchCommandPhrase(['go'])).toBeNull();
  });

  it('suppresses an alias or a long form that the script itself says nearby', () => {
    const forward = tokenize('from here we go forward with the plan and then stop', {
      preserveFormatting: true,
    });
    expect(fire('we go forward', forward, 2)).toBeNull();
    // canonical "go next" is not in the script, but the spoken alias is
    const toTheEnd = tokenize('read this all the way and go to the end of the page', {
      preserveFormatting: true,
    });
    expect(fire('go to the end', toTheEnd, 5)).toBeNull();
    expect(fire('go to the end', forward, 2)).toBe('go finish');
  });
});

describe('commandTargetIndex', () => {
  // tokens: first0 part1 here.2 br3 second4 part5 here.6 br7 third8 part9 here.10
  it('maps commands to indices', () => {
    expect(commandTargetIndex('go start', t, 5)).toBe(0);
    expect(commandTargetIndex('go finish', t, 5)).toBe(10);
    expect(commandTargetIndex('go next', t, 0)).toBe(4);
    expect(commandTargetIndex('go back', t, 6)).toBe(4);
    expect(commandTargetIndex('go back', t, 4)).toBe(0);
  });
});
