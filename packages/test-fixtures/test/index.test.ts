import { describe, expect, it } from 'vitest';
import { replayScenario } from '@gotoprompter/prompter-core';
import { listFixtures, listScenarios } from '../src/index.js';

describe('golden fixtures', () => {
  it('has a fixture for every scenario and vice versa', () => {
    const scenarios = listScenarios().map((s) => s.name);
    const fixtures = listFixtures().map((f) => f.name);
    expect(fixtures).toEqual(scenarios);
    expect(scenarios.length).toBeGreaterThanOrEqual(24);
  });

  it('every fixture has one expected index and result per event', () => {
    for (const f of listFixtures()) {
      expect(f.expectIndexAfterEach, f.name).toHaveLength(f.events.length);
      expect(f.expectResults, f.name).toHaveLength(f.events.length);
    }
  });

  it('every committed fixture matches the current engine (parity guard)', () => {
    for (const f of listFixtures()) {
      const { name, tokens, expectIndexAfterEach, expectResults, ...scenario } = f;
      const r = replayScenario(scenario);
      expect(r.tokens, name).toEqual(tokens);
      expect(r.expectIndexAfterEach, name).toEqual(expectIndexAfterEach);
      expect(r.expectResults, name).toEqual(expectResults);
    }
  });
});
