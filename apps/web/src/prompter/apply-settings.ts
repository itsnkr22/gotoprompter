// Applies display settings to the prompter DOM (spec §3 "Theme").
import { isRtlLanguage } from '../languages';
import type { Settings } from '../state/settings';

export const FONT_STACKS: Record<Settings['fontFamily'], string> = {
  mono: 'var(--vp-font-mono)',
  sans: 'var(--vp-font-sans)',
  serif: 'var(--vp-font-serif)',
  comic: 'var(--vp-font-comic)',
  dyslexic: 'var(--vp-font-dyslexic)',
};

export interface PrompterElements {
  appRoot: HTMLElement | null;
  prompterContainer: HTMLElement | null;
  scrollContainer: HTMLElement | null;
  scriptContent: HTMLElement | null;
  overlayVideo?: boolean;
  /** Recognition locale of the loaded script; decides the direction when it is 'auto'. */
  language?: string;
}

/** Direction and alignment actually applied: 'auto' follows the script's language. */
export function effectiveTextLayout(
  s: Pick<Settings, 'textDirection' | 'textAlign'>,
  language: string | undefined,
): { direction: 'ltr' | 'rtl'; textAlign: Settings['textAlign'] } {
  if (s.textDirection !== 'auto') return { direction: s.textDirection, textAlign: s.textAlign };
  const rtl = !!language && isRtlLanguage(language);
  // In an automatically right-to-left script, the default "left" means "where lines start".
  const textAlign = rtl && s.textAlign === 'left' ? 'right' : s.textAlign;
  return { direction: rtl ? 'rtl' : 'ltr', textAlign };
}

export function applySettingsToDom(s: Settings, els: PrompterElements): void {
  els.appRoot?.style.setProperty('--base-color', s.textColor);
  if (els.prompterContainer) els.prompterContainer.style.backgroundColor = s.bgColor;
  if (els.scrollContainer) {
    els.scrollContainer.style.backgroundColor = els.overlayVideo ? '' : s.bgColor;
    els.scrollContainer.classList.toggle('vp-mirror-v', s.mirrorVertical);
    els.scrollContainer.classList.toggle('vp-mirror-h', s.mirrorHorizontal);
  }
  const c = els.scriptContent;
  if (c) {
    c.style.color = s.textColor;
    c.style.fontSize = `${s.fontSize}px`;
    c.style.lineHeight = String(s.lineHeight);
    const layout = effectiveTextLayout(s, els.language);
    c.style.textAlign = layout.textAlign;
    c.style.direction = layout.direction;
    c.style.fontFamily = FONT_STACKS[s.fontFamily];
    c.style.paddingLeft = `${s.margin}%`;
    c.style.paddingRight = `${s.margin}%`;
    c.style.setProperty('--paragraph-spacing', `${s.paragraphSpacing}em`);
    c.classList.toggle('vp-smooth', s.smoothAnimations);
    c.classList.toggle('vp-highlight', s.highlightActiveWord);
    c.classList.toggle('vp-show-stops', s.showStopSigns);
  }
  if (typeof document !== 'undefined')
    document.body.classList.toggle('vp-rotated', s.screenRotated);
}
