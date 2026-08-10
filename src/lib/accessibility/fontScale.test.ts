import {
  isLargeContentSize,
  LARGE_CONTENT_SIZE_THRESHOLD,
  SCORE_DISPLAY_MAX_FONT_SIZE_MULTIPLIER,
  UI_CHROME_MAX_FONT_SIZE_MULTIPLIER,
} from '@/src/lib/accessibility/fontScale';

describe('fontScale accessibility helpers', () => {
  it('keeps default and mild scales on dense layouts', () => {
    expect(isLargeContentSize(1)).toBe(false);
    expect(isLargeContentSize(1.2)).toBe(false);
  });

  it('stacks adaptive layouts from the large-content threshold', () => {
    expect(isLargeContentSize(LARGE_CONTENT_SIZE_THRESHOLD)).toBe(true);
    expect(isLargeContentSize(2)).toBe(true);
  });

  it('keeps deliberate caps above 1 so Dynamic Type is not disabled', () => {
    expect(SCORE_DISPLAY_MAX_FONT_SIZE_MULTIPLIER).toBeGreaterThan(1);
    expect(UI_CHROME_MAX_FONT_SIZE_MULTIPLIER).toBeGreaterThan(1);
  });
});
