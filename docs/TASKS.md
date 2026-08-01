# Eazy Review Tasks

## Current Repo Status

As of the post–Task 12 review on 2026-07-30:

- Tasks 1–12 are accepted. The Browse → Product Detail → Rating Form mock
  journey passed its UX gate, and the Supabase schema, trigger-owned Community
  Score, RLS policies, explicit Data API grants, and authorization contract are
  complete.
- Task 12 passed 418 local database assertions, both concurrency races,
  repository security checks, and explicitly authorized staging acceptance.
  Production was not touched.
- Expo still reads mock catalog/detail data and stores My Rating in
  session-only memory. No Supabase client, generated database types, or
  TanStack Query runtime is installed yet.
- The app now defaults to Browse, uses the display name **Eazy Review**, forces
  light appearance, and does not advertise iPad support for the MVP.
- Task 13 is the next implementation task. It has not started.

The prior detailed implementation record and superseded Tasks 13–18 plan remain
available at
[`docs/archive/tasks/2026-07-29-pre-review-task-plan.md`](archive/tasks/2026-07-29-pre-review-task-plan.md).
Accepted database behavior remains canonical in `docs/DATA_MODEL.md`; the
archive is historical evidence, not a current plan.

## Definition Of Done

Use the Definition Of Done in `docs/AGENT_WORKFLOW.md`. Each task remains a
separate authorization boundary: implementation, staging, production,
publication, and merge are not implied by one another.

## Completed Foundation

| Tasks | Status | Accepted outcome |
| --- | --- | --- |
| 1–5 | Done | Expo/TypeScript, Expo Router, NativeWind, tabs, and reusable UI primitives |
| 6–9 | Done | Eight-product mock catalog, Product Detail, and session-only Rate/Edit flow |
| 10 | Done — GO | Integrated Browse → Detail → Rate UX audit and device evidence |
| 11 | Done | Deny-by-default seven-table schema, trigger-owned aggregates, local/staging acceptance |
| 12 | Done | Least-privilege RLS/grants, authorization tests, local/staging acceptance |

Task 2 and Task 5 are fully done; their former “Mostly done” and “Partial”
labels were stale. Detailed packet histories, reviewer cycles, evidence paths,
and prior branch notes live in the archived plan and PR/evidence records.

## Post–Task 12 Review Gate

Status: **Approved with roadmap revision.**

This is a planning/architecture gate, not a feature task or migration.

### Locked

- Tasks 1–12 remain accepted unless a reproducible defect is found.
- Keep the seven-table schema, trigger-owned Community Score architecture, one
  rating per user/product, owner-only `private_note`, anonymous
  published-product reads, and least-privilege grants/RLS.
- Keep `Eazy Score`, `Community Score`, and `My Rating` exactly.
- Keep Browse → Product Detail → Rate as the core journey and the six 1–10
  rating fields: look, comfort, quality, outfit, value, and overall.
- Keep social content outside the MVP.
- No service-role credential may enter Expo.
- Applied migrations remain unchanged; any proven schema correction must be a
  separately authorized forward migration.

### Cleanup completed by this gate

- Corrected stale completed-task statuses and archived implementation history.
- Corrected the frontend comment from `rating_summaries` to
  `rating_aggregates`.
- Replaced stale Feed mock-wiring copy and made Browse the initial destination.
- Set the MVP app configuration to **Eazy Review**, light-only, and
  iPhone-only on iOS.
- Made `docs/DESIGN.md` the sole product UI source of truth; the long Apple
  study now lives under `docs/research/` as non-authoritative research.
- Froze the current subagent, skill-wrapper, ADR-index, evidence, and secret
  scanner systems. Do not expand them without a concrete project defect or
  explicit new approval.

### Explicitly deferred

- Dark mode and iPad optimization.
- Social reviews, comments, likes, follows, and activity features.
- Editable username/avatar profiles.
- Advanced filters, recommendation systems, scraping, and automated imports.
- Admin dashboard.
- Persistent offline query cache.
- Sentry or product analytics until beta evidence shows a need.
- Additional RLS, aggregate, or helper-function redesign without a
  reproducible security/correctness defect.

### Environment boundary

- Local work is allowed only within the current task.
- Staging migrations, seeds, destructive checks, or deployment require an
  explicit human-approved action.
- Production database access remains forbidden to coding agents and tools.
- Account-deletion execution remains human-only on every environment.

## Revised Sequence

Work in order unless a task explicitly states that it is conditional.

| Task | Title | Status |
| --- | --- | --- |
| 13 | Product Seed Data | Next |
| 14 | Connected Client And Query Foundation | Pending |
| 15 | Real Public Catalog Reads | Pending |
| 16 | Core Authentication And Account State | Pending |
| 17 | My Rating Persistence And Rated Products | Pending |
| 18 | Password Recovery And Deep Links | Pending |
| 19 | Protected Account Deletion | Pending |
| 20 | Browse Scale-Up | Conditional |
| 21 | Real Feed MVP | Pending |
| 22 | Automated App Tests And Database CI | Pending |
| 23 | Reliability, Accessibility, And Device QA | Pending |
| 24 | Privacy, Legal, And Store Disclosures | Pending |
| 25 | EAS Environments And TestFlight Candidate | Pending |
| 26 | Release Candidate And App Store Submission | Pending |
| 27 | Post-Launch Operations | Pending |
| 28 | Catalog Import And Admin Pipeline | Post-MVP |
| 29 | Public Publishing And Project Journal | Optional separate workstream |

## Task 13: Product Seed Data

Status: **Next — not started.**

Goal: create the smallest trustworthy connected catalog needed to validate real
Browse and Product Detail reads.

Dependencies:

- Tasks 11–12 accepted.
- Canonical schema and authorization behavior remain unchanged.

Deliverables:

- Committed SQL, preferably `supabase/seed.sql`, loaded by local reset.
- Enable `[db.seed]` in `supabase/config.toml` while preserving
  `sql_paths = ["./seed.sql"]`.
- Exactly two published products with deterministic UUIDs:
  - one complete product with valid metadata, exactly one approved HTTPS image
    with deliberate `sort_order`, exactly one current Eazy assessment, and two
    or three verified USD/US offers;
  - one sparse product with valid required metadata and no image, offer, Eazy
    assessment, or user rating rows. Its product insert must still create one
    zero-count `rating_aggregates` row through the accepted trigger.
- The complete Eazy assessment must populate `look`, `comfort`, `quality`,
  `outfit`, `value`, `maintenance`, `material`, `details`, `collection`,
  `overall`, `score`, and `methodology_version`, with `is_current = true`.
- Every complete-product offer must use a deterministic UUID, non-empty
  `website_name`, an HTTPS `website_link`, a non-null price greater than zero,
  uppercase `USD` / `US`, and a non-null `last_checked_at` based on actual
  verification. `size` may be null only when the source is not size-specific.
- Deterministic IDs for every product, image, assessment, and offer.
- One transaction with conflict-aware inserts that are truly idempotent: when
  existing fixture data already matches, a second application must add no rows
  and change no values or timestamps.
- Explicit `is_published`, deliberate image `sort_order`, uppercase `USD` /
  `US`, and `last_checked_at` only for an actually verified offer.
- One focused seed acceptance test.
- Use the Task 13 implementation PR description as the short status/evidence
  record. It must include stable IDs, image source and rights/permission basis,
  image review date, retailer/source links, verified price/currency/region and
  check time, relevant offer exclusions, and first-run versus same-database
  second-run row counts plus before/after comparisons of every seeded value and
  timestamp (or equivalent acceptance-test output). Do not create another
  evidence directory unless the existing workflow requires it. Update README
  only if local reset behavior changes.

Acceptance:

- `npm run test:db:reset` applies every migration, loads the configured seed,
  and passes the database suites.
- Apply the seed twice to the same existing local database. The second
  application creates no duplicates and changes no fixture values or
  timestamps; two independent fresh resets do not prove idempotency.
- Each product has exactly one trigger-created `rating_aggregates` row with
  `rating_count = 0` and all average and score fields null.
- Seed code never inserts into or updates `rating_aggregates` directly.
- Anonymous reads return both published products under the accepted Task 12
  authorization rules.
- The complete product has exactly one deterministic image, one fully populated
  current Eazy assessment, and two or three deterministic verified offers that
  satisfy the required HTTPS, price, currency, region, and verification fields.
- The sparse product has no `product_images`, `product_offers`,
  `eazy_assessments`, or `user_ratings` rows; only its trigger-created empty
  aggregate exists. Task 15 owns app normalization to `imageUrl: null`, no
  price, no Eazy Score, and an empty Community Score.
- No `auth.users`, `profiles`, or `user_ratings` fixtures are created.
- The Task 13 PR description contains the required image/offer provenance and
  same-database idempotency evidence for row counts, fixture values, and
  timestamps before and after the second application.
- `npm run check` and `git diff --check` pass.
- Staging seed application remains a separate explicit human-approved action.
- Production remains untouched.

Non-goals:

- No app code, Supabase client, dependency, schema change, auth user, rating
  fixture, eight-product import, scraper, or production seed.
- Do not add Supabase Storage policies merely to host the first image.
- Never persist `mock-product://` URLs.

## Task 14: Connected Client And Query Foundation

Status: Pending.

Goal: install and configure the durable application data layer before any
screen depends on it.

Dependencies: Task 13 accepted.

Deliverables:

- `@supabase/supabase-js`, one supported React Native session-storage adapter,
  and a URL polyfill only where required.
- `@tanstack/react-query` and React Native NetInfo integration.
- Minimal frontend test foundation: `jest-expo`,
  `@testing-library/react-native`, the `expo-router/testing-library` utilities
  when route behavior needs them, and a stable `npm test` script.
- One smoke test outside `app/` proving the frontend harness runs.
- Reproducibly generated Supabase database types.
- One initialized Supabase client and one Query client.
- Root providers in `app/_layout.tsx`.
- A query-key factory with structurally separate public and user-scoped keys.
- Auth-change utilities that remove the prior user’s scoped queries.
- Development validation for the Supabase URL and publishable client key.
- Coordinated AppState/online handling for auth token refresh, Query focus, and
  NetInfo rather than competing lifecycle listeners.
- One small total read-retry budget; rating mutations are never automatically
  retried.

Acceptance:

- The app starts with valid development variables and fails clearly when they
  are missing.
- URL and publishable/legacy anon key are treated as public client
  configuration; no secret/service-role value reaches the bundle.
- Database types regenerate through one documented command.
- Public and user-scoped query keys cannot collide.
- Query focus follows foreground/background state and online state follows
  NetInfo.
- Auth transitions can remove prior user-scoped data.
- `npm test` runs the harness smoke test successfully.
- Existing mock screens still run at task completion.

Non-goals:

- No connected screen reads, persisted offline Query cache, Redux/Zustand,
  broad repository framework, universal runtime row validation, or optimistic
  mutation.

## Task 15: Real Public Catalog Reads

Status: Pending.

Goal: replace mock reads on Browse and Product Detail with published Supabase
data while keeping browsing anonymous.

Dependencies: Tasks 13–14 accepted.

Deliverables:

- `ProductDetailPublicData` plus focused product repository/query functions.
- `ProductDetailPublicData` contains only public catalog, assessment, offer,
  and Community Score data. `myRating` and every other viewer-owned field are
  fetched through a structurally separate user-scoped query.
- Browse and Product Detail queries/adapters.
- Deterministic primary-image selection:
  `sort_order ASC`, `created_at ASC`, then `id ASC`.
- Single-currency offer handling and canonical empty aggregate normalization.
- Real loading, error, empty, and retry states.
- Client-side brand/name/SKU search for the small connected catalog.
- Honest Rate action during the short transition: sign-in/rating unavailable;
  no mock save claim for a Supabase UUID.
- Focused adapter tests for sparse and ambiguous catalog joins.

Remove in this task:

- The artificial 300 ms loading delay and `__error__` search trigger.
- `mockProducts` from connected Browse and `getMockProductDetailById` from
  connected Detail.
- Disabled Filter/Sort controls and fake end-of-list copy.
- Any product-ID-only or viewer/product transitional rating map.

Acceptance:

- Anonymous users can open connected Browse and Product Detail.
- Only published products appear.
- Primary image selection is stable across repeated reads.
- Mixed currencies are never compared numerically.
- Zero-rating/missing-aggregate input becomes a complete empty summary, never
  `undefined`.
- Sparse product states remain usable.
- No client calculation writes or replaces Community Score.
- Adapter tests cover no image, no offer, no aggregate, multiple images, and
  mismatched currency.

## Task 16: Core Authentication And Account State

Status: Pending.

Goal: add only the identity/session behavior needed to protect the rating flow.

Dependencies: Task 15 accepted.

Deliverables:

- Email/password sign-up, sign-in, sign-out, and session restoration.
- Auth state provider.
- Logged-out and logged-in Account states.
- Owner profile read and joined-date display.
- Auth-gated Rate route with return-to-product behavior.
- User-scoped Query cache clearing on sign-out or account switch.
- Explicit email-confirmation state when sign-up returns no active session.
- Focused auth, session-restoration, Rate-gate, and cache-isolation tests.

Acceptance:

- Anonymous browsing remains available.
- Sign-up creates exactly one profile through the accepted database trigger.
- A signed-in user can read only their own profile.
- Logged-out Rate action opens sign-in.
- Successful sign-in returns to the intended product.
- After sign-in, rating remains honestly unavailable on Product Detail until
  Task 17 connects durable My Rating persistence.
- Sign-out/account switching cannot expose the prior user’s profile or rating
  cache.
- Session restoration works after app restart.

Non-goals:

- No recovery, deletion, social login, passkeys, MFA, profile editing,
  username reservation, avatar upload, or public profiles.

## Task 17: My Rating Persistence And Rated Products

Status: Pending.

Goal: complete the first real value loop:
Browse → Detail → Sign in → Rate/Edit → Detail updates → Rated Products.

Dependencies: Task 16 accepted.

Write contract:

1. Read the owner’s current rating.
2. Update score fields and `private_note` only when it exists.
3. Insert when it does not exist.
4. On unique violation `23505`, retry as a score/private-note-only update.

Do not add a `SECURITY DEFINER` save RPC unless the accepted direct,
RLS-protected path proves insufficient.

Deliverables:

- Rename `comment` to `privateNote`; visible label becomes **Private note**.
- Enforce the 500-character limit in the form.
- Real Rate/Edit behavior with duplicate-submit prevention.
- Complete query invalidation for public product, product list, user rating,
  and Rated Products.
- `app/account/rated-products.tsx` and Account → Rated Products → Detail
  navigation.
- Empty Rated Products state.
- App-level verification that server-owned aggregates reflect real saves and
  edits; do not reopen the aggregate mechanism.
- Focused rating mutation, invalidation, and Rated Products behavior tests.

Acceptance:

- After a successful first save, exactly one rating row exists for that
  user/product pair; no pair can contain more than one row.
- Concurrent first saves do not expose an unhandled unique error.
- Cross-user reads never return `private_note`.
- My Rating and server-owned rating count/averages refresh from the database.
- Browse, Detail, user rating, and Rated Products caches invalidate correctly.
- The client never writes `rating_aggregates`.
- No optimistic rating behavior or temporary connected-session map remains.
- Existing database concurrency and forgery suites still pass.

Non-goals:

- No public written review, likes/helpful votes, rating-delete UI, optimistic
  update, or new aggregate implementation.

## Task 18: Password Recovery And Deep Links

Status: Pending.

Goal: let email users recover access without mixing recovery risk into core
authentication.

Dependencies: Task 16 accepted; Task 17 need not block implementation.

Deliverables:

- Forgot Password and Reset Password routes.
- Recovery-only session handling.
- Document the development, preview/staging, and production recovery redirect
  matrix using the existing `eazyreview` scheme.
- Configure the local/development recovery redirect during implementation.
- Preview/staging and production redirect configuration are separate
  human-approved environment actions and must record their own evidence.
- Expired, replayed, malformed, direct-navigation, and ordinary-session states.
- New-password confirmation.
- Physical-device deep-link verification in a development or preview build.
- Focused recovery-state tests for verified, ordinary-session, direct,
  expired, replayed, and malformed states.

Acceptance:

- Only a verified recovery flow can update a password.
- Direct navigation and an ordinary signed-in session cannot expose an active
  reset form.
- Expired/replayed links offer a safe restart.
- The new password works and the old password fails.
- Recovery is proven outside web-only development.

## Task 19: Protected Account Deletion

Status: Pending.

Goal: provide complete in-app account deletion through a trusted server
boundary.

Dependencies: Tasks 16–18 accepted.

Deliverables:

- One authenticated Supabase Edge Function.
- Server validation of the bearer session and caller-derived target user ID.
- No authoritative user ID accepted from the client.
- Revoke all refresh sessions for the verified caller, then hard-delete that
  same Auth user with a server-only secret.
- Document the behavior and maximum remaining lifetime of already-issued
  access tokens after session revocation or deletion. Do not claim
  instantaneous cryptographic invalidation unless it is demonstrated.
- Existing FK cascades remove profile/ratings and accepted triggers preserve
  aggregates.
- Local session and user-scoped Query cleanup.
- Mocked deletion-client orchestration tests that perform no destructive
  account action.
- Human-run staging destructive-test checklist.

Acceptance:

- Delete Account is easy to find and confirmation explains permanence.
- No server-only secret exists in Expo.
- The client cannot choose another target.
- Failed server validation performs no deletion.
- Profile and ratings cascade; affected aggregates remain correct.
- Local session/cache are removed and deleted credentials cannot sign in.
- A second pre-existing session for the deleted account cannot refresh or
  establish a new authenticated application session.
- Already-issued access tokens are tested and documented against the
  configured JWT-expiry bound; the app does not claim immediate cryptographic
  invalidation.
- A human records the staging destructive test.
- Production deletion is never performed by a coding agent or tool.

Non-goals:

- No soft-delete, retention warehouse, deactivation alternative, or
  user-upload cleanup before user uploads exist.

## Task 20: Browse Scale-Up

Status: **Conditional.**

Start only when catalog size and measured query behavior make client-side
loading/filtering inefficient.

Dependencies: Task 15 accepted and a measured scaling need.

Deliverables when triggered:

- Server-side brand/name/SKU search.
- Index changes justified by query plans and delivered through a separately
  authorized schema task.
- Sorting by newest, Eazy Score, Community Score, and price where data permits.
- A small set of valuable filters.
- Pagination/cursor loading and web query-state behavior when needed.

Until then, keep client-side search over the small catalog.

## Task 21: Real Feed MVP

Status: Pending.

Goal: replace the primary placeholder with a deliberately small real Feed.

Dependencies: Tasks 15 and 17 accepted; enough catalog/rating data for useful
sections.

Deliverables:

- No more than three sections: Newly Added, Best Eazy Scores, and Most Rated or
  Best Community Scores only when data supports it.
- Hide empty or duplicate sections.
- Reuse `ProductCard` and existing product queries.
- Do not use “Trending” without a real time-based activity signal.
- No feed-configuration table.

Acceptance:

- Feed contains no placeholder primary surface.
- Every visible section is distinct, populated, and opens Product Detail.
- If a useful Feed cannot be completed before beta, remove the tab rather than
  ship a primary placeholder.

## Task 22: Automated App Tests And Database CI

Status: Pending.

Goal: close cross-feature verification gaps; connected tasks should already
have added focused tests as they landed.

Dependencies: Tasks 14–19 and 21 accepted; Task 20 only if its scale trigger
was met.

Deliverables:

- Missing cross-feature regression coverage across catalog adapters, auth
  gates, rating mutations, recovery, and the mocked deletion client.
- Account-switch integration coverage proving profile and rating cache
  isolation across a real multi-feature transition.
- Tests outside the app route directory.
- Add or extend a path-filtered CI workflow that runs the frontend test suite
  for relevant application changes.
- Path-filtered database CI job.
- One small Maestro smoke flow for the critical journey, run on demand or by
  deliberate PR trigger rather than every minor change.
- Coverage review, redundant-test removal, and test-suite cleanup.

Acceptance:

- Frontend tests and database CI run in documented commands and path-filtered
  workflows; frontend tests are not local-only.
- Focused tests from Tasks 15–19 remain green and missing cross-feature gaps
  are covered without broad snapshot duplication.
- Account switching cannot expose the prior user’s profile or rating cache.
- E2E verifies the main journey without relying on broad snapshot coverage.

## Task 23: Reliability, Accessibility, And Device QA

Status: Pending.

Goal: prepare a stable release candidate without adding a telemetry or
animation program.

Dependencies: Task 22 accepted.

Deliverables:

- One clear retry policy across Supabase and TanStack Query.
- Offline/reconnect states and root error recovery.
- VoiceOver labels, logical reading order, Dynamic Type, and touch-target
  checks.
- Loading and disabled-submit behavior.
- Small-screen keyboard/scrolling validation.
- Real iPhone validation plus one Android compatibility smoke.
- Light-only and iPhone-only-on-iOS configuration verification.
- Product-list performance check with a realistically expanded catalog.

Non-goals:

- No persistent offline cache, elaborate telemetry platform, or animation
  system.

## Task 24: Privacy, Legal, And Store Disclosures

Status: Pending.

Goal: complete user-facing and store-facing obligations before release.

Dependencies: Product data collection behavior through Task 23 is stable.

Deliverables:

- Final Privacy Policy, Terms of Use, and support/contact route.
- Direct Privacy, Terms, support/contact, and account-deletion information
  links in the Account surface, plus public URLs for store metadata. Do not add
  a generic Settings route unless concrete settings receive explicit task
  ownership.
- If Android distribution is planned, provide a functional public web resource
  where users can request account and associated-data deletion without the
  installed app. Explain identity verification and retention, and prepare its
  URL for the Google Play Data Safety form under the
  [Google Play account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN).
- Data inventory covering email, profile fields, ratings, private note, and any
  diagnostics actually enabled.
- Retention/deletion explanation and App Store privacy answers.
- Complete the current
  [App Store age-rating questionnaire](https://developer.apple.com/news/?id=tlur8uvi),
  including accurate social-media capability answers.
- A rule to update disclosures whenever analytics or another data SDK is added.

## Task 25: EAS Environments And TestFlight Candidate

Status: Pending.

Goal: create isolated development, preview, and production build paths and a
human-approved TestFlight candidate.

Dependencies: Task 24 accepted.

Deliverables:

- Stable iOS bundle ID, Android package ID, icon, splash, and version/build
  strategy.
- Development, preview, and production EAS profiles/variable sets.
- Preview connects only to staging.
- Production connects only to a human-approved production Supabase project.
- TestFlight upload and production migration/seed runbook.
- No EAS Update rollout until runtime versioning is understood and tested.

Boundaries:

- `EXPO_PUBLIC_*` values are public even when stored by the build system.
- Production database creation, linking, migrations, and seed application are
  separate human-approved operations.

## Task 26: Release Candidate And App Store Submission

Status: Pending.

Goal: verify the final beta and complete App Store submission materials.

Dependencies: Task 25 accepted.

Acceptance:

- Full `docs/RELEASE_CHECKLIST.md` pass.
- Clean-install and upgrade TestFlight tests.
- Sign-up, sign-in, recovery, rating, edit, logout, and deletion checks.
- No placeholder Feed or Account surfaces.
- Privacy/Terms links, screenshots, metadata, review notes, and deletion
  instructions are current.
- Reverify age-rating, privacy, deletion, and support disclosures against the
  actual release-candidate feature set before submission.
- If a later Android publication task is authorized, it must verify the
  external deletion-request URL and complete the Google Play Data Safety
  deletion declarations at the Android submission boundary.
- Production variables, schema, and grants match the approved release plan.
- Known limitations and rollback decision are written.
- A human chooses staged/manual release and completes App Review submission.

Boundaries:

- This task is an iOS-first App Store submission. Android scope remains the
  compatibility smoke owned by Task 23.
- Android production build upload, Play Console listing, testing-track
  promotion, review submission, and release decision require a separately
  authorized Android publication task.

## Task 27: Post-Launch Operations

Status: Pending.

Goal: maintain a lightweight operating checklist rather than another agent
framework.

Deliverables:

- Monitor failed auth/function calls, broken image URLs, stale offers, Supabase
  usage/limits, crashes, and store feedback.
- Run aggregate consistency checks.
- Keep rollback, catalog correction ownership, dependency/security update, and
  incident routines.
- Maintain a lightweight release-incident record containing impact, response,
  rollback decision, root cause, and durable correction.
- Add Sentry only when built-in logs and beta/production evidence justify the
  SDK and disclosure cost.

## Task 28: Catalog Import And Admin Pipeline

Status: **Post-MVP.**

Goal: add a reviewed import/admin path only after manual catalog behavior is
stable.

Potential scope:

- Source identity/provenance, image rights, unique external IDs, idempotent
  import jobs, freshness timestamps, source-specific rate limiting, retry
  limits, error handling, and a minimal review workflow.
- Use the established Cloudflare R2 asset strategy for approved public catalog
  images where appropriate; importing an image does not establish usage rights.
- Server/worker execution only; never mobile-client scraping.
- Keep imported products unpublished until validation passes.
- Add offer business keys or other schema only when an actual importer proves
  the need.

## Task 29: Public Publishing And Project Journal

Status: **Optional separate workstream; post-MVP.**

Potential outputs:

- Product-review articles, Eazy Score explanations, price-by-size
  visualizations, a technical case study, accepted-task journals, and
  read-only public product pages.

Boundary:

- Keep this read-only and outside the mobile release critical path.
- Consume reviewed product data; never become another source of truth for
  scores or catalog records.
- Deploy public publishing outputs through the existing Cloudflare-oriented
  personal publishing and asset strategy unless a later hosting decision
  replaces it.
