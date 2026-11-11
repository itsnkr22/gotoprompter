// Settings panel (spec §9). Section order is normative.
import { useEffect, useRef } from 'react';
import { track, trackDebounced } from '../analytics';
import { COPY } from '../modals/copy';
import { stopAllScrolling } from '../prompter/mic-state';
import { reloadCurrentScript } from '../script/load-script';
import { services } from '../services';
import { LanguageDropdown } from '../setup/LanguageDropdown';
import { useFlagsStore } from '../state/flags';
import { useRuntimeStore } from '../state/runtime';
import type {
  FontFamily,
  ScrollingMode,
  Settings,
  TextAlign,
  TextDirection,
} from '../state/settings';
import { useSettingsStore } from '../state/settings';
import { DeviceSelectors } from './DeviceSelectors';
import { GoogleDocConnection } from './GoogleDocConnection';
import { NativePromoCard } from './NativePromoCard';
import { Segmented } from './controls/Segmented';
import { Slider } from './controls/Slider';
import { Toggle } from './controls/Toggle';

const MODE_DESCRIPTIONS: Record<ScrollingMode, string> = {
  voice: 'Follows the words you say and waits when you pause.',
  sound: 'Scrolls while the microphone hears you and pauses in silence.',
  constant: 'Scrolls at a steady speed you choose. No microphone needed.',
};

const AlignIcon = ({ d }: { d: string }) => (
  <svg
    className="mx-auto h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
  </svg>
);

export function SettingsPanel() {
  const s = useSettingsStore();
  const betaHMirror = useFlagsStore((f) => f.betaHMirror);
  const toggleSettings = useRuntimeStore((r) => r.toggleSettings);
  const googleDocUrl = useRuntimeStore((r) => r.googleDocUrl);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    track('settings-toggle');
    return () => document.getElementById('toggleSettingsBtn')?.focus();
  }, []);

  const setKey = <K extends keyof Settings>(key: K, value: Settings[K]): void => {
    s.set(key, value);
    trackDebounced('settings-change', key);
  };

  const onModeChange = (mode: ScrollingMode): void => {
    stopAllScrolling();
    setKey('scrollingMode', mode);
  };

  return (
    <aside
      ref={panelRef}
      id="settingsPanel"
      role="dialog"
      aria-label="Settings"
      className="vp-no-scrollbar fixed top-4 right-4 z-[9999] max-h-[85vh] w-80 overflow-y-auto rounded-xl border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="sticky top-0 z-10 flex h-0 justify-end overflow-visible">
        <button
          id="closeSettingsBtn"
          type="button"
          aria-label="Close settings"
          title="Close settings"
          className="-mt-2 -mr-2 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface/90 text-muted shadow-lg backdrop-blur hover:bg-raised hover:text-fg"
          onClick={() => toggleSettings(false)}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <h3 className="mb-4 text-sm font-bold tracking-wider text-muted uppercase">Settings</h3>

      {googleDocUrl ? <GoogleDocConnection /> : null}

      <div className="mb-4 border-b border-line pb-4">
        <label className="mb-2 block text-xs text-muted">Dictation Language</label>
        <LanguageDropdown idPrefix="settings" />
      </div>

      <NativePromoCard />

      <div className="mb-4 border-b border-line pb-4">
        <label htmlFor="scrollingModeSelect" className="mb-2 block text-xs text-muted">
          Scrolling Mode
        </label>
        <div className="relative w-full">
          <select
            id="scrollingModeSelect"
            value={s.scrollingMode}
            onChange={(e) => onModeChange(e.target.value as ScrollingMode)}
            className="h-[38px] w-full appearance-none rounded border border-line bg-raised px-3 pr-8 text-sm text-fg focus:ring-2 focus:ring-accent focus:outline-none"
          >
            <option value="voice">Voice Scrolling</option>
            <option value="sound">Sound Scrolling</option>
            <option value="constant">Constant Scrolling</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-4 w-4 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        <p id="scrollingModeDescription" className="mt-1.5 text-[10px] leading-normal text-muted">
          {MODE_DESCRIPTIONS[s.scrollingMode]}
        </p>
        <div id="scrollSpeedContainer" className={s.scrollingMode === 'voice' ? 'hidden' : 'mt-4'}>
          <Slider
            id="scrollSpeed"
            rangeKey="scrollSpeed"
            label="Scroll Speed"
            value={s.scrollSpeed}
            readout={`${s.scrollSpeed.toFixed(1)} w/s`}
            hint="Average speaking pace is roughly 2–3 words per second."
            onChange={(v) => {
              setKey('scrollSpeed', v);
              services.autoscroller?.setSpeed(v);
            }}
          />
        </div>
        <div
          id="soundSensitivityContainer"
          className={s.scrollingMode === 'sound' ? 'mt-4' : 'hidden'}
        >
          <Slider
            id="soundSensitivity"
            rangeKey="soundSensitivity"
            label="Sound Sensitivity"
            value={s.soundSensitivity}
            readout={`${Math.round(s.soundSensitivity * 100)}%`}
            hint="Increase if scrolling stops too often; decrease if it scrolls during silence."
            onChange={(v) => setKey('soundSensitivity', v)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-xs text-muted">Alignment</label>
        <Segmented<TextAlign>
          value={s.textAlign}
          onChange={(v) => setKey('textAlign', v)}
          options={[
            {
              value: 'left',
              id: 'alignLeftBtn',
              ariaLabel: 'Align left',
              label: <AlignIcon d="M4 6h16M4 12h10M4 18h16" />,
            },
            {
              value: 'center',
              id: 'alignCenterBtn',
              ariaLabel: 'Align center',
              label: <AlignIcon d="M4 6h16M4 12h16M4 18h16" />,
            },
            {
              value: 'right',
              id: 'alignRightBtn',
              ariaLabel: 'Align right',
              label: <AlignIcon d="M4 6h16M10 12h10M4 18h16" />,
            },
          ]}
        />
      </div>

      <div className="mb-6 space-y-3 border-b border-line pb-6">
        <Toggle
          id="mirrorToggle"
          labelId="mirrorModeLabel"
          label={betaHMirror ? 'Mirror Mode (vertical)' : 'Mirror Mode'}
          checked={s.mirrorVertical}
          onChange={(v) => setKey('mirrorVertical', v)}
        />
        <Toggle
          id="hMirrorToggle"
          rowId="hMirrorRow"
          hidden={!betaHMirror}
          label="Mirror Mode (horizontal)"
          checked={s.mirrorHorizontal}
          onChange={(v) => setKey('mirrorHorizontal', v)}
        />
        <Toggle
          id="stopSignToggle"
          label="Show Stop Signs"
          checked={s.showStopSigns}
          onChange={(v) => setKey('showStopSigns', v)}
        />
        <Toggle
          id="voiceCommandToggle"
          label="Voice Commands"
          hint={'Say "go back", "go next", "go start" or "go finish"'}
          checked={s.voiceCommandsEnabled}
          onChange={(v) => setKey('voiceCommandsEnabled', v)}
        />
        <Toggle
          id="screenRotationToggle"
          label="Rotate Screen"
          hint="90° clockwise for iOS"
          checked={s.screenRotated}
          onChange={(v) => setKey('screenRotated', v)}
        />
        <Toggle
          id="preserveFormattingToggle"
          label="Preserve Formatting"
          checked={s.preserveFormatting}
          onChange={(v) => {
            setKey('preserveFormatting', v);
            reloadCurrentScript();
          }}
        />
        <Toggle
          id="smoothAnimationsToggle"
          label="Smooth Animations"
          hint="Smoother scroll & highlighting"
          checked={s.smoothAnimations}
          onChange={(v) => setKey('smoothAnimations', v)}
        />
        <Toggle
          id="highlightActiveWordToggle"
          label="Highlight Active Word"
          hint="Underline on the current word"
          checked={s.highlightActiveWord}
          onChange={(v) => setKey('highlightActiveWord', v)}
        />
      </div>

      <Slider
        id="fontSize"
        rangeKey="fontSize"
        label="Font Size"
        value={s.fontSize}
        readout={`${s.fontSize}px`}
        onChange={(v) => setKey('fontSize', v)}
      />
      <Slider
        id="lineHeight"
        rangeKey="lineHeight"
        label="Line Spacing"
        value={s.lineHeight}
        readout={`${s.lineHeight.toFixed(1)}x`}
        onChange={(v) => setKey('lineHeight', v)}
      />
      <Slider
        id="paragraphSpacing"
        rangeKey="paragraphSpacing"
        label="Paragraph Spacing"
        value={s.paragraphSpacing}
        readout={`${s.paragraphSpacing.toFixed(1)}em`}
        onChange={(v) => setKey('paragraphSpacing', v)}
      />
      <Slider
        id="margin"
        rangeKey="margin"
        label="Side Margins"
        value={s.margin}
        readout={`${s.margin}%`}
        onChange={(v) => setKey('margin', v)}
      />
      <Slider
        id="dockOpacity"
        rangeKey="dockOpacity"
        label="Recording Dock Opacity"
        value={s.dockOpacity}
        readout={`${s.dockOpacity}%`}
        onChange={(v) => setKey('dockOpacity', v)}
      />
      <Slider
        id="activeLinePosition"
        rangeKey="activeLinePosition"
        label="Active Line Position"
        value={s.activeLinePosition}
        readout={`${s.activeLinePosition}%`}
        onChange={(v) => {
          setKey('activeLinePosition', v);
          services.controller?.scrollToCurrent({ animate: false });
        }}
      />
      <Slider
        id="lookaheadWords"
        rangeKey="lookaheadWords"
        label="Lookahead Words"
        value={s.lookaheadWords}
        readout={`${s.lookaheadWords}`}
        onChange={(v) => {
          setKey('lookaheadWords', v);
          services.controller?.configureMatcher();
        }}
      />

      <DeviceSelectors />

      <div className="mt-6">
        <div className="grid grid-cols-2 gap-2">
          <button
            id="themeDarkBtn"
            type="button"
            className="rounded border border-line bg-raised px-3 py-2 text-xs text-fg hover:bg-line"
            onClick={() => s.applyTheme('dark')}
          >
            Dark Theme
          </button>
          <button
            id="themeLightBtn"
            type="button"
            className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-black hover:bg-gray-100"
            onClick={() => s.applyTheme('light')}
          >
            Light Theme
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="textColorInput" className="mb-1 block text-xs text-muted">
            Text Color
          </label>
          <div className="flex items-center rounded border border-line bg-raised p-1">
            <input
              id="textColorInput"
              type="color"
              value={s.textColor}
              onChange={(e) => setKey('textColor', e.target.value)}
              className="mr-2 h-8 w-8 cursor-pointer rounded border-none bg-transparent p-0"
            />
            <span id="textColorVal" className="font-mono text-xs text-fg/90">
              {s.textColor}
            </span>
          </div>
        </div>
        <div>
          <label htmlFor="bgColorInput" className="mb-1 block text-xs text-muted">
            Background
          </label>
          <div className="flex items-center rounded border border-line bg-raised p-1">
            <input
              id="bgColorInput"
              type="color"
              value={s.bgColor}
              onChange={(e) => setKey('bgColor', e.target.value)}
              className="mr-2 h-8 w-8 cursor-pointer rounded border-none bg-transparent p-0"
            />
            <span id="bgColorVal" className="font-mono text-xs text-fg/90">
              {s.bgColor}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <label className="mb-2 block text-xs text-muted">Text Direction</label>
        <Segmented<TextDirection>
          grid
          value={s.textDirection}
          onChange={(v) => setKey('textDirection', v)}
          options={[
            { value: 'ltr', id: 'dirLtrBtn', label: 'Left to Right', ariaLabel: 'Left to Right' },
            { value: 'rtl', id: 'dirRtlBtn', label: 'Right to Left', ariaLabel: 'Right to Left' },
          ]}
        />
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <label className="mb-2 block text-xs text-muted">Font Style</label>
        <Segmented<FontFamily>
          grid
          value={s.fontFamily}
          onChange={(v) => setKey('fontFamily', v)}
          options={[
            {
              value: 'mono',
              id: 'fontMonoBtn',
              label: 'Mono',
              ariaLabel: 'Monospace',
              style: { fontFamily: 'var(--vp-font-mono)' },
            },
            {
              value: 'sans',
              id: 'fontSansBtn',
              label: 'Sans',
              ariaLabel: 'Sans-serif',
              style: { fontFamily: 'var(--vp-font-sans)' },
            },
            {
              value: 'serif',
              id: 'fontSerifBtn',
              label: 'Serif',
              ariaLabel: 'Serif',
              style: { fontFamily: 'var(--vp-font-serif)' },
            },
            {
              value: 'comic',
              id: 'fontComicBtn',
              label: 'Comic Sans',
              ariaLabel: 'Comic Sans',
              style: { fontFamily: 'var(--vp-font-comic)' },
            },
            {
              value: 'dyslexic',
              id: 'fontDyslexicBtn',
              label: 'OpenDyslexic',
              ariaLabel: 'OpenDyslexic',
              style: { fontFamily: 'var(--vp-font-dyslexic)' },
              className: 'col-span-2',
            },
          ]}
        />
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-[11px] text-muted">
        <span>Settings are saved on this device.</span>
        <button
          id="resetSettingsBtn"
          type="button"
          className="underline hover:text-fg"
          onClick={() => {
            if (window.confirm(COPY.resetSettingsConfirm)) {
              stopAllScrolling();
              s.reset();
              reloadCurrentScript();
            }
          }}
        >
          Reset to defaults
        </button>
      </div>
    </aside>
  );
}
