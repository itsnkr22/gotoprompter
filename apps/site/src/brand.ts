// Brand constants (packages/config/brand.json) + helpers (docs/spec/03-site.md §1.2).
import brand from '@gotoprompter/config/brand' with { type: 'json' };

export const APP_NAME: string = brand.APP_NAME;
export const APP_DOMAIN: string = brand.APP_DOMAIN;
export const SUPPORT_EMAIL: string = brand.SUPPORT_EMAIL;
export const MAC_BUNDLE_ID: string = brand.MAC_BUNDLE_ID;
export const GITHUB_REPO_URL: string = brand.GITHUB_REPO_URL;

export const siteUrl = (path = '/'): string => `https://${APP_DOMAIN}${path}`;
export const supportMailto = (subject?: string): string =>
  `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

/** Replaces `{{APP_NAME}}`, `{APP_NAME}`, `{APP_DOMAIN}`, `{SUPPORT_EMAIL}`, `{MAC_BUNDLE_ID}` in copy. */
export function fillBrand(s: string): string {
  return s
    .replace(/\{\{APP_NAME\}\}|\{APP_NAME\}/g, APP_NAME)
    .replace(/\{\{APP_DOMAIN\}\}|\{APP_DOMAIN\}/g, APP_DOMAIN)
    .replace(/\{\{SUPPORT_EMAIL\}\}|\{SUPPORT_EMAIL\}/g, SUPPORT_EMAIL)
    .replace(/\{\{MAC_BUNDLE_ID\}\}|\{MAC_BUNDLE_ID\}/g, MAC_BUNDLE_ID);
}
