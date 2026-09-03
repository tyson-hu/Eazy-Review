import type { ProductCardData } from '@/src/types/product';

export const FEED_SECTION_CAP = 5;
export const RANKED_SECTION_MIN = 2;

export type FeedSectionId =
  | 'newly-added'
  | 'best-eazy-scores'
  | 'most-rated';

export type FeedSection = {
  id: FeedSectionId;
  title: string;
  products: ProductCardData[];
};

function compareIdDesc(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0;
}

function orderedIds(products: ProductCardData[]): string {
  return products.map((product) => product.id).join('\0');
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

export function selectFeedSections(
  products: ProductCardData[],
): FeedSection[] {
  const candidates: FeedSection[] = [];
  const newlyAdded = takeNewlyAdded(products);
  if (newlyAdded.length > 0) {
    candidates.push({
      id: 'newly-added',
      title: 'Newly Added',
      products: newlyAdded,
    });
  }

  const bestEazyScores = takeBestEazyScores(products);
  if (bestEazyScores.length > 0) {
    candidates.push({
      id: 'best-eazy-scores',
      title: 'Best Eazy Scores',
      products: bestEazyScores,
    });
  }

  const mostRated = takeMostRated(products);
  if (mostRated.length > 0) {
    candidates.push({
      id: 'most-rated',
      title: 'Most Rated',
      products: mostRated,
    });
  }

  const visible: FeedSection[] = [];
  for (const section of candidates) {
    const ids = orderedIds(section.products);
    const isDuplicate = visible.some(
      (earlier) => orderedIds(earlier.products) === ids,
    );
    if (!isDuplicate) {
      visible.push(section);
    }
  }
  return visible;
}
