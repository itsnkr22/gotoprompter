import { describe, expect, it } from 'vitest';
import { commandTargetIndex, createCommandState, detectCommand } from '../src/commands.js';
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
