// Setup screen (spec §4).
import { useRef } from 'react';
import { track } from '../analytics';
import { APP_DOMAIN, APP_NAME } from '../brand';
import { loadScript } from '../script/load-script';
import { useRuntimeStore } from '../state/runtime';
import { LanguageDropdown } from './LanguageDropdown';
import { QuickActions } from './QuickActions';
import { RecentScripts } from './RecentScripts';

export function SetupScreen() {
  const scriptText = useRuntimeStore((s) => s.scriptText);
  const setScriptText = useRuntimeStore((s) => s.setScriptText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const empty = scriptText.trim() === '';

  return (
    <div
      id="setupScreen"
      className="mx-auto flex max-w-4xl flex-col p-4 md:p-8 short-landscape:p-2"
    >
      <header className="relative mb-8 text-center short-landscape:mb-3">
        <a
          id="siteLink"
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg short-landscape:hidden"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 17l-5-5m0 0l5-5m-5 5h12"
            />
          </svg>
          {APP_DOMAIN}
        </a>
        <h1
          id="appTitle"
          className="mb-2 bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-3xl font-bold text-transparent short-landscape:mb-1 short-landscape:text-2xl"
        >
          {APP_NAME}
        </h1>
        <p id="appTagline" className="mb-2 text-muted short-landscape:hidden">
          Paste your script. Start talking. It scrolls with you.
        </p>
      </header>

      <main className="flex flex-col gap-6 short-landscape:gap-3">
        <div className="w-full">
          <textarea
            id="inputScript"
            ref={textareaRef}
            data-testid="script-input"
            aria-label="Script text"
            spellCheck={false}
            placeholder="Paste your script here…"
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            className="h-[300px] w-full resize-y rounded-lg border border-line bg-surface p-4 text-base placeholder:text-muted/70 focus:border-transparent focus:ring-2 focus:ring-accent focus:outline-none md:h-[450px] md:text-lg short-landscape:p-2"
          />
          <QuickActions onFocusTextarea={() => textareaRef.current?.focus()} />
        </div>

        <div className="flex justify-center short-landscape:mt-2">
          <button
            id="loadScriptBtn"
            data-testid="start-button"
            type="button"
            aria-disabled={empty}
            disabled={empty}
            className="rounded-full bg-accent px-6 py-2 text-base font-bold text-accent-contrast shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 md:px-8 md:py-3 md:text-lg"
            onClick={() => {
              track('start-teleprompter');
              loadScript(scriptText);
            }}
          >
            Start Teleprompter
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 short-landscape:mt-2">
          <LanguageDropdown idPrefix="setup" />
        </div>

        <RecentScripts />
      </main>
    </div>
  );
}
