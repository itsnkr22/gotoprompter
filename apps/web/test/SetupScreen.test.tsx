import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SetupScreen } from '../src/setup/SetupScreen';
import { useHistoryStore } from '../src/state/history';
import { useRuntimeStore } from '../src/state/runtime';
import { DEFAULT_SETTINGS, useSettingsStore } from '../src/state/settings';

describe('SetupScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    useRuntimeStore.getState().reset();
    useHistoryStore.setState({ items: [] });
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  });

  it('disables Start when the script is empty and enables it with text', () => {
    render(<SetupScreen />);
    const start = screen.getByTestId('start-button');
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByTestId('script-input'), { target: { value: 'hello there' } });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(useRuntimeStore.getState().phase).toBe('prompter');
  });

  it('shows the language dropdown states', () => {
    render(<SetupScreen />);
    expect(screen.getByTestId('setup-language-title')).toHaveTextContent('Auto-detect');
    act(() => useRuntimeStore.getState().setLanguages({ detected: 'fr-FR', selected: 'fr-FR' }));
    expect(screen.getByTestId('setup-language-title')).toHaveTextContent('Automatic (French)');
    act(() => useSettingsStore.getState().set('languageSetting', 'de-DE'));
    expect(screen.getByTestId('setup-language-title')).toHaveTextContent('German');
  });

  it('lists history cards with badges and clears them with confirm', () => {
    useHistoryStore.getState().seedDemo('demo script');
    useHistoryStore.getState().save('doc text', 'https://docs.google.com/document/d/x');
    render(<SetupScreen />);
    const cards = screen.getAllByTestId('history-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Google Doc');
    expect(cards[1]).toHaveTextContent('demo');
    window.confirm = () => true;
    fireEvent.click(screen.getByText('Clear History'));
    expect(useHistoryStore.getState().items).toHaveLength(0);
  });

  it('Clear All empties the textarea', () => {
    useRuntimeStore.getState().setScriptText('something');
    render(<SetupScreen />);
    fireEvent.click(document.getElementById('clearScriptBtn')!);
    expect(useRuntimeStore.getState().scriptText).toBe('');
  });
});
