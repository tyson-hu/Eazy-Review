# Task 15 — Real Anonymous Public Catalog Reads

## Run report

- **Date:** 2026-08-05
- **Branch:** `agent/task-15-real-public-catalog-reads`
- **Starting SHA:** `9d298cfe86779f4f2000dbadf1445b28e7a72580`
- **Final SHA:** the immutable draft-PR head, recorded after commit in the PR
  description and final handoff (a commit cannot contain its own hash).
- **Mode:** local anonymous Data API acceptance, focused automated coverage,
  static web export, and iOS Simulator connected-flow acceptance.
- **Overall result:** implementation passes the automated, local database, and
  online iOS Simulator acceptance performed here. Human acceptance remains
  required. Simulator-level offline/reconnect toggling was blocked by the
  absence of a supported network-condition control on this host; those state
  transitions are covered by focused query and screen tests and are not
  claimed as device-tested.

## Scope and changed files

Task 15 replaces only runtime Browse and Product Detail mock reads. It adds the
focused raw-response → adapter → public view-model → identity-neutral query →
screen boundary, catalog status/error UI, verified-date formatting, and focused
tests. It also fixes the accepted Task 14 test helper's asynchronous unmount so
connected hook/screen tests clean up deterministically.

Changed implementation and tests:

- `app/(tabs)/browse.tsx`
- `app/product/[id]/index.tsx`
- `src/components/ui/ProductCard.tsx`
- `src/components/ui/ScoreBadge.tsx`
- `src/features/products/CatalogStatusBanner.tsx`
- `src/features/products/api.ts` and `api.test.ts`
- `src/features/products/adapters.ts` and `adapters.test.ts`
- `src/features/products/errors.ts` and `errors.test.ts`
- `src/features/products/queries.ts` and `queries.test.tsx`
- `src/features/products/BrowseScreen.test.tsx`
- `src/features/products/ProductDetailScreen.test.tsx`
- `src/features/products/catalogTestFixtures.ts`
- `src/features/products/catalogViewModelTestFixtures.ts`
- `src/lib/supabase/client.ts`
- `src/test/renderWithProviders.tsx`
- `src/types/product.ts`
- `src/utils/formatVerifiedDate.ts`

Changed authoritative/evidence documents:

- `.gitignore`
- `README.md`
- `docs/API_CONTRACTS.md`
- `docs/DESIGN.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `docs/USER_FLOWS.md`
- this report and its selected proof images

No schema, migration, RLS policy, grant, seed, environment, dependency, or
accepted Query Client/default file changed.

## Public query contracts and request counts

| Surface | Contract | Supabase requests per load |
| --- | --- | ---: |
| Browse | Published products plus deterministic primary image, current Eazy assessment, rating aggregate, and displayable verified offers | 1 total, not one per card |
| Product Detail | One published product plus ordered images, current Eazy assessment, rating aggregate, and ordered displayable verified offers | 1 total |

Both are nested public selects against `products`, use the accepted typed
singleton client, and disable transport-internal GET retries so the explicit
TanStack policy owns retry count. The selects contain no profile,
`user_ratings`, private note, user id, `myRating`, or service-role field.
Browse searches the returned two-product catalog locally by brand/name/SKU and
does not issue a search request.

The local public-key acceptance returned, without privileged credentials:

- Browse SKUs in deterministic order: `CW2288-111`, `B75806`.
- Complete fixture: 1 image, 1 current assessment, 2 offers, rating count 0,
  Community Score null.
- Sparse fixture: 0 images, 0 current assessments, 0 offers, rating count 0,
  Community Score null.
- One request for Browse and one request for each selected Product Detail.

## View models and normalization

- `ProductCardData` exposes public identity/metadata, nullable primary image,
  nullable Eazy/Community scores, rating count, and one nullable verified offer
  carrying retailer, amount, currency, market, optional size label, and exact
  verification timestamp.
- `ProductDetailPublicData` exposes public product metadata, ordered image URLs,
  one nullable editorial assessment, server-owned rating summary, and ordered
  verified offers. It contains no viewer-owned field.
- Images sort by `sort_order`, `created_at`, then id. Offers sort by amount,
  retailer, size/market, verification time, then id. Mixed-currency responses
  fail as `invalid-response` rather than comparing unlike amounts.
- Missing image, assessment, score, or offer remains null/empty. Zero ratings
  render as **No ratings yet**; missing values never become `$0`, `0/10`, a
  fabricated image, retailer, or assessment.

## Errors, retry, and cache behavior

Technical failures normalize to `offline`, `timeout`, `not-found`,
`unauthorized`, `invalid-response`, or `server-error` before reaching screens.
Invalid public environment configuration is a non-retryable
`invalid-response` with configuration source. Timeout and transient
server/transport failures receive at most one automatic retry. Offline,
unauthorized/RLS denial, not-found, invalid-response, and invalid configuration
receive none.

The accepted Task 14 in-memory cache remains visible during background refresh
or offline periods. Uncached offline queries pause without issuing a request
and execute once on reconnect. Focus tests prove one controlled stale refetch
for a background → foreground transition, with no refetch loop on a duplicate
focused signal. Persistent offline cache remains intentionally deferred.

## Automated and local validation

| Check | Result |
| --- | --- |
| Focused Task 15 Jest | **pass** — 6 suites, 46 tests |
| Full frontend Jest | **pass** — 14 suites, 118 tests |
| TypeScript and lint | **pass** |
| Generated database type parity | **pass** against local schema |
| Static web export | **pass** — 11 routes exported |
| Skill wrappers / decisions / secrets / agent infrastructure | **pass** via `npm run check:readonly`; secret scan clean |
| Local reset and database suite | **pass** — deterministic seed reapply check, reset, 8 pgTAP files / 456 assertions, and both concurrency tests |
| Full Expo gate | **pass outside the agent sandbox** — Expo Doctor 20/20 and dependencies aligned |

The local reset used the accepted Task 13 seed unchanged. Anonymous reads under
the existing RLS/grants returned both published fixtures; existing database
tests also keep unpublished products, profiles, raw ratings, and private notes
outside anonymous access. Task 15 applies no migration.

## Device acceptance

Environment matrix:

| Environment | Status |
| --- | --- |
| iOS Simulator — iPhone 17 Pro, iOS 27.0, Expo Go | `blocked` (online/lifecycle pass; network transition unavailable) |
| Mobile web interactive preview | `not-run` (static export passed) |
| Physical device | `not-tested` |

| Required step | Result |
| --- | --- |
| Cold launch online | **pass** |
| Load Browse | **pass** — both real seeded products shown |
| Open Air Force 1 Detail | **pass** — image, editorial assessment, null community state, USD offer, retailer/size, and exact checked date |
| Open Samba Detail | **pass** — no image, no assessment, no ratings, and no verified offer are shown honestly |
| Background app | **pass** |
| Foreground app | **pass** — cached Samba state retained; no duplicate lifecycle output observed |
| Go offline | **blocked on device** — no supported simulator network-condition control was exposed |
| Navigate cached data offline | **blocked on device**; focused hook/screen tests pass |
| Attempt uncached request offline | **blocked on device**; test proves zero request while paused |
| Reconnect | **blocked on device**; test proves exactly one request on reconnect |
| Controlled reconnect refetch | **blocked on device**; automated transition coverage passes |
| No duplicate listener behavior | **pass** in Task 14 lifecycle tests and observed background/foreground run |
| No request storm | **pass** in query call-count tests and online simulator observation |
| No indefinite loading | **pass** in timeout/API tests and simulator observation |
| Sparse honesty after reconnect | **blocked on device**; sparse normalization/screen tests pass and online state remained honest |

## Findings and severity

- **Product findings:** no open P0–P3 product finding from the implementation,
  simulator walk, or independent review.
- **Acceptance-evidence limitation:** device offline/reconnect steps are
  **blocked** because this simulator host exposed no supported network-condition
  control. This is not classified as a product defect; it blocks only the
  device-level proof for those steps and remains part of the human acceptance
  gate. Focused automated transition coverage passes.

## Evidence inventory

Selected for GitHub (all 1206×2622, non-sensitive simulator captures):

- `screenshots/01-air-force-detail.png` — complete product image and scores.
- `screenshots/02-air-force-detail-offers.png` — verified offer context/date.
- `screenshots/03-samba-detail.png` — sparse image/assessment/community states.
- `screenshots/04-samba-missing-offers.png` — intentional missing-offer state.
- `screenshots/06-browse-clean.png` — both published products on connected
  Browse, including complete-offer and sparse empty states.

Local-only capture IDs:

- `00-browse.png` — earlier Browse capture with simulator app-switch chrome;
  redundant with the selected clean Browse proof.
- `05-browse-after-lifecycle.png` — post-background/foreground Browse capture;
  redundant with the selected clean Browse proof.

The full non-sensitive raw capture set remains local and is protected by the
task-specific `.gitignore` allowlist. The selected proof set contains no
credential or private/user-owned data.

## Security confirmation and known limitations

- Public publishable-key/anonymous reads only; no auth session or viewer
  identity enters the query keys or payloads.
- No profile, raw-rating, private-note, or user-owned table is requested.
- No service-role key, database password, direct connection string, or other
  privileged credential entered Expo or the proof set.
- No schema, migration, RLS, grant, aggregate, seed, staging, or production
  change/access occurred.
- The cache is memory-only, so a cold offline launch correctly has no catalog
  data to display.
- Physical-device and on-device offline/reconnect acceptance remain for the
  human gate. The static export passed, but this run did not perform a separate
  interactive mobile-web journey.

## Required next decision

Review the draft PR and complete human/device acceptance, especially the real
offline → cached navigation → uncached request → reconnect path. Do not merge
or begin Task 16 until Task 15 is explicitly accepted.
