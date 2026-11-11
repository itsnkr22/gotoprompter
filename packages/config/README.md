# @gotoprompter/config

Shared configuration for the workspace:

* `tsconfig.base.json` — strict TypeScript defaults (no DOM).
* `tsconfig.dom.json` — base + DOM libs + React JSX.
* `eslint.js` — flat-config preset used by the root `eslint.config.js`.
* `brand.json` — the placeholder constants from `docs/BUILD_PLAN.md` §0.4 (`APP_NAME`, `APP_DOMAIN`,
  `SUPPORT_EMAIL`, …). Replace values here once the owner answers §2.2; every app reads from this file.
  The Mac app mirrors these in `apps/mac/project.yml` (Info.plist is not generated from JSON).
* `pricing.json` — plan names, prices and feature bullets shown by the site, the API's email
  templates and the Mac upgrade sheet (`docs/spec/03-site.md` §2.6). Dodo product prices must be
  kept equal by hand.
