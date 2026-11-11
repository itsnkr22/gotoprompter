/** Typed access to the public build-time environment (apps/web/.env.example). */
export const env = {
  API_BASE: (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, ''),
  UMAMI_SRC: import.meta.env.VITE_UMAMI_SRC ?? '',
  UMAMI_WEBSITE_ID: import.meta.env.VITE_UMAMI_WEBSITE_ID ?? '',
  /** Test hooks are installed in dev builds and when VITE_E2E=1. */
  TEST_HOOKS: import.meta.env.DEV || import.meta.env.VITE_E2E === '1',
} as const;
