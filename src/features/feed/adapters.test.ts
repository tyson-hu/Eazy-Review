import { adaptFeedCollections } from '@/src/features/feed/adapters';
import { CatalogError } from '@/src/features/products/errors';

const publishedRow = {
  id: 'collection-1',
  slug: 'editors-picks',
  title: "Editor's Picks",
  caption: 'Picked by Eazy Review',
  lead_label: "Editor's pick",
  signal: 'eazy',
  is_ranked: false,
  feed_position: 150,
  product_collection_items: [
    { id: 'item-b', product_id: 'p2', position: 2 },
    { id: 'item-a', product_id: 'p1', position: 1 },
  ],
};

describe('adaptFeedCollections', () => {
  it('normalizes published rows and orders items by position then id', () => {
    expect(adaptFeedCollections([publishedRow])).toEqual([
      {
        id: 'collection-1',
        slug: 'editors-picks',
        title: "Editor's Picks",
        caption: 'Picked by Eazy Review',
        leadLabel: "Editor's pick",
        signal: 'eazy',
        isRanked: false,
        feedPosition: 150,
        productIds: ['p1', 'p2'],
      },
    ]);
  });

  it('sorts collections by feed position then id', () => {
    const later = {
      ...publishedRow,
      id: 'collection-z',
      slug: 'later',
      feed_position: 250,
      product_collection_items: [],
    };
    const earlier = {
      ...publishedRow,
      id: 'collection-a',
      slug: 'earlier',
      feed_position: 50,
      product_collection_items: [],
    };

    expect(
      adaptFeedCollections([later, earlier]).map((row) => row.slug),
    ).toEqual(['earlier', 'later']);
  });

  it('rejects an unknown signal', () => {
    expect(() =>
      adaptFeedCollections([{ ...publishedRow, signal: 'trending' }]),
    ).toThrow(CatalogError);
  });

  it('rejects a missing items array', () => {
    expect(() =>
      adaptFeedCollections([
        { ...publishedRow, product_collection_items: null },
      ]),
    ).toThrow(CatalogError);
  });
});
