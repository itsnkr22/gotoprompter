import { describe, expect, it } from 'vitest';
import { promoFor } from '../src/settings/NativePromoCard';

describe('native promo card copy', () => {
  it('says "coming soon" while the Mac app is not available', () => {
    expect(promoFor('mac', false).title).toBe('Mac app coming soon');
    expect(promoFor('ios', false).title).toBe('Mac app coming soon');
    expect(promoFor('mac', false).destination).toBe('/mac/');
  });

  it('invites a download once the Mac app is available', () => {
    expect(promoFor('mac', true).title).toBe('Get the Mac app');
    expect(promoFor('android', true).title).toBe("There's a Mac app too");
  });
});
