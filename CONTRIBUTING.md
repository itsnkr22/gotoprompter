# Contributing

Thanks for helping improve gotoprompter.

## Reporting bugs

Open an issue with:

- your browser and OS
- the language you were speaking
- what you expected to happen, and what happened instead

A short screen recording helps a lot with scrolling problems.

## Pull requests

1. Fork the repository and create a branch.
2. Run `pnpm install`. Then make sure `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` passes.
3. If you change the engine in `packages/prompter-core`, add or update a test, and regenerate the fixtures:

   ```bash
   pnpm --filter @gotoprompter/test-fixtures generate
   ```
4. Keep each pull request focused on one change and describe what it fixes.

This repository is published from the maintainer's main development repository. A merged pull request is applied there and then shows up here in the next sync, so you will see it land as a sync commit.

By contributing, you agree that your contribution is licensed under the MIT licence.

## Privacy

The web app itself must never upload a script, a recording or audio. Changes that do will not be accepted. Speech recognition is done by the browser's built-in Web Speech API. The only network request the app makes on its own is the Google Docs import, and that only when the user asks for it.
