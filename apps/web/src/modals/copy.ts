// Every modal and toast string in one place (spec §13, §12.2).
import { APP_DOMAIN } from '../brand';

export const COPY = {
  browserUnsupported: {
    title: "Voice recognition isn't available here",
    body: "Your browser doesn't support speech recognition, so the text can't follow your voice. Chrome, Edge and Safari all work. You can still scroll manually, or use Sound or Constant scrolling.",
    button: 'Continue anyway',
  },
  ipadPwaBlocked: {
    title: 'Not available in the home-screen app',
    body: `iPadOS blocks speech recognition inside apps installed from Safari. Open ${APP_DOMAIN}/app in Safari itself to use voice scrolling.`,
    button: 'Close',
  },
  androidVideoLimit: {
    title: 'A heads-up for Android',
    body: "Android doesn't let the camera and speech recognition use the microphone at the same time. While Video mode is on, scroll by tapping words or switch to Constant scrolling.",
    button: 'Got it',
  },
  googleDocImport: {
    title: 'Import a Google Doc',
    body: "Set the document's sharing to Anyone with the link (Viewer), then paste the link below.",
    paste: 'Paste',
    import: 'Import',
    importing: 'Importing…',
  },
  langDetectionWarning:
    "We couldn't tell which language this is. Pick it manually in Settings → Dictation Language.",
  swUpdate: 'A new version is ready.',
  swUpdateReload: 'Reload',
  micDenied:
    "Microphone access was blocked. Allow it in your browser's site settings to use voice scrolling.",
  languageNotSupported: "Your browser can't recognise that language. Switched to English.",
  recognitionUnstable: 'Speech recognition keeps stopping. Check your microphone and try again.',
  cameraDenied: 'Camera access was blocked. Allow the camera and microphone to use Video mode.',
  soundNeedsMic: 'Sound scrolling needs microphone access. Allow the microphone and try again.',
  micDisconnected: 'Microphone disconnected.',
  recordingUnsupported: "Recording isn't supported in this browser.",
  copyFailed: "Couldn't copy. Select the text and copy it manually.",
  pasteBlocked: 'Your browser blocked clipboard access. Press Ctrl/⌘+V inside the box instead.',
  linkCopied: 'Link copied.',
  gdocInvalidUrl:
    "That doesn't look like a Google Docs link. Paste the full link from your browser's address bar.",
  gdocNotPublic:
    'We couldn\'t open that document. Share it as "Anyone with the link" (Viewer) and try again.',
  gdocRateLimited: 'Too many imports in a short time. Please wait a minute and try again.',
  gdocUnavailable: "Google Docs didn't respond. Check your connection and try again.",
  gdocEmpty: 'That document is empty.',
  resetSettingsConfirm: 'Reset all settings to their defaults?',
  clearHistoryConfirm: 'Clear all recent scripts?',
} as const;
