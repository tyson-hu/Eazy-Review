export const COMPLETE_PRODUCT_ID =
  'a1000000-0000-4000-8000-000000000001';
export const SPARSE_PRODUCT_ID =
  'a1000000-0000-4000-8000-000000000002';

export const completeCatalogRow = {
  id: COMPLETE_PRODUCT_ID,
  brand: 'Nike',
  name: 'Nike Air Force 1 Low White',
  sku: 'CW2288-111',
  size_type: 'men',
  release_date: '2020-07-15',
  description: 'The all-white staple Air Force 1 Low.',
  created_at: '2026-08-03T16:17:14.000Z',
  product_images: [
    {
      id: 'image-later',
      image_url: 'https://example.test/air-force-later.png',
      sort_order: 0,
      created_at: '2026-08-03T16:17:15.000Z',
    },
    {
      id: 'image-primary',
      image_url: 'https://example.test/air-force-primary.png',
      sort_order: 0,
      created_at: '2026-08-03T16:17:14.000Z',
    },
  ],
  eazy_assessments: [
    {
      id: 'assessment-current',
      score: 79,
      methodology_version: 'task13-seed-v1',
      created_at: '2026-08-03T16:17:14.000Z',
      is_current: true,
    },
  ],
  rating_aggregates: {
    product_id: COMPLETE_PRODUCT_ID,
    rating_count: 0,
    look_avg: null,
    comfort_avg: null,
    quality_avg: null,
    outfit_avg: null,
    value_avg: null,
    overall_avg: null,
    score: null,
  },
  product_offers: [
    {
      id: 'offer-finish-line',
      website_name: 'Finish Line',
      size: 10,
      size_region: 'US',
      currency: 'USD',
      price: 115,
      last_checked_at: '2026-08-03T16:17:14.000Z',
    },
    {
      id: 'offer-dicks',
      website_name: "DICK'S Sporting Goods",
      size: 10,
      size_region: 'US',
      currency: 'USD',
      price: 114.99,
      last_checked_at: '2026-08-03T16:17:14.000Z',
    },
    {
      id: 'offer-unverified',
      website_name: 'Unverified Store',
      size: null,
      size_region: 'US',
      currency: 'USD',
      price: null,
      last_checked_at: null,
    },
  ],
} as const;

export const sparseCatalogRow = {
  id: SPARSE_PRODUCT_ID,
  brand: 'Adidas',
  name: 'Adidas Samba OG Cloud White Core Black',
  sku: 'B75806',
  size_type: 'unisex',
  release_date: null,
  description: null,
  created_at: '2026-08-03T16:17:14.000Z',
  product_images: [],
  eazy_assessments: [],
  rating_aggregates: {
    product_id: SPARSE_PRODUCT_ID,
    rating_count: 0,
    look_avg: null,
    comfort_avg: null,
    quality_avg: null,
    outfit_avg: null,
    value_avg: null,
    overall_avg: null,
    score: null,
  },
  product_offers: [],
} as const;
