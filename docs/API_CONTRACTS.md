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

/** Published curated collection; cards resolve from the published catalog. */
export type FeedCollection = {
  id: string;
  slug: string;
  title: string;
  caption: string;
  leadLabel: string;
  signal: 'eazy' | 'community';
  isRanked: boolean;
  feedPosition: number;
  productIds: string[];
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
  methodologyVersion?: string | null;
};

/** Public/cacheable Product Detail data; never contains viewer-owned state. */
export type ProductDetailPublicData = {
  product: Product;
  imageUrls: string[];
  eazyAssessment: {
    score100: number;
    methodologyVersion: string | null;
    assessedAt: string | null;
    dimensions: RatingDimensionScores | null;
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

Tasks 11–12 establish database and authorization contracts only. They did not
add auth screens or connect rating writes. Task 11 schema (tables, triggers,
deny-by-default RLS with no client policies/grants) precedes the accepted Task
12 policies and explicit least-privilege Data API grants. They expose profile
rows only to their authenticated owner. Dated migration and environment
acceptance results are preserved in
[`docs/evidence/task-11-12-database-acceptance/RESULT.md`](evidence/task-11-12-database-acceptance/RESULT.md).

| Database contract | Frontend / API meaning |
| --- | --- |
| `products.is_published` | Anonymous Browse/Detail adapters must eventually select published products only; Tasks 11–12 add no runtime adapter |
| Current `eazy_assessments` row | Source for `ProductCardData.eazyScore` and `ProductDetailPublicData.eazyAssessment`; select `is_current = true` |
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
| Eazy Score | `detail.eazyAssessment.score100` |
| Community Score | `detail.ratingSummary.communityScore` |
| Review / rating count | `detail.ratingSummary.ratingCount` |
| Purchase / price-by-size rows | `detail.offers` |
| Lowest price | `detail.offers[0]` after the adapter rejects mixed currencies and sorts verified offers by amount and deterministic tie-breakers. No verified offers → unavailable. |
| Detail image | `detail.imageUrls[0]`, ordered from `product_images` by `sort_order ASC`, then `created_at ASC`, then `id ASC`. No images → unavailable. |

`Product` carries identity and metadata only. Browse summaries stay in
`ProductCardData`; Detail image, assessment, offer, and rating facts stay in
their dedicated `ProductDetailPublicData` siblings.

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
      catalogTestFixtures.ts    # scoped raw-row test fixtures
      catalogViewModelTestFixtures.ts # scoped view-model test fixtures

    auth/
      api.ts                    # Tasks 16–19 auth, recovery, guarded adoption
      deletion.api.ts           # Task 19 isolated bearer + Function boundary
      errors.ts                 # Normalized auth errors (no raw SDK text)
      types.ts
      returnPath.ts             # Safe internal returnTo allowlist
      AuthProvider.tsx          # Tasks 16–19 session/recovery/deletion authority
      hooks.ts

    account/
      api.ts                    # Owner profile read + member-since format
      queries.ts                # User-scoped profile query

    ratings/
      # Task 17 connected ratings, persistence, and Rated Products modules

    feed/
      sections.ts               # FeedSection contract, caps, curated id
      autoSections.ts           # code-owned Newly Added / Best Eazy / Most Rated
      curatedSections.ts        # resolve published collection ids to cards
      selectFeedSections.ts     # merge, position sort, duplicate-hide
      api.ts                    # published collections read
      adapters.ts               # raw collection rows → FeedCollection
      queries.ts                # catalogKeys.feedCollections() hook

  lib/
    env/
      publicEnv.ts             # Task 14 public EXPO_PUBLIC_* validation
    supabase/
      client.ts                # Task 14 singleton
      createClient.ts
      authCoordination.ts      # Tasks 18–19 non-stealing Auth/storage ordering
      authStorage.ts           # Tasks 14–19 guarded AsyncStorage adapter (HUMAN ACCEPTED MVP; SecureStore waived for Task 16)
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
  `confirmation-required` when the provider creates a user without a session.
  Confirmation emails use
  `emailRedirectTo = Linking.createURL('auth/sign-in')`, which yields the exact
  native URL `eazyreview://auth/sign-in`, so a physical device opens the app
  instead of an unreachable localhost Site URL. The redirect must be
  allowlisted in Auth redirect URLs (local `supabase/config.toml`;
  staging/production are human-applied).
- `signOut()` — captures one exact shared session, attempts current-device
  revocation with that bearer on an isolated non-persisting Auth client, then
  exact-removes shared storage only if principal/access/refresh still match.
  It never calls shared-client `auth.signOut`; a replacement returns token-free
  `superseded` and storage unavailability does not claim signed-out.
- `restoreSession()` — best-effort session restoration on launch. Reads the
  local persisted session with `getSession()`, then when the device is online
  validates the captured bearer through an isolated non-persisting Auth client.
  Definitive invalid identity/session errors exact-remove the captured shared
  principal/access/refresh snapshot; no shared-client sign-out is used.
  Recovery callback exchange waits for bootstrap restoration and any cleanup
  to settle, so it cannot replace that session between the recheck and local
  sign-out. A replacement session already present at the recheck is preserved;
  offline and transient transport/5xx validation failures preserve the local
  principal. Storage/cleanup unavailability remains non-authoritative rather
  than publishing signed-out. Profile rows are not the identity validity check.

Task 16 routes:
- `app/auth/sign-in.tsx`
- `app/auth/sign-up.tsx`

Safe internal `returnTo` allows primarily `/product/<uuid>` and Account;
external URLs and schemes are rejected. Post-auth navigation uses
`router.dismissTo(returnTo)` so existing destinations are revealed rather than
duplicated via forward `replace`.

Task 16 does **not** implement social login / MFA / passkeys (deferred unless
the roadmap promotes them). Task 19 extends, but does not reopen, Task 16's
accepted Auth surface.

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
  tokens. Provider errors encoded directly in the callback URL use the same
  normalization as SDK exchange errors: transport/server failures are
  temporary, while definitive expired, replayed, or unusable-verifier failures
  make the link unavailable. When Task 19 guard state is present, it first
  captures an operation-local exact settled or lease-expired-pending
  predecessor. After the unabortable SDK exchange releases, it adopts the
  returned same-principal session only through the exact serialized transaction
  described below; a changed/unknown predecessor returns token-free
  `superseded` without removing or replacing current authority.

AuthProvider recovery phase (not ordinary session status):

- `idle` — no recovery callback
- `processing` — deep-link exchange in flight
- `verified` — `PASSWORD_RECOVERY` (or verified recovery callback); form OK
- `temporary-failure` — transport/server verification failed; reopening the
  same link may retry without treating it as expired
- `unavailable` — expired, reused, malformed, or unusable-on-this-installation
  link, including missing or mismatched PKCE verifier state

Recovery-link processing is also bound to the authoritative auth generation and
principal. If sign-out or a different-account auth transition supersedes an
in-flight callback, neither its late SDK `PASSWORD_RECOVERY` event nor its result
can promote the phase to `verified`. Same-principal SDK transitions emitted by
an unguarded recovery exchange remain valid. During guarded recovery, S2
`SIGNED_IN`/`TOKEN_REFRESHED`/`PASSWORD_RECOVERY` events are maintenance-only:
they cannot publish S2 or verify recovery until exact predecessor-bound adoption
succeeds and releases the quarantine. Background `INITIAL_SESSION` or
`TOKEN_REFRESHED` events for the principal present before the callback started
are maintenance, not superseding user transitions. A matching `USER_UPDATED`
event is also maintenance, so a password update from the preceding recovery
cannot consume a newly opened recovery link when it settles late. Initial-link
processing captures the recovery attempt's start generation before reading the
persisted local session. A delayed bootstrap `INITIAL_SESSION` remains
maintenance only when it matches that snapshot; any other auth transition
during the read stays superseding. The automatic local
`SIGNED_OUT` emitted when bootstrap clears a definitively invalid persisted
session is also non-superseding while a recovery attempt waits for bootstrap;
the recovery Auth exchange starts only after restoration and any conditional
cleanup settle, closing the recheck-to-sign-out replacement window. The wait
uses the shared request deadline: timeout does not exchange the single-use
link, settles `temporary-failure`, and allows the link to be reopened after
restoration completes. Explicit sign-out still wins. Because Supabase installs a
recovery session before emitting its SDK event, rejecting a stale event also
gates authenticated UI and restores the superseding full session outside the
auth callback, including when the exchange reports the stale session through
ordinary `SIGNED_IN`. If that session cannot be restored, the provider signs
out the captured current-device bearer through an isolated non-persisting Auth
client and exact-removes shared storage only while the captured principal/
access/refresh snapshot is unchanged; it never calls shared-client
`auth.signOut`. A replacement is preserved, and cleanup uncertainty does not
authorize principal-only removal or a healthy signed-out authority claim. All
recovery callback exchanges are serialized through any stale-session
reconciliation they start, so an exchange cannot race a prior session restore.
Duplicate delivery of the active or already-pending callback is ignored. A
newer distinct link replaces the pending callback, keeps recovery processing,
and runs automatically after both active stages settle; the older attempt
cannot expose or retain a password form after that newer delivery.
Explicit sign-in, sign-up, and sign-out wait for recovery reconciliation that
started first. Reconciliation snapshots and waits only for explicit auth
operations already in flight; later operations wait behind reconciliation
without extending that snapshot. It stops if an earlier operation establishes
a newer auth state, ensuring the newer explicit transition wins without a
cross-wait deadlock. Reconciliation assigns explicit-operation provenance only
after that operation succeeds, then selects the latest superseding transition.
This includes an explicit same-principal sign-in after an earlier sign-out; a
pending or failed operation cannot claim a same-principal SDK event emitted by
recovery itself.

Routes:

- `app/auth/forgot-password.tsx` — request only
- `app/auth/reset-password.tsx` — completion + deep-link target

`app/auth/reset-password.tsx` may call `updatePasswordFromRecovery` only when
`recoveryPhase === 'verified'`. Direct navigation, an ordinary signed-in
session, an expired link, or a replayed/invalid link must not expose a working
password-update action; show a safe error and route to a new recovery request.
After a successful ordinary PKCE or token callback returns `kind: 'session'`,
the provider settles recovery to `unavailable` unless an SDK
`PASSWORD_RECOVERY` event already verified the attempt; it must not remain in
`processing` indefinitely.
If the verified recovery session becomes definitively missing or expired while
updating, clear the verified phase and replace the form with that safe restart
state. Temporary and password-validation failures keep the form for manual
retry. A new callback entering `processing` on an already-mounted Reset
Password route clears the preceding attempt's password fields, error, and
success state before the new attempt can expose its verified form. It also
invalidates any in-flight update from that attempt; a stale completion cannot
set success or error, change pending state, or clear the new recovery phase.
Unmounting Reset Password invalidates its active update token for the same
reason, so a departed screen cannot clear a later recovery attempt.

Successful recovery keeps the authenticated session and dismisses to Account;
it does not reuse Rate `returnTo` routing. Physical proof that the new password
works and the old password fails remains on the human iPhone checklist.

### Password-recovery completion (Task 18)

Tests cover a valid recovery session, direct navigation, an ordinary session,
expired/invalid recovery state, and warm same-route recovery callbacks after a
completed, failed, or still-pending attempt. Human physical deep-link matrix is
separate evidence.

### Protected account deletion (Task 19)

Files: `src/features/auth/deletion.api.ts`,
`supabase/functions/delete-current-user/`, and the principal-bound helpers in
`src/lib/supabase/authStorage.ts` / `authCoordination.ts`.

Public provider interface:

```ts
export type DeleteAccountOutcome =
  | { kind: 'deleted' }
  | { kind: 'not-deleted-signed-out' }
  | { kind: 'unconfirmed-signed-out' }
  | { kind: 'superseded' };

deleteAccount(password: string): Promise<DeleteAccountOutcome>;
```

The UI supplies only current-password bytes. The provider fixes the email to
initiating principal A, uses an isolated non-persisting Auth client, requires
the returned principal to equal A, and keeps the returned bearer private. No
component/public context receives a token, session, session ID, target user ID,
or server credential. Credential rejection, including email-not-confirmed,
uses fixed `invalid-credentials` / Current password copy.

The exact fresh bearer is pinned once to a zero-semantic-body invocation:

```txt
POST /functions/v1/delete-current-user
Authorization: Bearer <fresh operation-local bearer>
body: zero bytes
```

Any non-whitespace body is `400 invalid-request`. Runtime validation orders
method, body, and Bearer before configuration/secret access. The endpoint has
`verify_jwt = true`, accepts unauthenticated `OPTIONS`, then calls
`auth.getUser(jwt)` and `auth.getClaims(jwt)` with that exact bearer. It
requires matching `sub`, role `authenticated`, non-empty live `session_id`,
and the newest detailed password `amr` timestamp no older than 300 seconds and
no more than 60 seconds in the future. JWT `iat` is not reauthentication proof.

After validation, the server calls exactly in order:

1. `auth.admin.signOut(jwt, 'global')`;
2. only after confirmed revocation,
   `auth.admin.deleteUser(verifiedUser.id, false)` once; and
3. at most one non-destructive `getUserById(verifiedUser.id)` after uncertain
   deletion.

Only stable `user_not_found` proves absence. The server never writes managed
`auth.sessions`, retries revocation/deletion, accepts a target ID, or relabels
a post-dispatch exception as pre-operation configuration failure. The
server-only credential remains inside the Edge runtime.

| HTTP | Outcome/code |
| --- | --- |
| `200` | `deleted` (or CORS preflight) |
| `400` | `invalid-request` |
| `401` | `unauthorized` |
| `403` | `reauthentication-required` |
| `405` | `method-not-allowed` |
| `409` | `revoked-not-deleted` |
| `500` | `configuration-failure` |
| `502` | `revocation-failed` |
| `503` | `validation-unavailable`, `revocation-unconfirmed`, or `revoked-delete-unconfirmed` |

Exact pre-revocation failures preserve A for manual retry. A gateway bodyless
or malformed `401` is also pre-revocation. Confirmed retained-after-revocation
maps to `not-deleted-signed-out`; response loss, malformed/unknown responses,
unconfirmed revocation, and unresolved post-delete state map to
`unconfirmed-signed-out`. No destructive result is automatically retried.

Local safety uses one non-stealing shared Auth-operation lock and one distinct
storage lock with fixed `Auth operation -> storage` ordering. A minimized,
versioned local guard store holds only store version/counter and principal-keyed
subject ID, monotonic revision, `preparing`/`pending`/`settled` state, lease,
optional explicitly adopted `session_id`, and predecessor state. It holds no
access/refresh token, email, password, profile, rating, note, or server outcome.
Exact write/readback is required before reauthentication and dispatch.
Auth storage identity resolves in fixed order: an explicit `storageKey`, then
the explicitly injected client contract, then the singleton key derived from
the public Supabase URL. Ambient public configuration cannot redirect an
injected provider/API instance to a different Auth storage namespace.

After storage capability preflight releases, deletion arms `preparing` inside
one short `Auth operation -> storage` section. This drains and persists earlier
Auth work before the guard reads raw authority. The locks release before
isolated reauthentication, then the provider reacquires the Auth-operation lock
for its final winner/revision check and destructive boundary. A confirmed
pre-revocation rollback changes only the owned guard revision; it never rewinds
raw storage, so a rotated A2 persisted before arm remains authoritative.

The guarded adapter hides blocked A reads, rejects late A writes/removals and A
events, and allows only explicitly adopted fresh session lineage. Exact cleanup
removes primary A only while principal/access/refresh/revision still match;
storage B/C and newer same-principal sessions are preserved. Payload-free
native/web notifications contain only `{ version: 1, kind: 'changed' }`.
Provider reconciliation runs on Auth event, notification, mount, and foreground
through one deferred tail, isolated-validates allowed authority, then rechecks
the exact stored principal/access/refresh/session ID/guard revision under
`Auth operation -> storage` before publication. Stale/unconfirmed finalization
clears the owner exemption before mandatory reconciliation.

Explicit sign-in adopts a fresh `session_id` only under the shared Auth/storage
boundary and preserves a B/C that won before adoption. Verified recovery first
captures one operation-local exact predecessor: either guard-allowed settled S1
plus its guard revision, or an exact lease-expired-pending guard plus its raw
session/empty state. The returned same-principal S2 remains maintenance-only
and cannot update provider authority before the serialized adoption succeeds.
Under provider FIFO and `Auth operation -> storage`, adoption writes S2 only
when guard/raw authority still matches the captured predecessor or is already
exact S2, accepts a same-session-ID S2, advances the guard revision, and reads
back both guard and storage. Newer A2, C, empty, malformed, blocked, changed, or
unavailable authority is preserved without a session removal or replacement;
the predecessor is never persisted or exposed through context, logs, or
evidence.

Provider-owned session writers use a FIFO fence. The unabortable
`processAuthCallbackUrl` exchange is the bounded Task 18 exception: wrapping
the entire exchange reproduced an accepted recovery/explicit-auth deadlock, so
the exchange remains outside that provider FIFO while its post-SDK adoption is
Auth-locked, exact-storage-checked, and supersession-aware. This deviation
does not weaken the no-shared-sign-out rule. Superseded recovery validates B in
isolation, then one provider-FIFO, `Auth operation -> storage` transaction may
replace only the exact guard-allowed displaced A snapshot. Raw C, newer A2,
empty, malformed, blocked, or uncertain authority is preserved; the transaction
never retries or emits an SDK Auth event and signals only the payload-free
change channel. Deletion-winner restoration performs no session write at all:
it reconciles, validates, and exact-rechecks raw B/C before publication. Only
the displaced recovery principal's cache is removed; newer-principal and public
cache remain eligible authority.

Forced recovery reconciliation distinguishes an exact displaced snapshot from
unknown displacement. Exact cleanup additionally requires unchanged principal,
access/refresh tokens, session ID, and guard revision. Unknown displacement
never authorizes primary/companion storage removal or same-principal cache
removal: current allowed S1 is isolate-validated and exact-rechecked before
publication, while blocked/unavailable authority remains quarantined and every
nonmatching authority is preserved according to its current classification.

Local settlement is not a deletion claim. Removed/empty A returns the original
server outcome even when companion cleanup is unconfirmed. A newer
session/signed-out winner returns `superseded`, removes only A's documented
account/rating cache, and preserves newer/public cache. B→signed-out, B→C,
B-becoming-guarded, and delayed B1-after-B2 are generation/exact-snapshot
fenced.

Hard deletion cascades `profiles` and `user_ratings`, including
`private_note`, with no MVP retention copy. Products and
`rating_aggregates` remain and triggers recompute shared and last-rater
zero-count/null states. Global sign-out destroys refresh capability, but an
already-issued JWT may remain cryptographically valid until `exp`; the MVP
configured lifetime must be no more than one hour. Automated tests are
mock-only and never delete an account; a human owns destructive staging proof.

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
  `catalogKeys.product(productId)`, `catalogKeys.feedCollections()`
- Equivalent historical shapes in prose: `['catalog','products']`,
  `['catalog','product', productId]`, `['catalog','feedCollections']`
  (prefer factories over hand-built arrays)

Task 15 uses the accepted Query Client and defaults; it creates no second
client and does not persist the cache. Catalog errors are normalized to
`offline`, `timeout`, `not-found`, `unauthorized`, `invalid-response`, or
`server-error`, so screens never interpret PostgREST/Supabase errors. Timeout
and server/transport failures receive at most one TanStack Query retry.
Offline, unauthorized, not-found, invalid-response, and invalid-configuration
failures receive no automatic retry. Reconnect/focus behavior remains owned by
the accepted Task 14 lifecycle, while every surface exposes manual retry where
the error is recoverable.

Task 21 Feed reuses `useProductsQuery()` / `catalogKeys.products()` for cards
and adds `useFeedCollectionsQuery()` / `catalogKeys.feedCollections()` for
published curated collections. `getFeedCollections` (`src/features/feed/api.ts`)
reads `product_collections` where `is_published = true` and `feed_position` is
not null. Select string:

```
id, slug, title, caption, lead_label, signal, is_ranked, feed_position,
product_collection_items ( id, product_id, position )
```

Nested items are ordered by `position` then `id`. Collections are ordered by
`feed_position` then `id`.
`selectFeedSections(products, collections)` merges code-owned auto sources
(Newly Added at 100, Best Eazy Scores at 200, Most Rated at 300) with
resolved curated sections. Newly Added reverses the adapter catalog order
(`created_at ASC`, then `id ASC`) and caps at five. Ranked auto sections
require at least two qualifying products (`eazyScore != null` for Best Eazy
Scores; `ratingCount >= 1` for Most Rated), rank by that signal then `id`
descending, and cap at five. Curated sections resolve ids against the
published catalog (missing or unpublished ids drop out), require two
products when `isRanked` else one, and cap at five. Auto and curated
sections sort by `position` (tie: curated first, then id). A later section
whose ordered ids match an earlier visible section is omitted. Task 17
already invalidates `catalogKeys.products()` after a rating write, so Most
Rated can appear without a new card request.

Each `FeedSection` carries `id`, `kind` (`auto` | `curated`), `position`,
and the view fields `caption`, `leadLabel`, `signal`, and `ranked`.
`adaptFeedCollections` and `resolveCuratedSections` substitute
`Picked by Eazy Review` when a stored curated caption claims a measured
basis or does not say the list is hand-picked, and substitute trusted
title and eyebrow copy when those fields claim a reserved measured basis
such as `Trending`. The Feed screen renders
the first section's first product as `ProductSpotlightCard` and every
other product as `ProductRankRow`. Initial
load waits for both queries when collections have no cache so a curated
section cannot pop in above the spotlight. If collections fail or are
offline with nothing cached, Feed renders auto sections only.

## Account Profile Query

Files: `src/features/account/api.ts` and
`src/features/account/queries.ts`.

`useMyProfileQuery()` remains owner-scoped and disabled until the authenticated
user ID is known. It exposes the existing reactive online state so Account can
show known-offline feedback immediately and keep cached profile details
visible. `getMyProfile()` routes its Supabase read through the shared ten-second
request deadline and forwards the combined cancellation signal to PostgREST;
caller cancellation remains distinct from a deadline.

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

On complete sign-out or known-invalid cleanup, remove the full account/rating
roots. On A→B account switch or superseded deletion, remove only A-owned
`account.profile`, `rating.mine`, and `rating.ratedProducts` keys so B/C cache
cannot be deleted. Do not enable user-scoped queries until `userId` is known.
Product Detail renders `ProductDetailPublicData` from the public product query
alongside the separate My Rating query; viewer-owned data must never be stored
under a public catalog key.

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
client-side loading and search are insufficient. Numeric trigger criteria and
the 2026-09-02 evaluations (two-product, then 27-product re-measure; not met
either time) live in
`docs/decisions/2026-09-02-browse-scale-up-trigger.md` and
`docs/evidence/task-20-browse-scale-up-trigger/RESULT.md`.

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
| Editorial Eazy Score | `eazy_assessments` where `is_current = true` | `ProductCardData.eazyScore` / `ProductDetailPublicData.eazyAssessment` |
| Community aggregate | `rating_aggregates` | `ProductRatingSummary` |
| My Rating scores | `user_ratings` score columns | `RatingBreakdown` scores |
| Optional personal text | `user_ratings.private_note` | `privateNote` (not a public comment) |

Rules:

- `private_note` / `privateNote` is owner-only and at most 500 characters
  (database check plus connected form validation).
- Public written reviews are not implemented.
- Task 17 changed the optional-field label from **Comment** to
  **Private note** and the property from `comment` to `privateNote` together.
- Data API grants land only after Task 12 RLS policies.

### Zero-rating / missing aggregate rows

Every product insert creates a matching zero-count `rating_aggregates` row.
Task 13 seeds must not leave published products without it. Task 15 adapters
still normalize a missing join to `ratingCount: 0` with null averages and
Community Score; they never invent client-side score math.

## Scoped Product Fixtures

S2 retired the repository-wide canned catalog, legacy detail composition, and
bundled image protocol. Runtime Browse and Product Detail use only connected
catalog queries. Tests and isolated examples define the smallest fixture for
the owner they exercise:

- `src/features/products/catalogTestFixtures.ts` owns complete and sparse raw
  catalog rows for adapter/API checks.
- `src/features/products/catalogViewModelTestFixtures.ts` owns complete and
  sparse `ProductCardData` / `ProductDetailPublicData` values for screen and
  feature tests.
- Purpose-built test-local variations derive from those scoped fixtures.

No global mock journey, custom image URI, or viewer/product session map is a
supported frontend contract. Historical task, decision-archive, and evidence
records remain point-in-time history rather than current fixture guidance.
