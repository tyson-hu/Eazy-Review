import {
  TRUSTED_CURATED_CAPTION,
  TRUSTED_CURATED_LEAD_LABEL,
  TRUSTED_CURATED_TITLE,
  honestCuratedCaption,
  honestCuratedLeadLabel,
  honestCuratedTitle,
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

describe('honestCuratedTitle', () => {
  it('keeps an editorial title that does not claim a reserved basis', () => {
    expect(honestCuratedTitle("Editor's Picks")).toBe("Editor's Picks");
  });

  it('replaces a title that labels the section Trending', () => {
    expect(honestCuratedTitle('Trending')).toBe(TRUSTED_CURATED_TITLE);
  });
});

describe('honestCuratedLeadLabel', () => {
  it('keeps an editorial eyebrow', () => {
    expect(honestCuratedLeadLabel("Editor's pick")).toBe("Editor's pick");
  });

  it('replaces a reserved measured-basis eyebrow', () => {
    expect(honestCuratedLeadLabel('Trending')).toBe(TRUSTED_CURATED_LEAD_LABEL);
  });
});
