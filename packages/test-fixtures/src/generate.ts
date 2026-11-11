// Generates fixtures/*.json from scenarios/*.json using the TypeScript engine.
// `--check` fails (exit 1) when any committed fixture differs from the regenerated one.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { replayScenario, type Scenario } from '@gotoprompter/prompter-core';
import { fixturesDir, listScenarios } from './index.js';

const check = process.argv.includes('--check');
mkdirSync(fixturesDir, { recursive: true });
let drift = 0;
for (const { name, ...scenario } of listScenarios()) {
  const result = replayScenario(scenario as Scenario);
  const fixture = { ...scenario, ...result };
  const json = JSON.stringify(fixture, null, 2) + '\n';
  const file = join(fixturesDir, `${name}.json`);
  if (check) {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (current !== json) {
      drift++;
      console.error(`fixture drift: ${name}`);
    }
  } else {
    writeFileSync(file, json);
    console.log(
      `wrote ${name} (${result.tokens.length} tokens, ${result.expectIndexAfterEach.length} events)`,
    );
  }
}
if (check) {
  if (drift > 0) {
    console.error(
      `${drift} fixture(s) differ from the engine. Run: pnpm --filter @gotoprompter/test-fixtures generate`,
    );
    process.exit(1);
  }
  console.log('fixtures are in sync with the engine');
}
