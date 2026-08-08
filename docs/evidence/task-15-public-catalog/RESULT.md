# Task 15 — Real Anonymous Public Catalog Reads

## Run report

- **Date:** 2026-08-05 (implementation + simulator); **physical-device update
  2026-08-07**
- **Branch:** `agent/task-15-real-public-catalog-reads`
- **Starting SHA:** `9d298cfe86779f4f2000dbadf1445b28e7a72580`
- **Final SHA:** the immutable PR head, recorded in the PR description after
  each push (a commit cannot contain its own hash).
- **Mode:** local anonymous Data API acceptance, focused automated coverage,
  static web export, iOS Simulator connected-flow acceptance, and physical
  iPhone LAN + phone-only Network Link Conditioner offline acceptance.
- **Overall result:** implementation passes automated, local database, online
  iOS Simulator, and physical-device (online catalog + offline/reconnect)
  acceptance. Human acceptance of the five Part 1 decisions is complete;
  PR merge remains a separate action. Task 16 must wait for both.

## Scope and changed files

Task 15 replaces only runtime Browse and Product Detail mock reads. It adds the
focused raw-response → adapter → public view-model → identity-neutral query →
screen boundary, catalog status/error UI, verified-date formatting, and focused
tests. It also fixes the accepted Task 14 test helper's asynchronous unmount so
connected hook/screen tests clean up deterministically.

Physical-device developer workflow support (same branch, non-product-scope):

- Tracked Expo `ios.bundleIdentifier` and config plugin for local
  development-build / Release device installs under Xcode 27
- `expo-dev-client` dependency and `start:dev-client` / `ios:device` /
  `ios:device:release` scripts
- README physical-iPhone LAN / Network Link Conditioner / Release cold-start
  procedure

Machine-local `.env.local` (Mac LAN Supabase URL) stays untracked.

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

Changed authoritative/evidence documents and device tooling:

- `.gitignore`
- `README.md`
- `app.json`
- `package.json` / `package-lock.json`
- `plugins/withIosDeviceBuildFixes.js`
- `docs/API_CONTRACTS.md`
- `docs/DESIGN.md`
- `docs/MOBILE_SIMULATOR_SOP.md`
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `docs/USER_FLOWS.md`
- this report and its selected proof images

No schema, migration, RLS policy, grant, seed, or accepted Query Client/default
file changed. Staging and production remain untouched.

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
| Focused Task 15 Jest | **pass** — 6 suites, 46 tests (catalog slices) |
| iOS CNG plugin generation Jest | **pass** — 1 suite, 2 tests (`plugins/withIosDeviceBuildFixes.test.js`) |
| Full frontend Jest | **pass** — 15 suites, 120 tests |
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
| iOS Simulator — iPhone 17 Pro, iOS 27.0, Expo Go | `pass` (online/lifecycle); network transition unavailable on host |
| Mobile web interactive preview | `not-run` (static export passed) |
| Physical device — development build + Mac LAN Supabase | `tested-pass` (2026-08-07) |
| Physical device — Release cold start, Metro stopped, NLC | `tested-pass` (2026-08-07) |

### iOS Simulator (2026-08-05)

| Required step | Result |
| --- | --- |
| Cold launch online | **pass** |
| Load Browse | **pass** — both real seeded products shown |
| Open Air Force 1 Detail | **pass** — image, editorial assessment, null community state, USD offer, retailer/size, and exact checked date |
| Open Samba Detail | **pass** — no image, no assessment, no ratings, and no verified offer are shown honestly |
| Background app | **pass** |
| Foreground app | **pass** — cached Samba state retained; no duplicate lifecycle output observed |
| Go offline | **blocked on simulator host** — no supported simulator network-condition control |
| Navigate cached data offline | **blocked on simulator**; focused hook/screen tests pass |
| Attempt uncached request offline | **blocked on simulator**; test proves zero request while paused |
| Reconnect | **blocked on simulator**; test proves exactly one request on reconnect |
| Controlled reconnect refetch | **blocked on simulator**; automated transition coverage passes |
| No duplicate listener behavior | **pass** in Task 14 lifecycle tests and observed background/foreground run |
| No request storm | **pass** in query call-count tests and online simulator observation |
| No indefinite loading | **pass** in timeout/API tests and simulator observation |
| Sparse honesty after reconnect | **blocked on simulator**; sparse normalization/screen tests pass online |

### Physical iPhone (2026-08-07)

Topology: Mac local Supabase (`*:54321`) + untracked `.env.local` Mac-LAN URL +
publishable/anon key only; same Wi-Fi; phone Network Link Conditioner only;
Mac network left untouched. No tunnel, staging, or production.

| Required step | Result |
| --- | --- |
| Mac LAN Supabase reachability | **pass** — PostgREST responded over LAN; iPhone Safari reached Mac API |
| Development build launches | **pass** |
| Browse loads Task 13 catalog over LAN | **pass** — CW2288-111 complete + B75806 sparse |
| Product Detail over LAN (both fixtures) | **pass** — honest sparse empties on Samba |
| Anonymous public reads (no auth) | **pass** |
| Dev-build cached offline (process alive, 100% Loss) | **pass** — offline banner; catalog still visible |
| Release cold start (Metro stopped, 100% Loss) | **pass** — shell launches; offline/error + Try again without catalog |
| Automatic refetch when network returns | **pass** — observed on device after conditioner off |

Known non-blocker: Expo web static SSR under Metro can log
`(0 , jsx_runtime_1.jsx) is not a function` on the Mac terminal; that path is
web-only and did not block native Release install or offline acceptance.

## Findings and severity

- **Product findings:** no open P0–P3 product finding from the implementation,
  simulator walk, physical-device walk, or independent review of the
  implementation SHA.
- **Acceptance-evidence:** simulator network conditioning remains unavailable
  on the agent host; physical iPhone Network Link Conditioner closes that gap
  for Task 15 offline proof.

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

Physical-device screenshots from acceptance (2026-08-07) remain local evidence
unless later uploaded under the evidence SOP; they are not required duplicates
of the representative simulator set already tracked.

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
  data to display (confirmed on Release with Metro stopped).
- Physical LAN development uses untracked `.env.local` with the Mac LAN IP;
  `.env.local` and generated `/ios` remain gitignored and uncommitted.
- Static web export still passes; interactive mobile-web product walk remains
  `not-run` and is out of Task 15 merge blockers.

## Xcode 27 compatibility reproduction

**Date:** 2026-08-07
**Device:** physical iPhone (iOS 27.0 beta), local Debug development build only
**Environment:** Xcode beta / CNG; local machine only; no EAS, staging, or production

### Procedure (uncommitted temporary state only)

1. **Plugin-enabled baseline:** generated `ios/` already applied
   `plugins/withIosDeviceBuildFixes.js` — `ENABLE_USER_SCRIPT_SANDBOXING = NO`,
   `EXPO_USE_PRECOMPILED_MODULES = false`, `UIApplicationSceneManifest` +
   `SceneDelegate.swift` + scene-owned AppDelegate. Typecheck/lint clean.
2. **Temporary disable:** removed only `./plugins/withIosDeviceBuildFixes.js`
   from `app.json` (plugin source file kept; change **not** committed).
3. **Clean regenerate:** `rm -rf ios` then `npx expo prebuild --platform ios`.
4. **Restored:** put the plugin back in `app.json`, clean-regenerated `ios/`,
   rebuilt and reinstalled on the same device path.

### No-plugin generated-native differences (observed)

| Surface | Without plugin | With plugin (restored) |
| --- | --- | --- |
| `ENABLE_USER_SCRIPT_SANDBOXING` | absent from `project.pbxproj` | `= NO` on configurations |
| `EXPO_USE_PRECOMPILED_MODULES` | not set in `Podfile.properties.json` (Podfile defaults toward precompiled) | `"false"` |
| `UIApplicationSceneManifest` | absent | present; multi-scenes false; `SceneDelegate` class |
| `SceneDelegate.swift` | absent | present + `… in Sources` membership |
| `AppDelegate` | calls `factory.startReactNative` in `didFinishLaunching` | factory only; window/start in SceneDelegate |

### Device results

| Configuration | Result |
| --- | --- |
| Plugin disabled → clean prebuild → Debug device build | **pass** (compile) |
| Plugin disabled → install + launch | **fail** — process dies at launch with `EXC_BREAKPOINT` / `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` (device crash reports `EazyReview-2026-08-07-233149.ips` / `…233150.ips`, non-sensitive frames only) |
| Plugin restored → clean prebuild → Debug device build | **pass** |
| Plugin restored → install + repeated launch | **pass** — no new EazyReview crash reports after restore; built `Info.plist` contains scene manifest with `EazyReview.SceneDelegate` |

### Causality judgment

- **Conclusive (proven by reproduction):** UIScene lifecycle sub-fix —
  stock template without the plugin launches into
  `NoSceneLifecycleAdoption`; restoring the plugin regenerates scene manifest /
  SceneDelegate / scene-owned AppDelegate and the same physical-device path
  launches without that crash.
- **Not independently re-failed in this A/B run:** User Script Sandbox deny on
  `ip.txt`, and `ExpoModulesCore` / precompiled-framework
  `ApplicationVerificationFailed` install failures. Debug build without the
  plugin still compiled and signed under this environment. Those two sub-fixes
  are **retained** because the generated-project comparison shows they still
  change native output on this Expo SDK / Xcode matrix and historically matched
  device failures; they are **not** claimed as freshly re-proven in isolation
  here.
- Temporary no-plugin `app.json` state was **never** committed. Final tree keeps
  the plugin enabled. Generated `/ios` remains gitignored.

Related ADR:
`docs/decisions/2026-08-07-temporary-ios-device-build-cng-plugin.md`.

## Required next decision

Human acceptance of the five Part 1 decisions is complete. Merge PR #32 remains
a separate human action. Do not begin Task 16 until Task 15 is both accepted and
merged. Persistent offline Query storage remains deferred.
