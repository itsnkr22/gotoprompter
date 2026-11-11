// Launch switches (packages/config/launch.json). While the Mac app is not available the site sells
// nothing and offers no download: Mac pages say "coming soon" and point to the free web app.
import launch from '@gotoprompter/config/launch' with { type: 'json' };
import { SUPPORT_EMAIL } from './brand';

export const MAC_AVAILABLE: boolean = launch.macAvailable;

/** "Email me at launch" — no waitlist service, just a pre-filled email to the support inbox. */
export const MAC_NOTIFY_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  'Tell me when the Mac app launches',
)}`;

export const MAC_NOTIFY_LABEL = 'Email me when it launches';
export const MAC_SOON_LABEL = 'Mac app — coming soon';
