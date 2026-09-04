import { AUTO_FEED_SECTION_SOURCES } from '@/src/features/feed/autoSections';
import { AUTO_FEED_POSITIONS } from '@/src/features/feed/sections';

describe('AUTO_FEED_SECTION_SOURCES', () => {
  it('registers the three auto sources in Feed order', () => {
    expect(AUTO_FEED_SECTION_SOURCES.map((source) => source.id)).toEqual([
      'newly-added',
      'best-eazy-scores',
      'most-rated',
    ]);
    expect(AUTO_FEED_SECTION_SOURCES.map((source) => source.position)).toEqual([
      AUTO_FEED_POSITIONS.newlyAdded,
      AUTO_FEED_POSITIONS.bestEazyScores,
      AUTO_FEED_POSITIONS.mostRated,
    ]);
    expect(AUTO_FEED_SECTION_SOURCES.map((source) => source.position)).toEqual([
      100, 200, 300,
    ]);
  });
});
