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

/** Anonymous Browse card; contains public catalog data only. */
export type ProductCardData = {
  id: string;
  brand: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  eazyScore: number | null;
  communityScore: number | null;
  ratingCount: number;
  lowestOffer: {
    retailer: string;
    amount: number;
    currency: string;
    market: string;
    sizeLabel: string | null;
    checkedAt: string;
  } | null;
};

/**
 * Dimension scores are 0–10 half-steps. Composite scores are 0–100 and never
 * user-entered. Live shapes live in `src/types/product.ts` and
 * `src/features/ratings/*` (methodology `sneaker-10-v1`).
 */
export type RatingDimensionScores = {
  look: number;
  outfit: number;
  material: number;
  craftsmanship: number;
  maintenance: number;
  comfort: number;
  collection: number;
  value: number;
  resalePotential: number;
  acquisitionEase: number;
};

/** Owner My Rating: ten dimensions + derived `score100` + optional private note. */
export type MyRating = RatingDimensionScores & {
  score100: number;
  privateNote: string | null;
  methodologyVersion: 'sneaker-10-v1';
};

/**
 * Client write body for create/edit rating. Clients send dimensions and
 * optional `privateNote` only. Do not submit an arbitrary composite that can
 * disagree with dimensions; if a client previews `score100`, it must match the
 * shared formula `round(sum of dimensions)`.
 */
export type SaveUserRatingInput = RatingDimensionScores & {
  productId: string;
  userId: string;
  privateNote?: string | null;
};

export type ProductRatingSummary = {
  productId: string;
  ratingCount: number;
  lookAvg: number | null;
  outfitAvg: number | null;
  materialAvg: number | null;
  craftsmanshipAvg: number | null;
  maintenanceAvg: number | null;
  comfortAvg: number | null;
  collectionAvg: number | null;
  valueAvg: number | null;
  resalePotentialAvg: number | null;
  acquisitionEaseAvg: number | null;
  /** Community Score 0–100; maps from DB `rating_aggregates.score`. */
  communityScore: number | null;
};

/** Legacy mock-rating offer shape retained outside connected Task 15 screens. */
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

/** Public/cacheable Product Detail data; never contains viewer-owned state. */
export type ProductDetailPublicData = {
  product: Product;
  imageUrls: string[];
  eazyAssessment: {
    score: number;
    methodologyVersion: string | null;
    assessedAt: string | null;
  } | null;
  offers: Array<{
    id: string;
    retailer: string;
    amount: number;
    currency: string;
    market: string;
    sizeLabel: string | null;
    checkedAt: string;
  }>;
  ratingSummary: ProductRatingSummary;
};

/** Legacy mock composition. Task 15 public queries never return this shape. */
export type ProductDetailData = {
  product: Product;
  offers: ProductOffer[];
  ratingSummary: ProductRatingSummary;
  myRating: MyRating | null;
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
| `user_ratings.private_note` | Task 17 `privateNote`; maximum 500 characters and owner-only |
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

Under methodology **`sneaker-10-v1`**, `rating_aggregates` stores the arithmetic
mean of each 0–10 dimension (rounded to two decimals for storage) and a
server-derived Community Score: `round(sum of unrounded dimension means)`,
matching Eazy/My Rating composite derivation. Zero-count rows keep averages,
`score`, and `methodology_version` null. Clients never write aggregates or
submit arbitrary composites.

Rating write transport errors (Task 17):

| Code / class | Meaning | Safe UI copy |
| --- | --- | --- |
| offline | NetInfo / onlineManager says offline before/during fail-fast | You're offline. Connect to the internet and try again. |
| timeout | Bounded request deadline (~10s) aborted the request | The request took too long. Please try again. |
| transport / unreachable | Network present but backend failed | Cannot reach the server. Please try again. |
| unauthorized | Session missing / not allowed | Session-safe sign-in guidance |
| validation | Client or DB constraint failure | Field-level and sticky footer form error (incomplete dimensions report remaining count; no silent fail) |
| server | Other PostgREST / unexpected | Generic retry-safe message |

Do not label every transport failure as offline. Do not surface raw SDK errors.

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

Task 12 grants rating `INSERT`/`UPDATE` only for allowed columns and
`private_note`. Task 17 updates that allowlist to the ten sneaker-10-v1
dimensions (not `score` / `methodology_version`). Persistence uses
read → update/insert → `23505` recovery rather than PostgREST upsert, and
never assumes table-wide identity updates.

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
      api.ts                    # Task 15 anonymous Supabase reads
      adapters.ts               # raw response → stable public view models
      errors.ts                 # catalog domain errors + retry policy
      queries.ts                # identity-neutral TanStack Query hooks
      mockProducts.ts           # isolated legacy fixtures; not runtime Browse
      mockProductDetails.ts     # isolated legacy fixtures; not runtime Detail

    auth/
      api.ts                    # Task 16 email/password sign-in, sign-up, sign-out
      errors.ts                 # Normalized auth errors (no raw SDK text)
      types.ts
      returnPath.ts             # Safe internal returnTo allowlist
      AuthProvider.tsx          # Session state + user-scoped cache isolation
      hooks.ts

    account/
      api.ts                    # Owner profile read + member-since format
      queries.ts                # User-scoped profile query

    ratings/
      # connected modules arrive with Task 17

  lib/
    env/
      publicEnv.ts             # Task 14 public EXPO_PUBLIC_* validation
    supabase/
      client.ts                # Task 14 singleton
      createClient.ts
      authStorage.ts           # Task 14/16 AsyncStorage session adapter (HUMAN ACCEPTED MVP; SecureStore waived for Task 16)
    query/
      client.ts                # Task 14 QueryClient factory
      keys.ts                  # public catalog vs user-scoped key factories
      lifecycle.ts             # NetInfo online + AppState focus (+ auth refresh)
      userScopedCache.ts       # removeUserScopedQueries for auth transitions
    constants.ts

  providers/
    AppProviders.tsx           # QueryClientProvider + AuthProvider + lifecycle

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
  lowestOffer: {
    retailer: string;
    amount: number;
    currency: string;
    market: string;
    sizeLabel: string | null;
    checkedAt: string;
  } | null;
};
```

Task 15 uses one nested Supabase select for the complete published Browse list;
it does not issue one request per card. Products are ordered by `created_at`,
then `id`. The primary image is ordered by `sort_order`, `created_at`, then
`id`. The adapter sorts displayable verified offers by amount, retailer,
size/market, verification time, then id and selects the first. Mixed currencies
are rejected as `invalid-response` rather than compared numerically.

Browse cards format the selected offer with its returned currency via
`formatPrice` / `Intl.NumberFormat`; they do not hardcode a currency symbol.
Null image, assessment, Community Score, and lowest offer values remain null.

## Products API

File: `src/features/products/api.ts`

Functions:
- `getProducts(options)` — one anonymous request for the published Browse list
- `getProductById(productId)` — returns `ProductDetailPublicData`; never embeds
  `myRating`; one anonymous request for the published product

Both functions select only their surface's public columns and nested public
relations. Search is client-side over the returned brand/name/SKU fields for
the deterministic MVP catalog; there is no separate search request. The detail
adapter preserves image order and sorts verified offers deterministically.
Missing or unpublished detail rows become the domain `not-found` result.

## Auth API

File: `src/features/auth/api.ts`

Task 16 functions (email/password only):
- `signInWithPassword({ email, password })`
- `signUpWithPassword({ email, password })` — may return
  `confirmation-required` when the provider creates a user without a session
- `signOut()` — current-device local sign-out via
  `client.auth.signOut({ scope: 'local' })` (explicit; not global revocation)
- `restoreSession()` — best-effort session restoration on launch. Reads the
  local persisted session with `getSession()`, then when the device is online
  validates the principal with Auth `getUser()` (server-backed). Definitive
  invalid identity/session errors clear the local session only (scope
  `local`); offline and transient transport/5xx validation failures preserve
  the local principal. Profile rows are not the identity validity check.

Task 16 routes:
- `app/auth/sign-in.tsx`
- `app/auth/sign-up.tsx`

Safe internal `returnTo` allows primarily `/product/<uuid>` and Account;
external URLs and schemes are rejected. Post-auth navigation uses
`router.dismissTo(returnTo)` so existing destinations are revealed rather than
duplicated via forward `replace`.

Task 16 does **not** implement:
- account deletion (Task 19)
- social login / MFA / passkeys (deferred unless roadmap promotes)

Task 17 rating writes are separate from auth.

### Task 18 password recovery

Functions (file: `src/features/auth/api.ts`):

- `requestPasswordReset(email)` — calls
  `client.auth.resetPasswordForEmail` with
  `redirectTo = Linking.createURL('/auth/reset-password')` (scheme
  `eazyreview`). Trims/lowercases the email. Rejects obviously malformed
  addresses client-side. Never retries. Success copy is always
  non-enumerating: it does not claim whether an account exists. Known
  account-existence provider rejections (for example `user_not_found`) return
  the same submitted result as an accepted request; transport and service
  failures remain visible and retryable.
- Local physical-device recovery also requires the Auth email-link origin from
  `SUPABASE_AUTH_EXTERNAL_URL` in the gitignored root `.env`, including the
  `/auth/v1` suffix. It must use a Mac LAN host the device can reach; this is
  separate from the app callback supplied as `redirectTo`.
- `updatePasswordFromRecovery(newPassword)` — calls
  `client.auth.updateUser({ password })` once. Enabled only after a verified
  recovery phase. Never retries or queues offline password updates.
- `processAuthCallbackUrl(url)` — exchanges a PKCE `code` or applies
  access/refresh tokens from a recovery deep link without logging the URL or
  tokens.

AuthProvider recovery phase (not ordinary session status):

- `idle` — no recovery callback
- `processing` — deep-link exchange in flight
- `verified` — `PASSWORD_RECOVERY` (or verified recovery callback); form OK
- `temporary-failure` — transport/server verification failed; reopening the
  same link may retry without treating it as expired
- `unavailable` — expired, reused, or malformed link

Recovery-link processing is also bound to the authoritative auth generation and
principal. If sign-out or a different-account auth transition supersedes an
in-flight callback, neither its late SDK `PASSWORD_RECOVERY` event nor its result
can promote the phase to `verified`. Same-principal SDK transitions emitted by
the recovery exchange remain valid. Because Supabase installs a recovery
session before emitting its SDK event, rejecting a stale event also gates
authenticated UI and restores the superseding full session outside the auth
callback, including when the exchange reports the stale session through
ordinary `SIGNED_IN`. If that session cannot be restored, the provider signs
out the current device only rather than expose an identity/bearer mismatch or
revoke other-device sessions. A failed or throwing local sign-out still
settles provider state to signed-out instead of leaving auth initializing.
Concurrent duplicate delivery of the same callback is deduplicated while
processing so a replay of its single-use code cannot overwrite the first
successful exchange; a later reopen after processing finishes can still retry
a temporary failure.

Routes:

- `app/auth/forgot-password.tsx` — request only
- `app/auth/reset-password.tsx` — completion + deep-link target

`app/auth/reset-password.tsx` may call `updatePasswordFromRecovery` only when
`recoveryPhase === 'verified'`. Direct navigation, an ordinary signed-in
session, an expired link, or a replayed/invalid link must not expose a working
password-update action; show a safe error and route to a new recovery request.
If the verified recovery session becomes definitively missing or expired while
updating, clear the verified phase and replace the form with that safe restart
state. Temporary and password-validation failures keep the form for manual
retry.

Successful recovery keeps the authenticated session and dismisses to Account;
it does not reuse Rate `returnTo` routing. Physical proof that the new password
works and the old password fails remains on the human iPhone checklist.

Still deferred (Task 19):

- `deleteCurrentUser()` — calls a protected server endpoint; no user id
  parameter

### Password-recovery completion (Task 18)

Tests cover a valid recovery session, direct navigation, an ordinary session,
and expired/invalid recovery state. Human physical deep-link matrix is separate
evidence.

### Delete-current-user server contract (required for Task 19)

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
- `useProductsQuery()`
- `useProductQuery(productId)` — public `ProductDetailPublicData` only

Use the centralized factories in `src/lib/query/keys.ts`:

- Public catalog (never include user id): `catalogKeys.products()`,
  `catalogKeys.product(productId)`
- Equivalent historical shapes in prose: `['catalog','products']`,
  `['catalog','product', productId]` (prefer factories over hand-built arrays)

Task 15 uses the accepted Query Client and defaults; it creates no second
client and does not persist the cache. Catalog errors are normalized to
`offline`, `timeout`, `not-found`, `unauthorized`, `invalid-response`, or
`server-error`, so screens never interpret PostgREST/Supabase errors. Timeout
and server/transport failures receive at most one TanStack Query retry.
Offline, unauthorized, not-found, invalid-response, and invalid-configuration
failures receive no automatic retry. Reconnect/focus behavior remains owned by
the accepted Task 14 lifecycle, while every surface exposes manual retry where
the error is recoverable.

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

After Task 15, these modules are retained only for tests, isolated component
fixtures, legacy mock Rating routes, or explicitly named development helpers.
Runtime Browse and Product Detail must not import them or silently fall back to
them when a remote request fails:

- Catalog / list products: `src/features/products/mockProducts.ts` — `Product[]` only (identity, metadata, card score/price fields). Do not embed offers, rating summaries, or My Rating here.
- Mock catalog photography: every catalog fixture uses a `mock-product://catalog/<id>` `imageUrl`, resolved to a bundled, logo-free studio asset by `src/features/products/mockProductImages.ts`. Unmapped `mock-product://` URIs resolve to no image source so UI shows the "Image coming soon" placeholder. Production/API product images remain normal HTTP(S) URLs; the mock-only scheme does not change the `Product` contract.
- Product Detail fixtures: `src/features/products/mockProductDetails.ts` — offers
  and `ProductRatingSummary` per catalog id, composed via
  `getMockProductDetailById(productId): ProductDetailData | null`. After Task 15,
  `myRating` is always `null` on this helper; the product-ID-only mock session map
  and `saveMockMyRating` write API were removed so connected Supabase UUIDs cannot
  claim a fake session save.
- Legacy `/product/[id]/rate` is an honest **Rating unavailable** screen until
  Tasks 16–17 own sign-in and durable My Rating. It must not write mock ratings.

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
- After Task 15, every mock detail returns `myRating: null` (session mock map removed).
- Edge products stay consistent with catalog: id `6` has `ratingCount: 0` / null Community Score summary; id `8` has null Eazy Score on `product` with a present community summary.
- Empty / unusable offers: id `5` has no offers (catalog `lowestPrice` fallback); id `7` has offers with null prices (same fallback path).

```ts
import { getMockProductDetailById } from '@/src/features/products/mockProductDetails';

const detail = getMockProductDetailById('1');
// detail.product — from mockProducts
// detail.offers — ProductOffer[]
// detail.ratingSummary — ProductRatingSummary
// detail.myRating — always null on the mock helper after Task 15
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
    outfitAvg: 7.6,
    materialAvg: 8.0,
    craftsmanshipAvg: 7.9,
    maintenanceAvg: 7.5,
    comfortAvg: 7.5,
    collectionAvg: 7.2,
    valueAvg: 7.4,
    resalePotentialAvg: 7.1,
    acquisitionEaseAvg: 7.3,
    communityScore: 78,
  },
  myRating: {
    look: 8,
    outfit: 7,
    material: 8,
    craftsmanship: 8,
    maintenance: 7,
    comfort: 7,
    collection: 7,
    value: 7,
    resalePotential: 7,
    acquisitionEase: 8,
    score100: 74,
    privateNote: 'Great kids colorway; Gore-Tex is a plus.',
    methodologyVersion: 'sneaker-10-v1',
  },
};
```
