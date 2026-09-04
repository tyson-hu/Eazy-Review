import { AUTO_FEED_SECTION_SOURCES } from '@/src/features/feed/autoSections';
import { resolveCuratedSections } from '@/src/features/feed/curatedSections';
import type { FeedSection } from '@/src/features/feed/sections';
import type { FeedCollection, ProductCardData } from '@/src/types/product';

export {
    FEED_SECTION_CAP,
    RANKED_SECTION_MIN
} from '@/src/features/feed/sections';

function orderedIds(products: ProductCardData[]): string {
  return products.map((product) => product.id).join('\0');
}

function compareSections(a: FeedSection, b: FeedSection): number {
  if (a.position !== b.position) {
    return a.position - b.position;
  }
  if (a.kind !== b.kind) {
    return a.kind === 'curated' ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function selectFeedSections(
  products: ProductCardData[],
  collections: FeedCollection[] = [],
): FeedSection[] {
  const auto = AUTO_FEED_SECTION_SOURCES.flatMap((source) => {
    const section = source.build(products);
    return section ? [section] : [];
  });
  const curated = resolveCuratedSections(collections, products);
  const candidates = [...auto, ...curated].sort(compareSections);

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
