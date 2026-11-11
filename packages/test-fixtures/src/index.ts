import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReplayResult, Scenario } from '@gotoprompter/prompter-core';

/** A generated golden fixture: the scenario plus the engine's recorded behaviour. */
export interface Fixture extends Scenario, ReplayResult {
  name: string;
}

const here = dirname(fileURLToPath(import.meta.url));
/** Hand-written scenarios (no expectations). Also read by nothing else. */
export const scenariosDir = join(here, '..', 'scenarios');
/** Generated fixtures (scenario + tokens + expectations). Also read by the Swift tests. */
export const fixturesDir = join(here, '..', 'fixtures');

function readJsonDir<T>(dir: string): Array<T & { name: string }> {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const data = JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
      return { name: file.replace(/\.json$/, ''), ...data };
    });
}

export function listScenarios(dir: string = scenariosDir): Array<Scenario & { name: string }> {
  return readJsonDir<Scenario>(dir);
}

export function listFixtures(dir: string = fixturesDir): Fixture[] {
  return readJsonDir<Omit<Fixture, 'name'>>(dir);
}
