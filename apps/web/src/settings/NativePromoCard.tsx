// Native app promo card (spec §9.4). Rotation pauses under prefers-reduced-motion.
import { useEffect, useRef, useState } from 'react';
import launch from '@gotoprompter/config/launch' with { type: 'json' };
import { track } from '../analytics';
import { detectVisitorPlatform, prefersReducedMotion } from '../platform';
import type { VisitorPlatform } from '../platform';

interface Pair {
  line1: string;
  line2: string;
  rotating: string[];
}

export const PROMO_PAIRS: Pair[] = [
  {
    line1: 'Whole-script voice tracking',
    line2: 'Keeps up when you ',
    rotating: ['pause', 'ad-lib', 'skip a line', 'speed up'],
  },
  {
    line1: 'Invisible while you share',
    line2: 'Built for ',
    rotating: ['video calls', 'sales demos', 'interviews', 'webinars'],
  },
  {
    line1: 'Hidden from every recording',
    line2: 'Perfect for ',
    rotating: ['Loom videos', 'YouTube', 'tutorials', 'product demos'],
  },
];

export function promoFor(
  platform: VisitorPlatform,
  macAvailable: boolean = launch.macAvailable,
): {
  title: string;
  destination: string;
  pairs: Pair[];
} {
  const mobile = platform === 'ios' || platform === 'android';
  const title = macAvailable
    ? mobile
      ? "There's a Mac app too"
      : 'Get the Mac app'
    : 'Mac app coming soon';
  return {
    title,
    destination: '/mac/',
    pairs: mobile ? PROMO_PAIRS.slice(0, 1) : PROMO_PAIRS,
  };
}

let nextPairIndex = 0;

export function NativePromoCard() {
  const platform = detectVisitorPlatform();
  const promo = promoFor(platform);
  const pairRef = useRef(promo.pairs[nextPairIndex % promo.pairs.length]!);
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    nextPairIndex = (nextPairIndex + 1) % promo.pairs.length;
    if (prefersReducedMotion()) return;
    const pair = pairRef.current;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setVisible(false);
      hide = setTimeout(() => {
        setWordIndex((i) => (i + 1) % pair.rotating.length);
        setVisible(true);
      }, 500);
    }, 1500);
    return () => {
      clearInterval(interval);
      if (hide) clearTimeout(hide);
    };
  }, [promo.pairs.length]);

  const pair = pairRef.current;
  const word = pair.rotating[wordIndex] ?? pair.rotating[0] ?? '';

  return (
    <div className="mb-4 border-b border-line pb-4">
      <button
        id="nativePromoCard"
        type="button"
        className="group relative w-full overflow-hidden rounded-lg p-[1px] text-left"
        onClick={() => {
          track('promo-click', {
            destination: promo.destination,
            sourcePlatform: platform,
            variant: `${pair.line1} - ${word}`,
          });
          window.location.href = promo.destination;
        }}
      >
        <div
          className="vp-spin-border absolute inset-[-200%] opacity-60 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
        <div className="relative flex h-full w-full items-center justify-between rounded-[7px] bg-raised p-3 transition-colors group-hover:bg-line">
          <div>
            <div
              id="nativePromoTitle"
              className="flex items-center gap-2 text-sm font-bold text-fg transition-colors group-hover:text-accent"
            >
              {promo.title}
            </div>
            <div
              id="nativePromoSubtitle"
              className="mt-1 flex min-h-[32px] flex-col justify-center text-xs text-muted"
            >
              <div>{pair.line1}</div>
              <div className="flex items-center">
                {pair.line2}
                <span
                  className={`ml-1 inline-block font-medium whitespace-nowrap text-accent transition-all duration-500 ${
                    visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                  }`}
                >
                  {word}
                </span>
              </div>
            </div>
          </div>
          <svg
            className="h-4 w-4 text-muted transition-colors group-hover:text-fg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
