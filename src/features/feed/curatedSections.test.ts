import { resolveCuratedSections } from '@/src/features/feed/curatedSections';
import { FEED_SECTION_CAP } from '@/src/features/feed/sections';
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

describe('resolveCuratedSections', () => {
  const catalog = [
    card({ id: 'p1', eazyScore: 80 }),
    card({ id: 'p2', eazyScore: 70 }),
    card({ id: 'p3', eazyScore: 60 }),
  ];

  it('resolves items in collection order and drops missing ids', () => {
    const sections = resolveCuratedSections(
      [
        collection({
          slug: 'editors-picks',
          productIds: ['missing', 'p2', 'p1', 'gone'],
        }),
      ],
      catalog,
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].products.map((product) => product.id)).toEqual([
      'p2',
      'p1',
    ]);
  });

  it('hides an unranked collection with no published products', () => {
    expect(
      resolveCuratedSections(
        [collection({ slug: 'empty', productIds: ['missing'] })],
        catalog,
      ),
    ).toEqual([]);
  });

  it('hides a ranked collection until two products resolve', () => {
    expect(
      resolveCuratedSections(
        [
          collection({
            slug: 'ranked',
            isRanked: true,
            productIds: ['p1', 'missing'],
          }),
        ],
        catalog,
      ),
    ).toEqual([]);
  });

  it('caps resolved products at five while keeping item order', () => {
    const products = Array.from({ length: 6 }, (_, index) =>
      card({ id: `p${index + 1}` }),
    );
    const sections = resolveCuratedSections(
      [
        collection({
          slug: 'long-list',
          productIds: products.map((product) => product.id).reverse(),
        }),
      ],
      products,
    );

    expect(sections[0].products.map((product) => product.id)).toEqual([
      'p6',
      'p5',
      'p4',
      'p3',
      'p2',
    ]);
    expect(sections[0].products).toHaveLength(FEED_SECTION_CAP);
  });

  it('copies presentation fields onto the section', () => {
    const [section] = resolveCuratedSections(
      [
        collection({
          slug: 'community-picks',
          title: 'Community Favorites',
          caption: 'Picked by Eazy Review',
          leadLabel: 'Community pick',
          signal: 'community',
          isRanked: true,
          feedPosition: 50,
          productIds: ['p1', 'p2'],
        }),
      ],
      catalog,
    );

    expect(section).toMatchObject({
      id: 'collection:community-picks',
      kind: 'curated',
      position: 50,
      title: 'Community Favorites',
      caption: 'Picked by Eazy Review',
      leadLabel: 'Community pick',
      signal: 'community',
      ranked: true,
    });
  });
});
