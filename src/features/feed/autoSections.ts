import {
    AUTO_FEED_POSITIONS,
    FEED_SECTION_CAP,
    RANKED_SECTION_MIN,
    type FeedSection,
} from '@/src/features/feed/sections';
import type { ProductCardData } from '@/src/types/product';

export type AutoFeedSectionSource = {
  id: string;
  position: number;
  build: (products: ProductCardData[]) => FeedSection | null;
};

function compareIdDesc(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0;
}

function takeNewlyAdded(products: ProductCardData[]): ProductCardData[] {
  if (products.length === 0) {
    return [];
  }
  return products.slice().reverse().slice(0, FEED_SECTION_CAP);
}

function takeBestEazyScores(products: ProductCardData[]): ProductCardData[] {
  const qualified = products
    .filter((product) => product.eazyScore != null)
    .slice()
    .sort(
      (a, b) =>
        (b.eazyScore ?? 0) - (a.eazyScore ?? 0) || compareIdDesc(a.id, b.id),
    );
  if (qualified.length < RANKED_SECTION_MIN) {
    return [];
  }
  return qualified.slice(0, FEED_SECTION_CAP);
}

function takeMostRated(products: ProductCardData[]): ProductCardData[] {
  const qualified = products
    .filter((product) => product.ratingCount >= 1)
    .slice()
    .sort(
      (a, b) =>
        b.ratingCount - a.ratingCount || compareIdDesc(a.id, b.id),
    );
  if (qualified.length < RANKED_SECTION_MIN) {
    return [];
  }
  return qualified.slice(0, FEED_SECTION_CAP);
}

export const AUTO_FEED_SECTION_SOURCES: readonly AutoFeedSectionSource[] = [
  {
    id: 'newly-added',
    position: AUTO_FEED_POSITIONS.newlyAdded,
    build(products) {
      const selected = takeNewlyAdded(products);
      if (selected.length === 0) {
        return null;
      }
      return {
        id: 'newly-added',
        kind: 'auto',
        position: AUTO_FEED_POSITIONS.newlyAdded,
        title: 'Newly Added',
        caption: 'Latest additions to the catalog',
        leadLabel: 'Latest addition',
        signal: 'eazy',
        ranked: false,
        products: selected,
      };
    },
  },
  {
    id: 'best-eazy-scores',
    position: AUTO_FEED_POSITIONS.bestEazyScores,
    build(products) {
      const selected = takeBestEazyScores(products);
      if (selected.length === 0) {
        return null;
      }
      return {
        id: 'best-eazy-scores',
        kind: 'auto',
        position: AUTO_FEED_POSITIONS.bestEazyScores,
        title: 'Best Eazy Scores',
        caption: 'Ranked by Eazy Score',
        leadLabel: 'Top Eazy Score',
        signal: 'eazy',
        ranked: true,
        products: selected,
      };
    },
  },
  {
    id: 'most-rated',
    position: AUTO_FEED_POSITIONS.mostRated,
    build(products) {
      const selected = takeMostRated(products);
      if (selected.length === 0) {
        return null;
      }
      return {
        id: 'most-rated',
        kind: 'auto',
        position: AUTO_FEED_POSITIONS.mostRated,
        title: 'Most Rated',
        caption: 'Ranked by number of community ratings',
        leadLabel: 'Most rated',
        signal: 'community',
        ranked: true,
        products: selected,
      };
    },
  },
];
