import {
    FEED_SECTION_CAP,
    selectFeedSections,
} from '@/src/features/feed/selectFeedSections';
import { completeProductCard } from '@/src/features/products/catalogViewModelTestFixtures';
import type { FeedCollection, ProductCardData } from '@/src/types/product';

function card(
  overrides: Partial<ProductCardData> & Pick<ProductCardData, 'id'>,
): ProductCardData {
  return {
    ...completeProductCard,
    sku: overrides.sku ?? overrides.id,
    ...overrides,
  };
}

function collection(
  overrides: Partial<FeedCollection> & Pick<FeedCollection, 'slug' | 'productIds'>,
): FeedCollection {
  return {
    id: overrides.id ?? `collection-${overrides.slug}`,
    slug: overrides.slug,
    title: overrides.title ?? 'Editor\'s Picks',
    caption: overrides.caption ?? 'Picked by Eazy Review',
    leadLabel: overrides.leadLabel ?? 'Editor\'s pick',
    signal: overrides.signal ?? 'eazy',
    isRanked: overrides.isRanked ?? false,
    feedPosition: overrides.feedPosition ?? 150,
    productIds: overrides.productIds,
  };
}

function sectionIds(
  sections: ReturnType<typeof selectFeedSections>,
): string[] {
  return sections.map((section) => section.id);
}

function productIds(
  sections: ReturnType<typeof selectFeedSections>,
  id: string,
): string[] {
  return (
    sections.find((section) => section.id === id)?.products.map((product) => product.id) ??
    []
  );
}

describe('selectFeedSections', () => {
  it('hides every section when the catalog is empty', () => {
    expect(selectFeedSections([])).toEqual([]);
  });

  it('shows Newly Added for one product and hides ranked sections', () => {
    const only = card({ id: 'p1', eazyScore: 80, ratingCount: 0 });
    const sections = selectFeedSections([only]);

    expect(sectionIds(sections)).toEqual(['newly-added']);
    expect(productIds(sections, 'newly-added')).toEqual(['p1']);
    expect(sections[0]).toMatchObject({
      kind: 'auto',
      position: 100,
    });
  });

  it('reverses catalog order for Newly Added and caps at five', () => {
    const products = Array.from({ length: 6 }, (_, index) =>
      card({
        id: `p${index + 1}`,
        eazyScore: null,
        ratingCount: 0,
      }),
    );
    const sections = selectFeedSections(products);

    expect(sectionIds(sections)).toEqual(['newly-added']);
    expect(productIds(sections, 'newly-added')).toEqual([
      'p6',
      'p5',
      'p4',
      'p3',
      'p2',
    ]);
    expect(productIds(sections, 'newly-added')).toHaveLength(FEED_SECTION_CAP);
  });

  it('hides Best Eazy Scores until two products have an Eazy Score', () => {
    const sections = selectFeedSections([
      card({ id: 'scored', eazyScore: 88, ratingCount: 0 }),
      card({ id: 'sparse', eazyScore: null, ratingCount: 0 }),
    ]);

    expect(sectionIds(sections)).toEqual(['newly-added']);
  });

  it('ranks Best Eazy Scores by score then id and hides Most Rated at zero ratings', () => {
    const sections = selectFeedSections([
      card({ id: 'a-low', eazyScore: 70, ratingCount: 0 }),
      card({ id: 'c-high', eazyScore: 90, ratingCount: 0 }),
      card({ id: 'b-tie', eazyScore: 90, ratingCount: 0 }),
    ]);

    expect(sectionIds(sections)).toEqual([
      'newly-added',
      'best-eazy-scores',
    ]);
    expect(productIds(sections, 'newly-added')).toEqual([
      'b-tie',
      'c-high',
      'a-low',
    ]);
    expect(productIds(sections, 'best-eazy-scores')).toEqual([
      'c-high',
      'b-tie',
      'a-low',
    ]);
  });

  it('hides Most Rated until two products have a rating count', () => {
    const sections = selectFeedSections([
      card({ id: 'rated', eazyScore: 80, ratingCount: 3 }),
      card({ id: 'unrated', eazyScore: 70, ratingCount: 0 }),
    ]);

    expect(sectionIds(sections)).toEqual([
      'newly-added',
      'best-eazy-scores',
    ]);
    expect(sections.some((section) => section.id === 'most-rated')).toBe(
      false,
    );
  });

  it('ranks Most Rated by rating count then id', () => {
    const sections = selectFeedSections([
      card({ id: 'a-few', eazyScore: 60, ratingCount: 2 }),
      card({ id: 'c-many', eazyScore: 50, ratingCount: 8 }),
      card({ id: 'b-tie', eazyScore: 40, ratingCount: 8 }),
    ]);

    expect(sectionIds(sections)).toEqual([
      'newly-added',
      'best-eazy-scores',
      'most-rated',
    ]);
    expect(productIds(sections, 'most-rated')).toEqual([
      'c-many',
      'b-tie',
      'a-few',
    ]);
  });

  it('hides a later section whose ordered ids match an earlier section', () => {
    const sections = selectFeedSections([
      card({ id: 'older', eazyScore: 70, ratingCount: 0 }),
      card({ id: 'newer', eazyScore: 90, ratingCount: 0 }),
    ]);

    expect(productIds(sections, 'newly-added')).toEqual(['newer', 'older']);
    expect(productIds(sections, 'best-eazy-scores')).toEqual([]);
    expect(sectionIds(sections)).toEqual(['newly-added']);
  });

  it('keeps sections that share products in a different order', () => {
    const sections = selectFeedSections([
      card({ id: 'older-high', eazyScore: 90, ratingCount: 0 }),
      card({ id: 'newer-low', eazyScore: 70, ratingCount: 0 }),
    ]);

    expect(sectionIds(sections)).toEqual([
      'newly-added',
      'best-eazy-scores',
    ]);
    expect(productIds(sections, 'newly-added')).toEqual([
      'newer-low',
      'older-high',
    ]);
    expect(productIds(sections, 'best-eazy-scores')).toEqual([
      'older-high',
      'newer-low',
    ]);
  });

  it('caps Best Eazy Scores at five in score then id order', () => {
    const products = [
      card({ id: 's1', eazyScore: 95, ratingCount: 0 }),
      card({ id: 's2', eazyScore: 90, ratingCount: 0 }),
      card({ id: 's3', eazyScore: 80, ratingCount: 0 }),
      card({ id: 's4', eazyScore: 70, ratingCount: 0 }),
      card({ id: 's5', eazyScore: 60, ratingCount: 0 }),
      card({ id: 's6', eazyScore: 50, ratingCount: 0 }),
    ];
    const sections = selectFeedSections(products);

    expect(productIds(sections, 'newly-added')).toEqual([
      's6',
      's5',
      's4',
      's3',
      's2',
    ]);
    expect(productIds(sections, 'best-eazy-scores')).toEqual([
      's1',
      's2',
      's3',
      's4',
      's5',
    ]);
    expect(productIds(sections, 'best-eazy-scores')).toHaveLength(
      FEED_SECTION_CAP,
    );
  });

  it('caps Most Rated at five in rating count then id order', () => {
    const products = [
      card({ id: 'r1', eazyScore: 95, ratingCount: 1 }),
      card({ id: 'r2', eazyScore: 90, ratingCount: 2 }),
      card({ id: 'r3', eazyScore: 80, ratingCount: 8 }),
      card({ id: 'r4', eazyScore: 70, ratingCount: 6 }),
      card({ id: 'r5', eazyScore: 60, ratingCount: 4 }),
      card({ id: 'r6', eazyScore: 50, ratingCount: 3 }),
    ];
    const sections = selectFeedSections(products);

    expect(productIds(sections, 'most-rated')).toEqual([
      'r3',
      'r4',
      'r5',
      'r6',
      'r2',
    ]);
    expect(productIds(sections, 'most-rated')).toHaveLength(FEED_SECTION_CAP);
  });

  it('does not mutate the catalog list', () => {
    const products = [
      card({ id: 'p1', eazyScore: 80, ratingCount: 2 }),
      card({ id: 'p2', eazyScore: 90, ratingCount: 4 }),
    ];
    const snapshot = products.map((product) => product.id);

    selectFeedSections(products);

    expect(products.map((product) => product.id)).toEqual(snapshot);
  });

  it('inserts a curated collection between Newly Added and Best Eazy Scores', () => {
    const products = [
      card({ id: 'older-high', eazyScore: 90, ratingCount: 0 }),
      card({ id: 'newer-low', eazyScore: 70, ratingCount: 0 }),
    ];
    const sections = selectFeedSections(products, [
      collection({
        slug: 'editors-picks',
        feedPosition: 150,
        productIds: ['older-high'],
      }),
    ]);

    expect(sectionIds(sections)).toEqual([
      'newly-added',
      'collection:editors-picks',
      'best-eazy-scores',
    ]);
    expect(sections[1]).toMatchObject({
      kind: 'curated',
      position: 150,
      ranked: false,
    });
    expect(productIds(sections, 'collection:editors-picks')).toEqual([
      'older-high',
    ]);
  });

  it('lets a curated collection at position 50 lead the Feed', () => {
    const products = [
      card({ id: 'older-high', eazyScore: 90, ratingCount: 0 }),
      card({ id: 'newer-low', eazyScore: 70, ratingCount: 0 }),
    ];
    const sections = selectFeedSections(products, [
      collection({
        slug: 'cover-story',
        feedPosition: 50,
        productIds: ['older-high', 'newer-low'],
      }),
    ]);

    expect(sectionIds(sections)).toEqual([
      'collection:cover-story',
      'newly-added',
    ]);
    // Best Eazy Scores matches the curated ordered ids, so duplicate-hide drops it.
  });

  it('breaks a position tie by placing the curated section first', () => {
    const products = [
      card({ id: 'older-high', eazyScore: 90, ratingCount: 0 }),
      card({ id: 'newer-low', eazyScore: 70, ratingCount: 0 }),
    ];
    const sections = selectFeedSections(products, [
      collection({
        slug: 'same-slot',
        feedPosition: 100,
        productIds: ['older-high'],
      }),
    ]);

    expect(sectionIds(sections)).toEqual([
      'collection:same-slot',
      'newly-added',
      'best-eazy-scores',
    ]);
  });

  it('hides a curated section whose ordered ids match an earlier section', () => {
    const products = [
      card({ id: 'older', eazyScore: 70, ratingCount: 0 }),
      card({ id: 'newer', eazyScore: 90, ratingCount: 0 }),
    ];
    const sections = selectFeedSections(products, [
      collection({
        slug: 'same-order',
        feedPosition: 150,
        productIds: ['newer', 'older'],
      }),
    ]);

    expect(sectionIds(sections)).toEqual(['newly-added']);
  });
});
