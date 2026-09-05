import { honestCuratedCaption } from '@/src/features/feed/honestCuratedCaption';
import {
  FEED_SECTION_CAP,
  RANKED_SECTION_MIN,
  curatedSectionId,
  type FeedSection,
} from '@/src/features/feed/sections';
import type { FeedCollection, ProductCardData } from '@/src/types/product';

export function resolveCuratedSections(
  collections: FeedCollection[],
  products: ProductCardData[],
): FeedSection[] {
  const byId = new Map(
    products.map((product) => [product.id, product] as const),
  );
  const sections: FeedSection[] = [];

  for (const collection of collections) {
    const resolved: ProductCardData[] = [];
    for (const productId of collection.productIds) {
      const product = byId.get(productId);
      if (product) {
        resolved.push(product);
      }
      if (resolved.length === FEED_SECTION_CAP) {
        break;
      }
    }

    const minimum = collection.isRanked ? RANKED_SECTION_MIN : 1;
    if (resolved.length < minimum) {
      continue;
    }

    sections.push({
      id: curatedSectionId(collection.slug),
      kind: 'curated',
      position: collection.feedPosition,
      title: collection.title,
      caption: honestCuratedCaption(collection.caption),
      leadLabel: collection.leadLabel,
      signal: collection.signal,
      ranked: collection.isRanked,
      products: resolved,
    });
  }

  return sections;
}
