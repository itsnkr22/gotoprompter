// Platform detection (spec §4, §9.4). Pure functions over navigator so tests can pass fakes.

export type VisitorPlatform = 'ios' | 'android' | 'mac' | 'linux' | 'windows' | 'other';

interface NavLike {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone?: boolean;
}

const nav = (): NavLike =>
  typeof navigator === 'undefined'
    ? { userAgent: '', platform: '', maxTouchPoints: 0 }
    : (navigator as unknown as NavLike);

export function isIOS(n: NavLike = nav()): boolean {
  return (
    /iPad|iPhone|iPod/.test(n.userAgent) || (n.platform === 'MacIntel' && n.maxTouchPoints > 1)
  );
}

export function isIPad(n: NavLike = nav()): boolean {
  return /iPad/.test(n.userAgent) || (n.platform === 'MacIntel' && n.maxTouchPoints > 2);
}

export function isAndroid(n: NavLike = nav()): boolean {
  return /Android/i.test(n.userAgent);
}

/** Installed to the home screen / running as a standalone PWA. */
export function isStandalone(n: NavLike = nav()): boolean {
  if (n.standalone === true) return true;
  return (
    typeof window !== 'undefined' && !!window.matchMedia?.('(display-mode: standalone)').matches
  );
}

export function detectVisitorPlatform(n: NavLike = nav()): VisitorPlatform {
  if (isIOS(n)) return 'ios';
  if (isAndroid(n)) return 'android';
  if (/Mac/i.test(n.platform) || /Macintosh|Mac OS X/i.test(n.userAgent)) return 'mac';
  if (/Linux/i.test(n.platform) || /Linux/i.test(n.userAgent)) return 'linux';
  if (/Win/i.test(n.platform) || /Windows/i.test(n.userAgent)) return 'windows';
  return 'other';
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
