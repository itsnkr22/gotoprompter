import { useEffect } from 'react';
import { Modals } from './modals/Modals';
import { PrompterScreen } from './prompter/PrompterScreen';
import { SetupScreen } from './setup/SetupScreen';
import { useRuntimeStore } from './state/runtime';

export function App() {
  const phase = useRuntimeStore((r) => r.phase);
  const settingsOpen = useRuntimeStore((r) => r.settingsOpen);

  // The settings panel only exists in the prompter; make sure it is closed in setup.
  useEffect(() => {
    if (phase === 'setup' && settingsOpen) useRuntimeStore.getState().toggleSettings(false);
  }, [phase, settingsOpen]);

  return (
    <div id="appRoot" className="vp-app">
      {phase === 'setup' ? <SetupScreen /> : <PrompterScreen />}
      <Modals />
    </div>
  );
}
