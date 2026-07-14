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
  comment?: string | null;
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
  /** Community aggregate; maps from DB rating_summaries.score. */
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
| Lowest price | Min of non-null `detail.offers[].price`; if none, optional fallback to `detail.product.lowestPrice` |

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
- `upsertUserRating(input)`
- `deleteUserRating(productId, userId)`
- `getUserRatedProducts(userId)`

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

## Mock Data Contract

Before Supabase:

- Catalog / list products: `src/features/products/mockProducts.ts` — `Product[]` only (identity, metadata, card score/price fields). Do not embed offers, rating summaries, or My Rating here.
- Product Detail fixtures: `src/features/products/mockProductDetails.ts` — offers, `ProductRatingSummary`, and user-specific `myRating` per catalog id, composed via `getMockProductDetailById(productId): ProductDetailData | null`.

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
    imageUrl: null,
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
    imageUrl: null,
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
import { getMockProductDetailById } from '@/src/features/products/mockProductDetails';

const detail = getMockProductDetailById('1');
// detail.product — from mockProducts
// detail.offers — ProductOffer[]
// detail.ratingSummary — ProductRatingSummary
// detail.myRating — RatingBreakdown | null
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
    imageUrl: null,
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
