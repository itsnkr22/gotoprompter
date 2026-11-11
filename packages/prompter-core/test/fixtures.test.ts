import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { replayScenario, type Scenario } from '../src/index.js';

// Read the shared fixtures by path (no package dependency: test-fixtures depends on this package).
const fixturesDir = join(import.meta.dirname, '..', '..', 'test-fixtures', 'fixtures');
const files = readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

describe('shared golden fixtures', () => {
  it('exist', () => {
    expect(files.length).toBeGreaterThanOrEqual(24);
  });
  for (const file of files) {
    it(file, () => {
      const f = JSON.parse(readFileSync(join(fixturesDir, file), 'utf8')) as Scenario & {
        tokens: unknown;
        expectIndexAfterEach: number[];
        expectResults: string[];
      };
      const r = replayScenario({
        script: f.script,
        events: f.events,
        ...(f.options ? { options: f.options } : {}),
      });
      expect(r.tokens).toEqual(f.tokens);
      expect(r.expectIndexAfterEach).toEqual(f.expectIndexAfterEach);
      expect(r.expectResults).toEqual(f.expectResults);
    });
  }
});
