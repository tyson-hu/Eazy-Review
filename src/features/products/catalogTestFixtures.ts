export const COMPLETE_PRODUCT_ID =
  'a1000000-0000-4000-8000-000000000001';
export const SPARSE_PRODUCT_ID =
  'a1000000-0000-4000-8000-000000000002';

const emptyAggregate = (productId: string) => ({
  product_id: productId,
  rating_count: 0,
  look_avg: null,
  outfit_avg: null,
  material_avg: null,
  craftsmanship_avg: null,
  maintenance_avg: null,
  comfort_avg: null,
  collection_avg: null,
  value_avg: null,
  resale_potential_avg: null,
  acquisition_ease_avg: null,
  score: null,
  methodology_version: null,
});

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
      methodology_version: 'sneaker-10-v1',
      created_at: '2026-08-03T16:17:14.000Z',
      is_current: true,
      look: 8,
      outfit: 8,
      material: 8,
      craftsmanship: 8,
      maintenance: 7,
      comfort: 8,
      collection: 8,
      value: 8,
      resale_potential: 8,
      acquisition_ease: 8,
    },
  ],
  rating_aggregates: emptyAggregate(COMPLETE_PRODUCT_ID),
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
  rating_aggregates: emptyAggregate(SPARSE_PRODUCT_ID),
  product_offers: [],
} as const;
