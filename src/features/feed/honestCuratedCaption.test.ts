import {
  TRUSTED_CURATED_CAPTION,
  honestCuratedCaption,
} from '@/src/features/feed/honestCuratedCaption';

describe('honestCuratedCaption', () => {
  it('keeps a caption that says the list is hand-picked', () => {
    expect(honestCuratedCaption('Picked by Eazy Review')).toBe(
      'Picked by Eazy Review',
    );
    expect(honestCuratedCaption('Hand-picked Jordan 1s')).toBe(
      'Hand-picked Jordan 1s',
    );
  });

  it('replaces measured or unmeasured-false basis claims', () => {
    expect(honestCuratedCaption('Trending')).toBe(TRUSTED_CURATED_CAPTION);
    expect(honestCuratedCaption('Ranked by Eazy Score')).toBe(
      TRUSTED_CURATED_CAPTION,
    );
    expect(honestCuratedCaption('Ranked by number of community ratings')).toBe(
      TRUSTED_CURATED_CAPTION,
    );
    expect(honestCuratedCaption('Hand-picked trending list')).toBe(
      TRUSTED_CURATED_CAPTION,
    );
  });

  it('replaces a caption that does not say the list is hand-picked', () => {
    expect(honestCuratedCaption("Editor's selection")).toBe(
      TRUSTED_CURATED_CAPTION,
    );
  });
});
