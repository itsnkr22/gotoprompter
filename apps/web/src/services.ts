// Module-level registry of long-lived services so non-React modules (loadScript, keyboard,
// mic state machine) can reach the controller, the speech session and the autoscroller.
import type { ScriptToken } from '@gotoprompter/prompter-core';
import type { PrompterController } from './prompter/prompter-controller';
import type { AutoScroller } from './scroll/autoscroller';
import type { SpeechSession } from './speech/speech-session';

export interface Services {
  controller: PrompterController | null;
  speech: SpeechSession | null;
  autoscroller: AutoScroller | null;
  /** Tokens of the script currently loaded (set by loadScript, consumed by PrompterScreen). */
  tokens: ScriptToken[];
  /** Index to restore after a re-tokenize (spec §5.2). */
  pendingRestoreIndex: number | null;
}

export const services: Services = {
  controller: null,
  speech: null,
  autoscroller: null,
  tokens: [],
  pendingRestoreIndex: null,
};
