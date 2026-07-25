# Eazy Review API Contracts

## Frontend Product Types

Create shared product types in `src/types/product.ts`.

```ts
export type Product = {
  id: string;
  brand: string;
  name: string;
  sku: string | null;
  sizeType: string | null;
  releaseDate: string | null;
  description: string | null;
  imageUrl?: string | null;
  eazyScore?: number | null;
  communityScore?: number | null;
  ratingCount?: number;
  lowestPrice?: number | null;
};

export type RatingBreakdown = {
  look: number;
  comfort: number;
  quality: number;
  outfit: number;
  value: number;
  overall: number;
  /**
   * Mock-era field name. Supabase / Task 16+ use `privateNote` mapped from
   * `user_ratings.private_note` (owner-only; max 500 chars). Do not treat as a public review.
   */
  comment?: string | null;
  /** Preferred name once My Rating persistence lands (Task 16). */
  privateNote?: string | null;
};

export type ProductRatingSummary = {
  productId: string;
  ratingCount: number;
  lookAvg: number | null;
  comfortAvg: number | null;
  qualityAvg: number | null;
  outfitAvg: number | null;
  valueAvg: number | null;
  overallAvg: number | null;
  /** Community aggregate; maps from DB `rating_aggregates.score`. */
  communityScore: number | null;
};

export type ProductOffer = {
  id: string;
  productId: string;
  websiteName: string;
  websiteLink: string;
  size: number | null;
  sizeRegion: string;
  currency: string;
  price: number | null;
};

/** Composed Product Detail payload. My Rating is user-specific, not a catalog Product field. */
export type ProductDetailData = {
  product: Product;
  offers: ProductOffer[];
  ratingSummary: ProductRatingSummary;
  myRating: RatingBreakdown | null;
};
```

### Canonical Product Detail field sources

Product Detail must not mix catalog card fields with detail aggregates. Use these sources only:

| UI field | Canonical source |
| --- | --- |
| Eazy Score | `detail.product.eazyScore` |
| Community Score | `detail.ratingSummary.communityScore` |
| Review / rating count | `detail.ratingSummary.ratingCount` |
| Purchase / price-by-size rows | `detail.offers` |
| Lowest price | Min of non-null `detail.offers[].price` (use that offer's `currency`); if none, optional fallback to `detail.product.lowestPrice` treated as USD in mock/MVP catalog data (`Product.lowestPrice` has no currency field) |

Do **not** bind Detail Community Score or review count to `product.communityScore` / `product.ratingCount` (those remain Browse/card convenience fields and can drift from the summary).

## Recommended Frontend Folder Structure

```txt
src/
  components/
    ui/
      Screen.tsx
      Button.tsx
      Input.tsx
      Card.tsx
      AppText.tsx
      ScoreBadge.tsx
      ProductCard.tsx
      RatingRow.tsx
      RatingInputRow.tsx
      LoadingState.tsx
      EmptyState.tsx
      ErrorState.tsx

  features/
    products/
      api.ts
      queries.ts
      mutations.ts
      types.ts
      mockProducts.ts
      mockProductDetails.ts

    ratings/
      api.ts
      queries.ts
      mutations.ts
      types.ts

    auth/
      api.ts
      queries.ts
      mutations.ts
      AuthProvider.tsx

  lib/
    supabase.ts
    queryClient.ts
    constants.ts

  utils/
    formatPrice.ts
    formatDate.ts
    calculateScore.ts
```

## Product Card Shape

Product list APIs should return a flattened card shape:

```ts
type ProductCardData = {
  id: string;
  brand: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  eazyScore: number | null;
  communityScore: number | null;
  ratingCount: number;
  lowestPrice: number | null;
};
```

The database can store this data across relational tables. Frontend code should receive a convenient shape from Supabase select joins, a view, or an RPC function. Supabase select joins are acceptable for MVP. Later, create a view named `product_card_view`.

## Products API

File: `src/features/products/api.ts`

Functions:
- `getProducts(params)`
- `getProductById(productId)`
- `searchProducts(query)`
- `getProductOffers(productId)`
- `getProductImages(productId)`

## Ratings API

File: `src/features/ratings/api.ts`

Functions:
- `getUserRating(productId, userId)`
- `saveUserRating(input)` — **not** a single PostgREST `.upsert()` against `user_ratings`
- `deleteUserRating(productId, userId)`
- `getUserRatedProducts(userId)`

### `saveUserRating` write pattern (required)

Task 12 column-level grants allow `INSERT` of identity + scores + `private_note`, but `UPDATE` only of score columns + `private_note` (not `product_id` / `user_id` / `id` / timestamps). A natural PostgREST upsert (`INSERT … ON CONFLICT DO UPDATE` with the full payload) therefore requires `UPDATE` privilege on the identity columns included in the update set and can fail **before** the immutability trigger or RLS run.

Required client (or thin repository) behavior:

1. Preferred: call a controlled **security-definer** server function that performs the insert-or-score-update atomically and is granted carefully (still no client table-wide upsert); or
2. Split path: **insert** with `product_id`, `user_id`, scores, and optional `private_note` when no own rating exists; **update** only score columns + `private_note` for an existing own row (filter by `product_id` + `user_id` / `auth.uid()`).
3. On the split path, if insert fails with PostgreSQL unique violation `23505` on `(product_id, user_id)` (concurrent first save), immediately retry the permitted score/private-note-only update for that user and product. Do not surface the unique conflict as a failed save when the retry succeeds.

Do **not** ship `supabase.from('user_ratings').upsert({ product_id, user_id, … })` as the connected write path. The historical name `upsertUserRating` in older notes means “create or replace my rating,” not PostgREST upsert.

## Product Query Hooks

File: `src/features/products/queries.ts`

Hooks:
- `useProductsQuery(params)`
- `useProductQuery(productId)`
- `useProductOffersQuery(productId)`

## Ratings Query Hooks

File: `src/features/ratings/queries.ts`

Hooks:
- `useUserRatingQuery(productId)`
- `useUserRatedProductsQuery()`

## Ratings Mutations

File: `src/features/ratings/mutations.ts`

Hooks:
- `useSubmitRatingMutation()`
- `useDeleteRatingMutation()`

After rating mutation succeeds, invalidate:
- `['product', productId]`
- `['products']`
- `['userRating', productId]`
- `['ratedProducts']`

## Search And Filters

Browse should eventually support:
- Search text.
- Brand filter.
- Size type filter.
- Price range filter.
- Eazy Score range.
- Community Score range.
- Sort.

Sort options:
- Highest Eazy Score.
- Highest Community Score.
- Most Rated.
- Newest Release.
- Lowest Price.
- Highest Price.
- Recently Added.

MVP sort options:
- Highest Eazy Score.
- Highest Community Score.
- Lowest Price.
- Recently Added.

## Backend Field Naming (Tasks 11–16)

Align new Supabase types and adapters with `docs/DATA_MODEL.md`:

| Concern | DB | Frontend |
| --- | --- | --- |
| Published catalog gate | `products.is_published` | filter / map only published rows for anonymous Browse |
| Editorial Eazy Score | `eazy_assessments` (current row) | `product.eazyScore` / assessment adapter |
| Community aggregate | `rating_aggregates` | `ProductRatingSummary` |
| My Rating scores | `user_ratings` score columns | `RatingBreakdown` scores |
| Optional personal text | `user_ratings.private_note` | `privateNote` (not a public comment) |

Rules:
- Numeric rating: persisted and shown as My Rating to the owner.
- `private_note` / `privateNote`: owner-only; never select other users’ notes. Max **500** characters (DB check + connected Rate/Edit form validation / `maxLength` in Task 16 — do not rely on the DB error alone).
- Public written reviews: not implemented.
- **UI label (Task 16+):** the Rate/Edit optional field is **Private note** (not “Comment”). Property rename `comment` → `privateNote` and the visible label change land together so the owner-only field is not presented as a public comment. Mock-era screens may still say “Comment” until that task.
- Data API access requires explicit `GRANT`s **after** RLS policies (Task 12); Task 11 only enables RLS deny-by-default. See `docs/DATA_MODEL.md` Privileges And Data API Exposure.

### Zero-rating / missing aggregate rows

`ProductRatingSummary.ratingCount` is a required number. Trusted path:

1. Every `products` insert creates a matching `rating_aggregates` row with `rating_count = 0` and null averages/score (see `docs/DATA_MODEL.md` product→aggregate ensure trigger). Task 13 seeds must not leave published products without that row.
2. Task 14 Detail/Browse adapters still **normalize** a missing join to the canonical empty summary (`ratingCount: 0`, null averages / `communityScore`) so a seed gap cannot crash Detail. Do not invent client-side Community Score math — only the empty shape.

## Mock Data Contract

Before Supabase (Tasks 11–13 schema work does not require removing mocks):

- Catalog / list products: `src/features/products/mockProducts.ts` — `Product[]` only (identity, metadata, card score/price fields). Do not embed offers, rating summaries, or My Rating here.
- Mock catalog photography: every catalog fixture uses a `mock-product://catalog/<id>` `imageUrl`, resolved to a bundled, logo-free studio asset by `src/features/products/mockProductImages.ts`. Unmapped `mock-product://` URIs resolve to no image source so UI shows the "Image coming soon" placeholder. Production/API product images remain normal HTTP(S) URLs; the mock-only scheme does not change the `Product` contract.
- Product Detail fixtures: `src/features/products/mockProductDetails.ts` — offers, `ProductRatingSummary`, and user-specific `myRating` per catalog id, composed via `getMockProductDetailById(productId): ProductDetailData | null`.
- Mock My Rating write: `saveMockMyRating(productId: string, rating: RatingBreakdown): boolean` in the same file — the frontend mock-data write API for Task 9.

`saveMockMyRating` semantics (session-only; not a backend write):

- Confirms the product/detail fixture exists with the same rules as `getMockProductDetailById`; returns `false` if not.
- Stores a **copied** `RatingBreakdown` in a private in-module map (`mockMyRatingsByProductId` is not exported). Empty / omitted comment (mock alias for private note) is stored as `null`.
- Returns `true` on success.
- Does **not** update Community Score, community category averages, rating count, catalog card fields, or any persistent storage. Reload resets fixtures.
- Screens must call this API only — never import or mutate the private map.

**Task 14 transitional note:** when Browse/Detail switch to Supabase product UUIDs, Rate/Edit must not stay bound only to `getMockProductDetailById` / `saveMockMyRating` against `mockProducts` keys (those reject unknown IDs). Load product context from the real Detail repository (or adapter); keep session My Rating in a map keyed by **viewer identity + product ID** (including UUIDs) until Task 16 replaces it with Supabase persistence. Clear or re-key on auth changes so accounts never share in-memory ratings. See `docs/TASKS.md` Task 14–15.

```ts
import type { Product } from '@/src/types/product';

export const mockProducts: Product[] = [
  {
    id: '1',
    brand: 'Adidas',
    name: 'Adidas Stan Smith Gore-Tex Orange Limited (Kids)',
    sku: 'UH6907-612',
    sizeType: 'big kids',
    releaseDate: '2024-01-01',
    description: 'A limited kids version of the Adidas Stan Smith Gore-Tex with orange details.',
    imageUrl: 'mock-product://catalog/1',
    eazyScore: 77,
    communityScore: 78,
    ratingCount: 24,
    lowestPrice: 120,
  },
  {
    id: '2',
    brand: 'Nike',
    name: 'Nike Dunk Low Retro White Black',
    sku: 'DD1391-100',
    sizeType: 'men',
    releaseDate: '2021-01-14',
    description: 'A classic black and white Nike Dunk Low colorway.',
    imageUrl: 'mock-product://catalog/2',
    eazyScore: 84,
    communityScore: 81,
    ratingCount: 142,
    lowestPrice: 115,
  },
];
```

Detail fixture coverage (aligned to the catalog in `mockProducts.ts`):

- Lookup returns `ProductDetailData` for every catalog id `1`–`8`, or `null` for unknown ids.
- At least one product has offers + rating summary + non-null `myRating` (id `1`).
- At least one product has `myRating: null` (e.g. id `2`).
- Edge products stay consistent with catalog: id `6` has `ratingCount: 0` / null Community Score summary; id `8` has null Eazy Score on `product` with a present community summary.
- Empty / unusable offers: id `5` has no offers (catalog `lowestPrice` fallback); id `7` has offers with null prices (same fallback path).

```ts
import {
  getMockProductDetailById,
  saveMockMyRating,
} from '@/src/features/products/mockProductDetails';
import type { RatingBreakdown } from '@/src/types/product';

const detail = getMockProductDetailById('1');
// detail.product — from mockProducts
// detail.offers — ProductOffer[]
// detail.ratingSummary — ProductRatingSummary
// detail.myRating — RatingBreakdown | null

const rating: RatingBreakdown = {
  look: 8,
  comfort: 7,
  quality: 8,
  outfit: 7,
  value: 7,
  overall: 8,
  comment: null,
};
const ok = saveMockMyRating('2', rating);
// true → getMockProductDetailById('2').myRating reflects the copy this session
// false → unknown / unavailable product; community fixtures unchanged either way
```

## Current Product Example

```ts
import type { ProductDetailData } from '@/src/types/product';

const detail: ProductDetailData = {
  product: {
    id: '1',
    brand: 'Adidas',
    name: 'Adidas Stan Smith Gore-Tex Orange Limited (Kids)',
    sku: 'UH6907-612',
    sizeType: 'big kids',
    releaseDate: '2024-01-01',
    description: 'A limited kids version of the Adidas Stan Smith Gore-Tex with orange details.',
    imageUrl: 'mock-product://catalog/1',
    eazyScore: 77,
    communityScore: 78,
    ratingCount: 24,
    lowestPrice: 120,
  },
  offers: [
    {
      id: 'offer-1-a',
      productId: '1',
      websiteName: 'StockX',
      websiteLink: 'https://stockx.com/e53ccfe7-1cd7-494c-b',
      size: 3.5,
      sizeRegion: 'US',
      currency: 'USD',
      price: 248,
    },
    {
      id: 'offer-1-b',
      productId: '1',
      websiteName: 'StockX',
      websiteLink: 'https://stockx.com/e53ccfe7-1cd7-494c-b',
      size: 4,
      sizeRegion: 'US',
      currency: 'USD',
      price: 120,
    },
  ],
  ratingSummary: {
    productId: '1',
    ratingCount: 24,
    lookAvg: 7.8,
    comfortAvg: 7.5,
    qualityAvg: 8.0,
    outfitAvg: 7.6,
    valueAvg: 7.4,
    overallAvg: 7.8,
    communityScore: 78,
  },
  myRating: {
    look: 8,
    comfort: 7,
    quality: 8,
    outfit: 7,
    value: 7,
    overall: 8,
    comment: 'Great kids colorway; Gore-Tex is a plus.',
  },
};
```
