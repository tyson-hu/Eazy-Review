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
   * Mock-era field name. Supabase / Task 17+ use `privateNote` mapped from
   * `user_ratings.private_note` (owner-only; max 500 chars). Do not treat as a public review.
   */
  comment?: string | null;
  /** Preferred name once My Rating persistence lands (Task 17). */
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
  /** Community aggregate; maps from DB rating_aggregates.score. */
  communityScore: number | null;
};

export type ProductOffer = {
  id: string;
  productId: string;
  websiteName: string;
  websiteLink: string;
  /** Null when the offer has no size; DB rejects negative and non-finite values. */
  size: number | null;
  /** Required size system label; DB enforces non-null MVP whitelist (`US` only until expanded). */
  sizeRegion: string;
  /** Required ISO 4217 code; DB enforces non-null MVP whitelist (`USD` only until expanded). */
  currency: string;
  /** Null when unavailable; DB rejects negative and non-finite values. */
  price: number | null;
};

/** Public/cacheable Product Detail data; never contains viewer-owned state. */
export type ProductDetailPublicData = {
  product: Product;
  offers: ProductOffer[];
  ratingSummary: ProductRatingSummary;
};

/** Screen composition. My Rating is loaded from a separate user-scoped source. */
export type ProductDetailData = ProductDetailPublicData & {
  myRating: RatingBreakdown | null;
};

export type AccountProfile = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  /** Maps from non-null profiles.created_at. */
  joinedAt: string;
};
```

## Task 11–12 Backend Contract

Tasks 11–12 establish database and authorization contracts only. They do not
replace mock repositories, rename the current mock `comment` field in UI code,
add auth screens, or connect rating writes. Task 11 schema (tables, triggers,
deny-by-default RLS with no client policies/grants) precedes the accepted Task
12 policies and explicit least-privilege Data API grants. They expose profile
rows only to their authenticated owner. Dated migration and environment
acceptance results are preserved in
[`docs/evidence/task-11-12-database-acceptance/RESULT.md`](evidence/task-11-12-database-acceptance/RESULT.md).

| Database contract | Frontend / API meaning |
| --- | --- |
| `products.is_published` | Anonymous Browse/Detail adapters must eventually select published products only; Tasks 11–12 add no runtime adapter |
| Current `eazy_assessments` row | Future source for `Product.eazyScore`; select `is_current = true` |
| `rating_aggregates` | Future source for `ProductRatingSummary` and Community Score; clients never calculate or write it |
| `user_ratings.private_note` | Future Task 17 `privateNote`; maximum 500 characters and owner-only |
| `profiles.created_at` | Non-null `AccountProfile.joinedAt`; optional mutable profile fields may remain null |
| Immutable `user_ratings.product_id` / `user_id` | Identity is set on insert and cannot appear in a client update |
| `product_offers.size_region` / `currency` | Required strings; MVP database allowlists are `US` and `USD` |
| `product_offers.size` / `price` | `null` means unavailable/unsized; otherwise finite and non-negative |

Task 11 enables RLS while leaving client policies and `PUBLIC` / `anon` /
`authenticated` grants absent. Task 12 adds policies first, revokes inherited
table-wide privileges from all three roles, then grants the least-privilege
Data API allowlist in `docs/DATA_MODEL.md`. Effective privilege tests must
include access inherited through `PUBLIC`. A successful policy test does not
prove the required grant exists, and a grant does not replace a row policy.

`rating_aggregates` stores the arithmetic mean of each 1–10 rating category
rounded to two decimal places. `score` maps to Community Score and is
`round(avg(overall) * 10)` from the unrounded overall mean. A zero-count row has
null category averages, `overall_avg`, and `score`.

The privileged trigger boundary is explicit: `handle_new_user` inserts the
profile for a new auth user, and `handle_user_rating_change` owns aggregate
writes. Rating insert/update/delete statement triggers pass transition tables
to that entrypoint, which derives a 64-bit advisory-lock key for every distinct
affected product and processes the actual keys in stable order. Both
privileged entrypoints are trigger-only `SECURITY DEFINER`
functions with an empty search path, fully qualified relations, and client
execution revoked. Trusted
`service_role` access is server-only and must be positively tested against its
exact allowlist; its secret never enters Expo.

Raw `user_ratings` rows are not a public review API while `private_note` shares
the row. Community surfaces read `rating_aggregates`; My Rating reads only the
authenticated owner's row.

Raw `profiles` rows are also not public catalog data. Anonymous clients receive
no profile grant or policy; authenticated clients select only the row whose
`profiles.id` matches `auth.uid()`. Profile updates remain limited to
`display_name`, `username`, and `avatar_url`.

Task 12 intentionally grants rating `UPDATE` only for score columns and
`private_note`. The later persistence implementation must use a write pattern
compatible with immutable identity rather than assuming table-wide identity
updates are available.

### Canonical Product Detail field sources

Product Detail must not mix catalog card fields with detail aggregates. Use these sources only:

| UI field | Canonical source |
| --- | --- |
| Eazy Score | `detail.product.eazyScore` |
| Community Score | `detail.ratingSummary.communityScore` |
| Review / rating count | `detail.ratingSummary.ratingCount` |
| Purchase / price-by-size rows | `detail.offers` |
| Lowest price | Min of non-null prices among offers that share **one** currency for the product payload (use that currency). MVP: if offers mix currencies, keep only the dominant/seed currency set and omit or reject the rest — never take a raw numeric min across currencies. If no usable offer prices remain, optional fallback to `detail.product.lowestPrice` treated as USD in mock/MVP catalog data (`Product.lowestPrice` has no currency field) |
| Card / Detail `imageUrl` | Primary `product_images` row: `sort_order ASC`, then `created_at ASC`, then `id ASC`. No images → `null`. |

Do **not** bind Detail Community Score or review count to `product.communityScore` / `product.ratingCount` (those remain Browse/card convenience fields and can drift from the summary).

## Recommended Frontend Folder Structure

```txt
src/
  components/
    ui/
      ...

  features/
    products/
      mockProducts.ts          # Task 6–15 transitional mock catalog
      mockProductDetails.ts
      # api.ts / queries.ts arrive with Task 15 connected reads

    ratings/
      # connected modules arrive with Task 17

    auth/
      # AuthProvider and APIs arrive with Task 16+

  lib/
    env/
      publicEnv.ts             # Task 14 public EXPO_PUBLIC_* validation
    supabase/
      client.ts                # Task 14 singleton
      createClient.ts
      authStorage.ts           # Task 14 AsyncStorage session adapter
    query/
      client.ts                # Task 14 QueryClient factory
      keys.ts                  # public catalog vs user-scoped key factories
      lifecycle.ts             # NetInfo online + AppState focus (+ auth refresh)
      userScopedCache.ts       # removeUserScopedQueries for auth transitions
    constants.ts

  providers/
    AppProviders.tsx           # QueryClientProvider + lifecycle

  test/
    setup.ts
    renderWithProviders.tsx    # isolated QueryClient per test
    harness.smoke.test.tsx

  types/
    database.generated.ts      # local schema; npm run types:generate
    product.ts

  utils/
    formatPrice.ts
```

Community Score is server-owned; the recommended frontend structure does not
include a score-calculation utility. Display formatting may live in a focused
utility only when a concrete caller requires it.

### Public environment contract (Task 14)

Expo may only receive:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public publishable key or legacy anon JWT)

Validated by `src/lib/env/publicEnv.ts`. Never place `service_role`, database
passwords, JWT signing secrets, or management tokens in Expo config.

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
  /** ISO 4217 code for `lowestPrice`; null when there is no displayable price. */
  lowestPriceCurrency: string | null;
};
```

The database can store this data across relational tables. Frontend code should receive a convenient shape from Supabase select joins, a view, or an RPC function. Supabase select joins are acceptable for MVP. Later, create a view named `product_card_view`.

Browse cards must format `lowestPrice` with `lowestPriceCurrency` (via
`formatPrice` / `Intl.NumberFormat`). Do not hardcode a `$` prefix. When Task 15
maps a single-currency offer set into Browse, carry that same selected currency
into `lowestPriceCurrency`. Mock catalog `Product.lowestPrice` has no currency
field and is treated as USD until offer-backed mapping lands.

## Products API

File: `src/features/products/api.ts`

Functions:
- `getProducts(params)`
- `getProductById(productId)` — returns `ProductDetailPublicData`; never embeds
  `myRating`
- `searchProducts(query)`
- `getProductOffers(productId)`
- `getProductImages(productId)`

## Auth API

File: `src/features/auth/api.ts`

Functions:
- `requestPasswordReset(email)`
- `updatePasswordFromRecovery(newPassword)`
- `deleteCurrentUser()` — calls a protected server endpoint; no user id
  parameter

### Password-recovery completion (required)

`app/auth/reset-password.tsx` is a recovery-only completion route. It may call
`updatePasswordFromRecovery` only after the app has exchanged/verified the
provider deep link and observed a valid `PASSWORD_RECOVERY` auth event/session.
Direct navigation, an ordinary signed-in session, an expired link, or a
replayed/invalid link must not expose a working password-update action; show a
safe error and route back to a new recovery request instead.

Tests cover a valid recovery session, direct navigation, an ordinary session,
and expired/invalid recovery state. Successful completion proves the new
password works and the old password does not.

### Delete-current-user server contract (required)

The client sends its current bearer session to a protected server endpoint and
never sends an authoritative target user id. The server:

1. verifies the caller with the Auth server and derives the target id only from
   that verified user;
2. enforces recent reauthentication when the selected provider flow requires
   it;
3. calls Supabase Auth Admin
   [`signOut(callerJwt, 'global')`](https://supabase.com/docs/reference/javascript/auth-admin-signout)
   with the verified caller JWT to revoke every refresh session; never write
   directly to the managed `auth.sessions` table, and abort without deleting
   the user if global revocation fails;
4. uses a server-only secret/service-role client to hard-delete that same
   `auth.users` row; and
5. returns an honest success/error result so the client clears its local auth
   state and all user-scoped cache only after confirmed deletion.

Reject missing/invalid auth, any attempt to target another id, and any request
whose verified caller no longer has a live session. The service-role secret
never enters Expo.

Non-destructive orchestration tests use mocked Auth Admin boundaries to prove
the verified caller JWT is passed with `global` scope and `deleteUser` is not
called when sign-out fails. They do not delete an account.

Hard deletion cascades the user's `profiles` and `user_ratings` rows. Those
rows, including `private_note`, have no MVP retention/anonymization copy.
Affected products and `rating_aggregates` remain; the rating-delete trigger
must recompute each aggregate, including the zero-count/null state when the
deleted user was the last rater.

Revoking sessions invalidates refresh tokens, but an already-issued JWT can
remain cryptographically valid until its configured expiry. Record the
project's configured JWT lifetime (MVP maximum: one hour) as the residual
window. Sensitive server endpoints must validate the JWT `session_id` against
a live Auth session when immediate post-revocation rejection is required.

## Ratings API

File: `src/features/ratings/api.ts`

Functions:
- `getUserRating(productId, userId)`
- `saveUserRating(input)` — **not** a single PostgREST `.upsert()` against `user_ratings`
- `deleteUserRating(productId, userId)`
- `getUserRatedProducts(userId)`

### `saveUserRating` write pattern (required)

Task 12 column-level grants allow `INSERT` of identity + scores +
`private_note`, but `UPDATE` only of score columns + `private_note` (not
`product_id` / `user_id` / `id` / timestamps). A natural PostgREST upsert with
the full payload can therefore require forbidden identity-column update
privileges before immutability or RLS checks run.

The Task 17 MVP path is the direct RLS-protected split path:

1. Read the caller's existing rating.
2. Insert identity, scores, and optional private note when absent.
3. Update only scores and private note when present.
4. On unique violation `23505`, retry the permitted update.

Do not add a `SECURITY DEFINER` save function unless this accepted path proves
insufficient through a reproducible correctness or performance defect and a
separately authorized schema/security change.

Do not ship `supabase.from('user_ratings').upsert({ product_id, user_id, … })`.
The historical name `upsertUserRating` meant “create or replace my rating,” not
a PostgREST upsert.

## Product Query Hooks

File: `src/features/products/queries.ts` (Task 15)

Hooks:
- `useProductsQuery(params)`
- `useProductQuery(productId)` — public `ProductDetailPublicData` only
- `useProductOffersQuery(productId)`

Use the centralized factories in `src/lib/query/keys.ts`:

- Public catalog (never include user id): `catalogKeys.products()`,
  `catalogKeys.product(productId)`
- Equivalent historical shapes in prose: `['catalog','products']`,
  `['catalog','product', productId]` (prefer factories over hand-built arrays)

## Ratings Query Hooks

File: `src/features/ratings/queries.ts` (Task 17)

Hooks:
- `useUserRatingQuery(productId)` — enabled only when an authenticated `userId` is present
- `useUserRatedProductsQuery()` — enabled only when an authenticated `userId` is present

User-scoped keys must include the account id (factories in
`src/lib/query/keys.ts`):

- `ratingKeys.mine(userId, productId)` → `['rating','mine', userId, productId]`
- `ratingKeys.ratedProducts(userId)` → `['rating','ratedProducts', userId]`
- `accountKeys.profile(userId)` → `['account','profile', userId]`

On sign-out or account switch, call `removeUserScopedQueries(queryClient)` so
prior user profile/rating cache cannot leak. Do not enable user-scoped queries
until `userId` is known. Product Detail composes `ProductDetailData` from the
public product query plus My Rating; `myRating` must never be stored under a
public catalog key.

Public vs user-scoped distinction (locked):

- Public catalog keys are shareable across anonymous and authenticated sessions.
- User-owned keys always embed the authenticated user id.
- Clearing user scopes must leave valid public catalog cache intact.

## Ratings Mutations

File: `src/features/ratings/mutations.ts`

Hooks:
- `useSubmitRatingMutation()`
- `useDeleteRatingMutation()`

After rating mutation succeeds, invalidate:

- `catalogKeys.product(productId)`
- `catalogKeys.products()`
- `ratingKeys.mine(userId, productId)`
- `ratingKeys.ratedProducts(userId)`

## Task 20 Search, Filter, And Sort Options

These options are conditional and are not part of Tasks 15–19. Implement them
only after Task 20 records measured catalog or query-plan evidence that
client-side loading and search are insufficient.

When triggered, Browse may support:
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

Initial Task 20 sort options:
- Highest Eazy Score.
- Highest Community Score.
- Lowest Price.
- Recently Added.

## Backend Field Naming (Tasks 11–17)

| Concern | DB | Frontend |
| --- | --- | --- |
| Published catalog gate | `products.is_published` | filter/map only published rows for anonymous Browse |
| Editorial Eazy Score | `eazy_assessments` where `is_current = true` | `product.eazyScore` / assessment adapter |
| Community aggregate | `rating_aggregates` | `ProductRatingSummary` |
| My Rating scores | `user_ratings` score columns | `RatingBreakdown` scores |
| Optional personal text | `user_ratings.private_note` | `privateNote` (not a public comment) |

Rules:

- `private_note` / `privateNote` is owner-only and at most 500 characters
  (database check plus connected form validation).
- Public written reviews are not implemented.
- Task 17 changes the optional-field label from **Comment** to
  **Private note** and the property from `comment` to `privateNote` together.
- Data API grants land only after Task 12 RLS policies.

### Zero-rating / missing aggregate rows

Every product insert creates a matching zero-count `rating_aggregates` row.
Task 13 seeds must not leave published products without it. Task 15 adapters
still normalize a missing join to `ratingCount: 0` with null averages and
Community Score; they never invent client-side score math.

## Mock Data Contract

Before connected reads (Tasks 11–14 do not require removing mocks):

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

When Task 15 switches Browse/Detail to Supabase UUIDs, it does not adapt
session-only My Rating persistence to connected products. The Rate action stays
honestly unavailable/gated until Tasks 16–17 provide identity and durable
persistence; no temporary viewer/product map is part of the connected
contract.

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
