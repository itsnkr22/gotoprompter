// Language dropdown shared by the setup screen and the settings panel (spec §4.5).
import { useEffect, useId, useRef, useState } from 'react';
import { track } from '../analytics';
import { LANGUAGES_AUTO, LANGUAGES_MANUAL, detectLanguage, languageName } from '../languages';
import { COPY } from '../modals/copy';
import { services } from '../services';
import { useRuntimeStore } from '../state/runtime';
import { useSettingsStore } from '../state/settings';

const openDropdowns = new Set<() => void>();
export function closeAllDropdowns(): void {
  for (const close of openDropdowns) close();
}

export function handleLanguageChange(value: string): void {
  track('language-select', { language: value });
  const settings = useSettingsStore.getState();
  const runtime = useRuntimeStore.getState();
  settings.set('languageSetting', value);
  if (value === 'auto') {
    const text = runtime.scriptText.trim();
    if (text) {
      const d = detectLanguage(text);
      runtime.setLanguages({ detected: d.locale, selected: d.locale });
      if (d.confidence < 0.5)
        runtime.showToast('langDetectionWarning', COPY.langDetectionWarning, 6000);
    } else {
      runtime.setLanguages({ detected: null, selected: 'en-US' });
    }
  } else {
    runtime.setLanguages({ detected: null, selected: value });
  }
  const selected = useRuntimeStore.getState().selectedLanguage;
  services.speech?.setLanguage(selected);
  services.controller?.configureMatcher({ locale: selected });
}

export function dropdownTitle(languageSetting: string, detected: string | null): string {
  if (languageSetting === 'auto')
    return detected ? `Automatic (${languageName(detected)})` : 'Auto-detect';
  return languageName(languageSetting);
}

interface Props {
  idPrefix: 'setup' | 'settings';
}

export function LanguageDropdown({ idPrefix }: Props) {
  const languageSetting = useSettingsStore((s) => s.languageSetting);
  const detected = useRuntimeStore((s) => s.detectedLanguage);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const options = [
    { value: 'auto', name: 'Automatic', group: 'top' as const },
    ...LANGUAGES_AUTO.map((l) => ({ value: l.id, name: l.name, group: 'auto' as const })),
    ...LANGUAGES_MANUAL.map((l) => ({ value: l.id, name: l.name, group: 'manual' as const })),
  ];

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    openDropdowns.add(close);
    const onWindowClick = (): void => close();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('click', onWindowClick);
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      const rect = menuRef.current?.getBoundingClientRect();
      setAbove(!!rect && rect.bottom > window.innerHeight);
    });
    return () => {
      openDropdowns.delete(close);
      window.removeEventListener('click', onWindowClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const select = (value: string): void => {
    handleLanguageChange(value);
    setOpen(false);
  };

  const onToggleKey = (e: React.KeyboardEvent): void => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = options[activeIndex];
      if (o) select(o.value);
    }
  };

  const detectedLabel = detected ? `${languageName(detected)} detected` : '';
  const renderOption = (o: (typeof options)[number], index: number) => (
    <button
      key={o.value}
      type="button"
      role="option"
      id={`${idPrefix}LangOpt-${o.value}`}
      aria-selected={languageSetting === o.value}
      data-value={o.value}
      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-raised ${
        activeIndex === index ? 'bg-raised' : ''
      } ${o.group === 'top' ? 'py-2 font-medium text-fg' : 'text-fg/90'}`}
      onClick={(e) => {
        e.stopPropagation();
        select(o.value);
      }}
    >
      <span>{o.name}</span>
      {o.group === 'top' ? (
        <span className="ml-2 truncate text-[10px] text-muted" data-testid="auto-detected-label">
          {detectedLabel}
        </span>
      ) : null}
      {o.group === 'auto' ? (
        <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-accent">
          AUTO
        </span>
      ) : null}
    </button>
  );

  return (
    <div id={`${idPrefix}LanguageSelect`} className="relative min-w-[200px]">
      <button
        id={`${idPrefix}LanguageToggle`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="flex h-[38px] w-full items-center justify-between rounded border border-line bg-raised px-3 text-left text-sm text-fg hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={(e) => {
          e.stopPropagation();
          closeAllDropdowns();
          setOpen((v) => !v);
        }}
        onKeyDown={onToggleKey}
      >
        <span className="truncate font-medium" data-testid={`${idPrefix}-language-title`}>
          {dropdownTitle(languageSetting, detected)}
        </span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={`${idPrefix}LanguageMenu`}
          role="listbox"
          aria-activedescendant={`${idPrefix}LangOpt-${options[activeIndex]?.value ?? 'auto'}`}
          className={`vp-no-scrollbar absolute z-50 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-2xl max-h-[60vh] sm:max-h-[300px] ${
            above ? 'bottom-full mb-2' : 'top-full mt-1'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-2">
            {renderOption(options[0]!, 0)}
            <div className="mt-1 px-3 py-1 text-[10px] font-bold tracking-wider text-muted uppercase">
              With auto-detection
            </div>
            {options.map((o, i) => (o.group === 'auto' ? renderOption(o, i) : null))}
            <div className="mt-2 border-t border-line px-3 py-1 pt-2 text-[10px] font-bold tracking-wider text-muted uppercase">
              Manual selection
            </div>
            {options.map((o, i) => (o.group === 'manual' ? renderOption(o, i) : null))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
