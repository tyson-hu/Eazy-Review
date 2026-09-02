import {
  adaptProductCards,
  adaptProductDetail,
} from '@/src/features/products/adapters';
import {
  COMPLETE_PRODUCT_ID,
  completeCatalogRow,
  SPARSE_PRODUCT_ID,
  sparseCatalogRow,
} from '@/src/features/products/catalogTestFixtures';

describe('public catalog adapters', () => {
  it('normalizes complete and sparse Browse rows without fabricating values', () => {
    const cards = adaptProductCards([
      sparseCatalogRow,
      completeCatalogRow,
    ]);

    expect(cards.map((card) => card.id)).toEqual([
      COMPLETE_PRODUCT_ID,
      SPARSE_PRODUCT_ID,
    ]);
    expect(cards[0]).toEqual({
      id: COMPLETE_PRODUCT_ID,
      brand: 'Nike',
      name: 'Nike Air Force 1 Low White',
      sku: 'CW2288-111',
      imageUrl: 'https://example.test/air-force-primary.png',
      eazyScore: 79,
      communityScore: null,
      ratingCount: 0,
      lowestOffer: {
        retailer: "DICK'S Sporting Goods",
        amount: 114.99,
        currency: 'USD',
        market: 'US',
        sizeLabel: 'US 10',
        checkedAt: '2026-08-03T16:17:14.000Z',
      },
    });
    expect(cards[1]).toEqual({
      id: SPARSE_PRODUCT_ID,
      brand: 'Adidas',
      name: 'Adidas Samba OG Cloud White Core Black',
      sku: 'B75806',
      imageUrl: null,
      eazyScore: null,
      communityScore: null,
      ratingCount: 0,
      lowestOffer: null,
    });
  });

  it('uses sort_order, created_at, then id for deterministic primary images', () => {
    const row = {
      ...completeCatalogRow,
      product_images: [
        {
          id: 'image-z',
          image_url: 'https://example.test/z.png',
          sort_order: 1,
          created_at: '2026-08-03T00:00:00.000Z',
        },
        {
          id: 'image-b',
          image_url: 'https://example.test/b.png',
          sort_order: 0,
          created_at: '2026-08-03T00:00:00.000Z',
        },
        {
          id: 'image-a',
          image_url: 'https://example.test/a.png',
          sort_order: 0,
          created_at: '2026-08-03T00:00:00.000Z',
        },
      ],
    };

    expect(adaptProductCards([row])[0].imageUrl).toBe(
      'https://example.test/a.png',
    );
  });

  it('normalizes a missing aggregate join to a zero-count null summary', () => {
    const detail = adaptProductDetail({
      ...sparseCatalogRow,
      rating_aggregates: null,
    });

    expect(detail.ratingSummary).toEqual({
      productId: SPARSE_PRODUCT_ID,
      ratingCount: 0,
      lookAvg: null,
      outfitAvg: null,
      materialAvg: null,
      craftsmanshipAvg: null,
      maintenanceAvg: null,
      comfortAvg: null,
      collectionAvg: null,
      valueAvg: null,
      resalePotentialAvg: null,
      acquisitionEaseAvg: null,
      communityScore: null,
      methodologyVersion: null,
    });
  });

  it('returns deterministic image and verified-offer ordering for Detail', () => {
    const detail = adaptProductDetail(completeCatalogRow);

    expect(detail.product).toEqual({
      id: COMPLETE_PRODUCT_ID,
      brand: 'Nike',
      name: 'Nike Air Force 1 Low White',
      sku: 'CW2288-111',
      sizeType: 'men',
      releaseDate: '2020-07-15',
      description: 'The all-white staple Air Force 1 Low.',
    });
    expect(detail.imageUrls).toEqual([
      'https://example.test/air-force-primary.png',
      'https://example.test/air-force-later.png',
    ]);
    expect(detail.eazyAssessment).toEqual({
      score100: 79,
      methodologyVersion: 'sneaker-10-v1',
      assessedAt: '2026-08-03T16:17:14.000Z',
      dimensions: {
        look: 8,
        outfit: 8,
        material: 8,
        craftsmanship: 8,
        maintenance: 7,
        comfort: 8,
        collection: 8,
        value: 8,
        resalePotential: 8,
        acquisitionEase: 8,
      },
    });
    expect(detail.offers.map((offer) => offer.retailer)).toEqual([
      "DICK'S Sporting Goods",
      'Finish Line',
    ]);
    expect(detail.offers.every((offer) => offer.amount > 0)).toBe(true);
  });

  it('rejects mixed-currency offers instead of comparing raw amounts', () => {
    const mixedCurrencyRow = {
      ...completeCatalogRow,
      product_offers: [
        completeCatalogRow.product_offers[0],
        {
          ...completeCatalogRow.product_offers[1],
          currency: 'EUR',
          price: 1,
        },
      ],
    };

    expect(() => adaptProductCards([mixedCurrencyRow])).toThrow(
      expect.objectContaining({ code: 'invalid-response' }),
    );
  });

  it('classifies malformed rows as invalid responses', () => {
    expect(() =>
      adaptProductCards([{ ...completeCatalogRow, name: 42 }]),
    ).toThrow(
      expect.objectContaining({ code: 'invalid-response' }),
    );
  });
});
