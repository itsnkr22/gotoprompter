import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsPanel } from '../src/settings/SettingsPanel';
import { useFlagsStore } from '../src/state/flags';
import { useRuntimeStore } from '../src/state/runtime';
import { DEFAULT_SETTINGS, useSettingsStore } from '../src/state/settings';

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useRuntimeStore.getState().reset();
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
    useFlagsStore.setState({});
  });

  it('renders sections in order and hides speed/sensitivity in voice mode', () => {
    const { container } = render(<SettingsPanel />);
    const ids = Array.from(container.querySelectorAll('[id]')).map((e) => e.id);
    const order = [
      'settingsLanguageSelect',
      'nativePromoCard',
      'scrollingModeSelect',
      'alignLeftBtn',
      'mirrorToggle',
      'fontSizeInput',
      'themeDarkBtn',
      'dirLtrBtn',
      'fontMonoBtn',
      'resetSettingsBtn',
    ];
    const positions = order.map((id) => ids.indexOf(id));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(container.querySelector('#scrollSpeedContainer')).toHaveClass('hidden');
    expect(container.querySelector('#soundSensitivityContainer')).toHaveClass('hidden');
    // Both mirror axes are available to everyone: different glass rigs need different flips.
    expect(container.querySelector('#hMirrorRow')).not.toHaveClass('hidden');
    expect(container.querySelector('#dirAutoBtn')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('#refreshGoogleDocContainer')).toBeNull();
  });

  it('toggles both mirror axes and shows the Google Doc section when applicable', () => {
    useRuntimeStore.getState().setGoogleDocUrl('https://docs.google.com/document/d/x');
    const { container } = render(<SettingsPanel />);
    expect(container.querySelector('#mirrorModeLabel')).toHaveTextContent('Mirror Mode');
    fireEvent.click(container.querySelector('#mirrorToggle')!);
    fireEvent.click(container.querySelector('#hMirrorToggle')!);
    expect(useSettingsStore.getState().mirrorVertical).toBe(true);
    expect(useSettingsStore.getState().mirrorHorizontal).toBe(true);
    expect(container.querySelector('#refreshGoogleDocContainer')).not.toBeNull();
  });

  it('applies live changes to the store', () => {
    const { container } = render(<SettingsPanel />);
    fireEvent.change(container.querySelector('#scrollingModeSelect')!, {
      target: { value: 'sound' },
    });
    expect(useSettingsStore.getState().scrollingMode).toBe('sound');
    expect(container.querySelector('#soundSensitivityContainer')).not.toHaveClass('hidden');
    fireEvent.change(container.querySelector('#fontSizeInput')!, { target: { value: '64' } });
    expect(useSettingsStore.getState().fontSize).toBe(64);
    fireEvent.click(container.querySelector('#alignCenterBtn')!);
    expect(useSettingsStore.getState().textAlign).toBe('center');
    fireEvent.click(container.querySelector('#themeLightBtn')!);
    expect(useSettingsStore.getState().bgColor).toBe('#ffffff');
    fireEvent.click(container.querySelector('#fontDyslexicBtn')!);
    expect(useSettingsStore.getState().fontFamily).toBe('dyslexic');
    fireEvent.click(container.querySelector('#closeSettingsBtn')!);
    expect(useRuntimeStore.getState().settingsOpen).toBe(false);
  });
});
