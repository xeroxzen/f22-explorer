import { describe, expect, it } from 'vitest';
import { QUALITY_PRESETS } from '../src/store/explorerStore.js';
import { computeViewportInfo } from '../src/ui/useViewport.js';

describe('Mobile viewport & quality presets', () => {
  it('classifies phone portrait, phone landscape, tablet, and desktop breakpoints', () => {
    const iphonePortrait = computeViewportInfo(390, 844);
    expect(iphonePortrait.isPhonePortrait).toBe(true);
    expect(iphonePortrait.isPhoneLandscape).toBe(false);
    expect(iphonePortrait.isPhone).toBe(true);
    expect(iphonePortrait.isDesktop).toBe(false);

    const iphoneLandscape = computeViewportInfo(844, 390);
    expect(iphoneLandscape.isPhonePortrait).toBe(false);
    expect(iphoneLandscape.isPhoneLandscape).toBe(true);
    expect(iphoneLandscape.isPhone).toBe(true);

    const tablet = computeViewportInfo(768, 1024);
    expect(tablet.isTablet).toBe(true);
    expect(tablet.isPhone).toBe(false);

    const desktop = computeViewportInfo(1280, 800);
    expect(desktop.isDesktop).toBe(true);
    expect(desktop.isPhone).toBe(false);
    expect(desktop.isTablet).toBe(false);
  });

  it('defines Low, Med, and High quality presets with monotonically increasing budgets', () => {
    expect(QUALITY_PRESETS.low.dpr).toBe(1);
    expect(QUALITY_PRESETS.low.bloom).toBe(false);
    expect(QUALITY_PRESETS.low.shadows).toBe(false);
    expect(QUALITY_PRESETS.low.antialias).toBe(false);

    expect(QUALITY_PRESETS.med.bloom).toBe(true);
    expect(QUALITY_PRESETS.med.shadows).toBe(false);
    expect(QUALITY_PRESETS.med.antialias).toBe(true);

    expect(QUALITY_PRESETS.high.bloom).toBe(true);
    expect(QUALITY_PRESETS.high.shadows).toBe(true);
    expect(QUALITY_PRESETS.high.antialias).toBe(true);
  });
});
