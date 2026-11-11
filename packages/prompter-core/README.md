# @gotoprompter/prompter-core

Pure TypeScript voice-tracking engine for the teleprompter (no DOM, no timers, no I/O).
Specification: `docs/ENGINE_SPEC.md`. Swift port: `apps/mac/PrompterCore`.

```ts
import { tokenize, Matcher, detectCommand, commandTargetIndex, createCommandState, AutoScroller } from '@gotoprompter/prompter-core';

const tokens = tokenize(script, { preserveFormatting: true });
const matcher = new Matcher(tokens, { lookaheadWords: 5 });
const cmdState = createCommandState();

// on every speech update (interim + final text of the current segment):
const cmd = detectCommand(transcript, cmdState, tokens, matcher.currentIndex);
if (cmd) matcher.setIndex(commandTargetIndex(cmd.command, tokens, matcher.currentIndex));
else matcher.feedTranscript(transcript); // → { type: 'near' | 'jump' | 'none' | 'finished', index? }

// Sound / Constant modes:
const scroller = new AutoScroller(tokens, () => matcher.currentIndex, (i) => matcher.setIndex(i), { mode: 'constant', scrollSpeed: 3.5 });
setInterval(() => scroller.tick(performance.now(), 100), 100);
```

`replayScenario` reproduces the golden-fixture harness so hosts and tests share one definition of
"what the engine does".
