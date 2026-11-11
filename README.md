# gotoprompter

A free, open-source teleprompter that follows your voice. It scrolls as you speak, pauses when you
pause, and finds your place again when you skip ahead or go back.

**Use it:** [gotoprompter.app/app/](https://gotoprompter.app/app/) · Website: [gotoprompter.app](https://gotoprompter.app)

- Voice-following scrolling, plus sound-activated and constant-speed modes
- 34 auto-detected languages
- Mirror mode for beam-splitter rigs
- Built-in video recording
- Google Docs import
- Installable PWA that works offline
- No account, and your scripts stay in your browser

## What's in this repository

| Path | What |
|---|---|
| `apps/web` | The web app (Vite + React PWA), served at `/app/` |
| `apps/site` | The marketing website (Astro), which also hosts the built web app |
| `packages/prompter-core` | The TypeScript voice-tracking engine |
| `packages/test-fixtures` | Golden engine fixtures used by the engine tests |
| `packages/ui-tokens` | Colour and typography tokens as CSS custom properties |
| `packages/config` | Shared TypeScript and ESLint presets and brand constants |

A native Mac app is coming soon. It is developed separately and is not part of this repository.

## Develop

You need Node (version in `.nvmrc`) and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev                                   # web app and site dev servers
pnpm --filter @gotoprompter/web dev        # web app only
pnpm lint && pnpm typecheck && pnpm test   # the checks CI runs
pnpm build                                 # production build; the site output is apps/site/dist
```

End-to-end tests use Playwright:

```bash
pnpm --filter @gotoprompter/web exec playwright install chromium webkit
pnpm --filter @gotoprompter/web e2e
```

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE).
