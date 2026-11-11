import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePrompterKey } from '../src/prompter/keyboard';
import { services } from '../src/services';
import { useRuntimeStore } from '../src/state/runtime';

function key(k: string, target?: HTMLElement): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: k, cancelable: true });
  if (target) Object.defineProperty(e, 'target', { value: target });
  return e;
}

describe('prompter shortcuts', () => {
  const controller = { navigateParagraph: vi.fn(), step: vi.fn(), restart: vi.fn() };
  beforeEach(() => {
    useRuntimeStore.getState().reset();
    useRuntimeStore.getState().setPhase('prompter');
    services.controller = controller as never;
    services.speech = { start: vi.fn(), stop: vi.fn() } as never;
    vi.clearAllMocks();
  });

  it('ignores keys outside the prompter, in inputs, and while a modal is open', () => {
    const input = document.createElement('input');
    expect(handlePrompterKey(key('r', input))).toBe(false);
    useRuntimeStore.getState().openModalId('browserUnsupported');
    expect(handlePrompterKey(key('r'))).toBe(false);
    useRuntimeStore.getState().closeModal();
    useRuntimeStore.getState().setPhase('setup');
    expect(handlePrompterKey(key('r'))).toBe(false);
  });

  it('maps arrows, S, Escape and R', () => {
    expect(handlePrompterKey(key('ArrowLeft'))).toBe(true);
    expect(controller.navigateParagraph).toHaveBeenCalledWith(-1);
    handlePrompterKey(key('ArrowRight'));
    expect(controller.navigateParagraph).toHaveBeenCalledWith(1);
    handlePrompterKey(key('ArrowDown'));
    expect(controller.step).toHaveBeenCalledWith(1);
    handlePrompterKey(key('R'));
    expect(controller.restart).toHaveBeenCalled();
    handlePrompterKey(key('s'));
    expect(useRuntimeStore.getState().settingsOpen).toBe(true);
    handlePrompterKey(key('Escape'));
    expect(useRuntimeStore.getState().settingsOpen).toBe(false);
    expect(useRuntimeStore.getState().phase).toBe('prompter');
    handlePrompterKey(key('Escape'));
    expect(useRuntimeStore.getState().phase).toBe('setup');
  });

  it('Space toggles the mic and prevents default', () => {
    const e = key(' ');
    expect(handlePrompterKey(e)).toBe(true);
    expect(e.defaultPrevented).toBe(true);
  });
});
