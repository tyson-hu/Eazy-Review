# Eazy Review Tasks

## Current Repo Status

- Tasks 1–14 are accepted. The Browse → Product Detail → Rating Form mock
  journey passed its UX gate, and the Supabase schema, trigger-owned Community
  Score, RLS policies, explicit Data API grants, and authorization contract are
  complete. Task 13's deterministic two-product local catalog seed is also
  accepted.
- Task 14 is complete and human accepted. Expo has a validated public Supabase
  env module, one typed client, generated local database types, TanStack Query
  providers/lifecycle, public vs user-scoped query keys, and a jest-expo
  frontend test foundation.
- Task 15 is complete, human accepted, and merged in PR #32
  (`f7cb8856ccdebece51e007df301e4ce578892c1a`). Anonymous Browse and Product
  Detail read the two deterministic published products through one Supabase
  request per surface, with complete, sparse, loading, cached-refresh, offline,
  error/retry, empty, and not-found behavior. Feed remains mock/placeholder.
- Task 16 is **Done — human accepted and merged in PR #35 on 2026-08-09.**
  Core authentication and Account state (email/password sign-in/up/out,
  session restore, auth-gated Rate, minimal Account, cache isolation,
  `dismissTo` return navigation, auth-generation race guards). Physical
  iPhone checklist re-verified on the corrected build (human-reported PASS).
  Automated and web verification pass. Evidence:
  [`docs/evidence/task-16-auth-account/RESULT.md`](evidence/task-16-auth-account/RESULT.md).
- Task 17 is **Done — human accepted.** My Rating persistence (sneaker-10-v1),
  Community aggregate/server truth, Rated Products, Product Detail restoration,
  slider, offline/timeout reliability, zombie-session restore hardening, and
  incomplete-submit feedback. Full physical A–G matrix **PASS** on SHA
  `1325198` (2026-08-10). Human-reported final physical smoke: **PASS** on the
  final accepted branch tip (regression smoke, not a full A–G re-run). Agent
  web **PASS**; iOS Simulator normal-text **PASS with documented limits**.
  VoiceOver and maximum Dynamic Type remain **DEFERRED BY HUMAN SCOPE
  DECISION — POST-LAUNCH** → Task 27 (Dynamic Type failed twice; `a635251`
  reverted). Evidence:
  [`docs/evidence/task-17-my-rating-persistence/RESULT.md`](evidence/task-17-my-rating-persistence/RESULT.md).
- Task 18 is **implementation complete / acceptance pending** (draft PR #37).
  Password recovery request (`/auth/forgot-password`), recovery deep-link
  target (`/auth/reset-password`), `PASSWORD_RECOVERY` handling,
  non-enumerating confirmation, and focused automated recovery tests.
  Local/dev redirect paths use the `eazyreview` scheme. Physical device
  recovery matrix: **not-tested**. Web/simulator recovery walks: **not-run**.
  Human acceptance is **not claimed**. Task 19 is not started. Evidence:
  [`docs/evidence/task-18-password-recovery/RESULT.md`](evidence/task-18-password-recovery/RESULT.md).
  PR bodies for this work use the summary template in `docs/AGENT_WORKFLOW.md`.
- The app now defaults to Browse, uses the display name **Eazy Review**, forces
  light appearance, and does not advertise iPad support for the MVP.
- Task 14 is accepted in PR #31. Task 15 physical iPhone LAN catalog loads,
  Development-build cached offline, and Metro-independent Release cold-start
  offline + reconnect refetch were observed on-device (2026-08-07). Human
  acceptance of the five Part 1 product/architecture decisions is complete and
  PR #32 is merged. Evidence:
  [`docs/evidence/task-15-public-catalog/RESULT.md`](evidence/task-15-public-catalog/RESULT.md).

Accepted Tasks 11–12 database evidence is preserved at
[`docs/evidence/task-11-12-database-acceptance/RESULT.md`](evidence/task-11-12-database-acceptance/RESULT.md).
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
| 13 | Done | Deterministic complete/sparse product seed, provenance, and same-database idempotency acceptance |
| 14 | Done | Expo Supabase client, generated types, Query lifecycle/cache foundation, frontend test harness |

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
- Keep Browse → Product Detail → Rate as the core journey and the shared
  sneaker-10-v1 ten-dimension 0–10 form with derived 0–100 composites (no
  manual overall).
- Keep social content outside the MVP.
- No service-role credential may enter Expo.
- Applied migrations remain unchanged; any proven schema correction must be a
  separately authorized forward migration.

### Cleanup completed by this gate

- Corrected stale completed-task statuses and archived implementation history.
- Corrected stale frontend aggregate naming.
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

## Pre–Task 13 Agent Infrastructure Gate

Status: **Implemented and validated in PR #28 before merge.**

This unnumbered gate does not start or renumber Task 13. It establishes the
machine-readable documentation/task graph, a read-only verifier gate, explicit
parent ownership for route preparation and full Expo validation, Expo CI route
preparation/drift detection, and local-only path-filtered database CI. It changes
no product behavior, schema, migration, RLS policy, Data API grant, seed,
provider configuration, or remote environment.

Exact workflow and Database CI credential-log evidence is recorded in PR #28.

## Follow-up: Agent infrastructure checker v2

Status: **Deferred — documented only; not implemented in PR #28.**

This unnumbered follow-up does not start or renumber Task 13. It owns the
root-cause redesign that ends Markdown-semantic task-graph parsing.

Scope:

1. Create `config/task-graph.json` as canonical task metadata.
2. Store task IDs as integers.
3. Store dependency edges once.
4. Derive `Unlocks`.
5. Store parallel relationships as unordered pairs once.
6. Replace owner prose with owner-policy IDs.
7. Replace human-gate prose with gate-policy IDs.
8. Generate the Revised Sequence table and task metadata from structured data.
9. Remove Markdown semantic parsing from the task graph checker.
10. Split the checker into schema, paths, inventory, documents, task graph,
    stale terms, and impact-report modules.
11. Add `git ls-files` coverage so managed tracked files must be registered,
    covered by a collection, or explicitly exempt.
12. Add impact-rule coverage for managed source/config paths.
13. Prefer `matchAll()` and restricted regex flags.
14. Derive generated and mirror registry properties rather than declaring the
    same facts twice.

Residual risk until this lands: general Markdown/HTML rendering constructs
outside the documented plain-Markdown task-ledger grammar remain deferred
limitations of the PR #28 checker, not open defects inside that supported
contract.

## Revised Sequence

Work in order unless a task explicitly states that it is conditional.

| Task | Title | Status |
| --- | --- | --- |
| 13 | Product Seed Data | Done |
| 14 | Connected Client And Query Foundation | Done |
| 15 | Real Public Catalog Reads | Done — human accepted and merged in PR #32 |
| 16 | Core Authentication And Account State | Done — human accepted and merged in PR #35 on 2026-08-09 |
| 17 | My Rating Persistence And Rated Products | Done — human accepted |
| 18 | Password Recovery And Deep Links | Implementation complete / acceptance pending |
| 19 | Protected Account Deletion | Pending |
| 20 | Browse Scale-Up | Conditional |
| 21 | Real Feed MVP | Pending |
| 22 | Broader Automated App Tests And CI | Pending |
| 23 | Reliability, Accessibility, And Device QA | Pending |
| 24 | Privacy, Legal, And Store Disclosures | Pending |
| 25 | EAS Environments And TestFlight Candidate | Pending |
| 26 | Release Candidate And App Store Submission | Pending |
| 27 | Post-Launch Operations | Pending |
| 28 | Catalog Import And Admin Pipeline | Post-MVP |
| 29 | Public Publishing And Project Journal | Optional separate workstream |

## Task 13: Product Seed Data

Status: **Done — human accepted.**

Depends on: Tasks 11–12 and a passing run of the initial local-only Database CI
workflow that explicitly checks out the pull request head SHA.

Unlocks: Task 14.

Execution owner: Parent.

Parallel-safe with: None.

Human gate: Staging seed application requires explicit approval; production
remains forbidden.

Goal: create the smallest trustworthy connected catalog needed to validate real
Browse and Product Detail reads.

Canonical schema and authorization behavior remain unchanged.

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

Status: **Done — human accepted.**

Depends on: Task 13.

Unlocks: Task 15.

Execution owner: Parent; bounded non-sensitive implementation packets may use
the generic implementer.

Parallel-safe with: None.

Human gate: Human acceptance is complete. Task 15 requires separate
implementation authorization; no environment action is implied.

Goal: install and configure the durable application data layer before any
screen depends on it.

Deliverables:

- `@supabase/supabase-js`, one supported React Native session-storage
  adapter, and a URL polyfill only where required.
- `@tanstack/react-query` with React Native NetInfo and AppState lifecycle
  integration.
- Minimal frontend test foundation enforced in Expo CI.
- One smoke test outside `app/` (`src/test/harness.smoke.test.tsx`).
- Generated Supabase database types from the local schema
  (`src/types/database.generated.ts`; `npm run types:generate` /
  `npm run types:check`).
- One initialized Supabase client and one Query client with root providers in
  `app/_layout.tsx` via `AppProviders`.
- Query-key factories with separate public (`catalogKeys`) and user-scoped
  (`accountKeys`, `ratingKeys`) keys, plus `removeUserScopedQueries`.
- Development validation for `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Supported durable session storage; reproducible generated types; coordinated
  lifecycle handling; public vs user-scoped query-key separation; auth-transition
  cache cleanup; one small read-retry budget; no automatic rating mutation retry.

Acceptance:

- The app starts with valid development variables and fails clearly when they
  are missing (provider bootstrap/render path surfaces `PublicEnvError`).
- URL and publishable/legacy anon key are treated as public client
  configuration; no secret/service-role value reaches the bundle.
- Database types regenerate through one documented command.
- Public and user-scoped query keys cannot collide.
- Query focus follows foreground/background state and online state follows
  NetInfo.
- Auth transitions can remove prior user-scoped data
  (`removeUserScopedQueries`).
- `npm test` runs the harness smoke test successfully.
- Frontend unit tests run in the primary Expo CI validation job.
- Existing mock screens still run at task completion.
- Staging and production were not contacted.

Non-goals:

- No connected screen reads, persisted offline Query cache, Redux/Zustand,
  broad repository framework, universal runtime row validation, or optimistic
  mutation.

### Implementation evidence (PR #31)

Evidence only — does not replace the deliverables or acceptance above.

- Public env module uses static `process.env.EXPO_PUBLIC_*` references in a
  private frozen runtime bag; validation rejects missing/invalid/placeholder/secret
  values without echoing credentials. Invalid configuration throws during the
  `AppProviders` render/bootstrap path when lifecycle is enabled.
- Auth session storage uses `@react-native-async-storage/async-storage`
  (iOS/Android/web).
- Typed `getSupabase()` singleton (no Proxy; no fire-and-forget dynamic import);
  client construction passes AsyncStorage adapter + `processLock` and issues
  no network request.
- Lifecycle cleanup removes AppState/NetInfo subscriptions, stops auth auto
  refresh, and restores default Query focus/online handling.
- Frontend unit tests run in the primary Expo CI `validate` job (no separate
  path-filtered frontend job).
- Database CI runs `npm run types:check` against local Supabase and also
  triggers on `scripts/generate-database-types.cjs` and
  `src/types/database.generated.ts`.
- Task 15 consumes this accepted foundation for anonymous Browse and Product
  Detail; it does not change Task 14 defaults or create another Query Client.

## Task 15: Real Public Catalog Reads

Status: **Done — human accepted and merged in PR #32.**

Depends on: Tasks 13–14.

Unlocks: Task 16, conditional Task 20, and contributes to Task 21.

Execution owner: Generic implementer under one bounded feature-slice packet;
the parent owns scope and acceptance.

Parallel-safe with: None.

Human gate: Human acceptance and PR #32 merge are complete. Task 16 is the
authorized next milestone.

Goal: replace mock reads on Browse and Product Detail with published Supabase
data while keeping browsing anonymous.

Deliverables:

- `ProductDetailPublicData` plus focused product repository/query functions.
- `ProductDetailPublicData` contains only public catalog, assessment, offer,
  and Community Score data. Task 15 excludes `myRating` and every other
  viewer-owned field from that public payload and cache. Later tasks fetch
  viewer-owned state separately after authenticated identity is available;
  Task 17 owns the user-scoped My Rating query and Product Detail composition.
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
- Network loss does not block the application shell or navigation from
  launching, and catalog surfaces show a visible offline state.
- Cached public catalog data remains visible when available.
- When no cached catalog data is available, show an explicit offline/error
  state with a Retry action.
- Automatically refetch catalog data when connectivity returns.
- Never leave the user on an indefinite loading indicator.
- Missing Supabase configuration and temporary network loss use separate error
  paths; configuration failures must not be mislabeled as offline failures.
- Only published products appear.
- Primary image selection is stable across repeated reads.
- Mixed currencies are never compared numerically.
- Zero-rating/missing-aggregate input becomes a complete empty summary, never
  `undefined`.
- Sparse product states remain usable.
- No client calculation writes or replaces Community Score.
- Adapter tests cover no image, no offer, no aggregate, multiple images, and
  mismatched currency.

Persistent offline Query cache remains deferred; Task 15 may satisfy this
contract with the available in-memory cache.

Implementation and validation evidence, including public query/view-model
contracts, request counts, null/error/retry behavior, test totals, simulator
results, physical-device LAN wiring, Network Link Conditioner offline/reconnect
proof (including Metro-independent Release cold start), and remaining
limitations, is recorded at
[`docs/evidence/task-15-public-catalog/RESULT.md`](evidence/task-15-public-catalog/RESULT.md).

Physical-device acceptance (observed 2026-08-07, physical iPhone + Mac LAN URL +
local Supabase only; no staging/production):

- Safari reachability to Mac LAN Supabase API; Development and Release app
  installs open without Expo Go.
- Browse and Product Detail load both Task 13 fixtures over the LAN anonymously.
- Development-build cached offline (app process kept alive) shows catalog +
  offline banner; reconnect refetches.
- Release build, Metro stopped, cold start under iPhone Network Link Conditioner
  **100% Loss**: shell launches without Metro; offline/error + Retry when cache
  is empty; automatic catalog fetch after network returns.

## Task 16: Core Authentication And Account State

Status: **Done — human accepted and merged in PR #35 on 2026-08-09.**

Depends on: Task 15.

Unlocks: Task 17, Task 18, and contributes to Task 19.

Execution owner: Parent — verified strong; the generic implementer may receive
only bounded non-sensitive leaf packets.

Parallel-safe with: None.

Human gate: **Accepted.** Corrected physical-device checklist **PASS**
(human-reported). PR #35 merged. Staging auth configuration for later tasks
remains a separate explicit action. Implementation evidence:
[`docs/evidence/task-16-auth-account/RESULT.md`](evidence/task-16-auth-account/RESULT.md).

Goal: add only the identity/session behavior needed to protect the rating flow.

Deliverables:

- Email/password sign-up, sign-in, sign-out, and session restoration.
- Auth state provider.
- Logged-out and logged-in Account states.
- Owner profile read and joined-date display.
- Auth-gated Rate route with return-to-product behavior.
- Post-auth navigation unwinds to the **existing** destination via
  `router.dismissTo` (no duplicate Product stack entries).
- Explicit local/current-device sign-out (`scope: 'local'`) with loading/error UX.
- User-scoped Query cancel-before-remove on sign-out or account switch.
- Explicit email-confirmation state when sign-up returns no active session.
- Focused auth, session-restoration, Rate-gate, navigation-intent,
  cache-isolation, and overlapping auth-transition generation-race tests.
- Auth generation guards so stale in-flight applySession / optimistic
  sign-in/up/out cannot overwrite a newer transition after async cleanup.

Acceptance:

- Anonymous browsing remains available.
- Sign-up creates exactly one profile through the accepted database trigger.
- A signed-in user can read only their own profile.
- Logged-out Rate action opens sign-in.
- Successful sign-in returns to the intended **existing** product without a
  duplicate Product route (one Back → Browse).
- After sign-in, rating remains honestly unavailable on Product Detail until
  Task 17 connects durable My Rating persistence.
- Sign-out/account switching cannot expose the prior user’s profile or rating
  cache.
- Session restoration works after app restart.
- Supabase access and refresh tokens are sensitive authentication material.
  Profile display data such as name, email, phone, and avatar does not by
  itself drive the storage decision; the authentication tokens do.
- **HUMAN ACCEPTED (Task 16 MVP tradeoff only):** AsyncStorage for session
  storage despite unencrypted-at-rest risk. SecureStore lifecycle experiment
  was **explicitly waived** for Task 16; may be reconsidered in later
  security/release hardening. Server-side RLS remains required regardless.
- Service-role keys, passwords, backend secrets, and database credentials must
  never be stored in client storage.

Non-goals (remain later work — do not implement in Task 16):

- **Task 17 owns:** Rate form, create/edit My Rating, durable `user_ratings`,
  private notes, Rated Products, post-mutation invalidation, Community Score
  refresh after rating writes.
- **Task 18 owns:** forgot/reset password, recovery email handling, recovery
  deep links, app return handling for recovery (and confirmation deep links if
  canonically assigned there).
- **Task 19 owns:** protected account-deletion UX, reauthentication as required,
  destructive deletion path, secure operational handling.
- **Deferred — not part of Tasks 16–19 unless separately promoted in the
  roadmap:** Sign in with Apple; Google/social authentication; passkeys; MFA;
  editable profile; avatar upload; public profile; global/all-device session
  revocation; stronger native token-storage revisit.

## Task 17: My Rating Persistence And Rated Products

Status: **Done — human accepted.**

**Scope correction (physical-device):** While validating the first Task 17
implementation, two reproducible defects blocked acceptance: (A) Overall on a
1–10 form was rendered as a 0–100 score (for example Overall 9 → “Risky”), and
Eazy vs Community were not structurally comparable; (B) offline/unreachable
saves could leave Save in an indefinite spinner with no recovery path. Task 17
now includes the shared **sneaker-10-v1** ten-dimension rubric, derived 0–100
My Rating, direct Eazy/Community comparison UI, and a reusable fail-fast
offline + bounded-request timeout contract. Do not treat superseded six-field /
manual-overall docs as authoritative when they conflict with this correction.

**Auth restore hardening (physical-device):** Local AsyncStorage can retain a
session after a local Supabase `db reset` wipes the matching Auth principal.
`restoreSession()` no longer treats local `getSession()` alone as proof of
identity when online; it validates with Auth `getUser()` and clears only the
current-device session on definitive invalid principal/session responses while
preserving offline/transient restored sessions.

Depends on: Task 16.

Unlocks: Task 19, Task 21, and contributes to Task 22.

Execution owner: Parent — verified strong; the generic implementer may receive
only bounded non-sensitive leaf packets.

Parallel-safe with: Task 18 after all prerequisites are accepted and edit
scopes are file-disjoint.

Human gate: **Accepted.** Staging rating writes or acceptance remain a separate
explicit approval; production remains forbidden. Task 18 is **not** authorized
by this acceptance. Implementation evidence:
[`docs/evidence/task-17-my-rating-persistence/RESULT.md`](evidence/task-17-my-rating-persistence/RESULT.md).

Local Product Detail restoration evidence (2026-08-09): iOS Simulator
`pass` at 393×852, canonical live-Metro web preview `blocked` by the host
environment with a static-export visual adjunct completed. Physical Product
Detail at normal text size: **PASS** on SHA `1325198` (2026-08-10). See
[`docs/evidence/task-17-product-detail-restoration/RESULT.md`](evidence/task-17-product-detail-restoration/RESULT.md).

Local rating-slider gesture evidence (2026-08-09): automated gates `pass`.
Physical slider gestures: **PASS** on SHA `1325198` (2026-08-10). VoiceOver:
**DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** → Task 27. XXL Dynamic Type:
physical **FAIL** on SHA `1325198`; second targeted FAIL after `a635251`;
attempt reverted; **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** →
Task 27. See
[`docs/evidence/task-17-rating-slider-gesture/RESULT.md`](evidence/task-17-rating-slider-gesture/RESULT.md)
and
[`docs/evidence/task-17-my-rating-persistence/RESULT.md`](evidence/task-17-my-rating-persistence/RESULT.md).

Physical-device matrix (2026-08-10, Release, iPhone 17 Pro Max, iOS 27 Beta 5,
SHA **`1325198` only** for full A–G):

| ID | Result |
| --- | --- |
| A / A1 / A2 | PASS |
| B–D | PASS |
| E | PASS WITH COPY NOTE |
| F–G | PASS |
| Slider gestures | PASS |
| Product Detail (normal size) | PASS |
| VoiceOver | DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH → Task 27 |
| XXL Dynamic Type | FAIL (twice; deferred post-launch → Task 27; not a Task 17 blocker) |

Later commits (`2c4c7f2` incomplete-submit feedback, `09075af`, failed XXL
attempt `a635251` + revert, docs/Expo/web/simulator cleanup) are **not** the
physical A–G provenance SHA.

**Human-reported final physical smoke: PASS** on the final accepted Task 17
branch tip (regression smoke of launch / Browse / Product Detail /
authenticated Rate/Edit / slider / scroll / −/+/Clear / incomplete Save /
complete Save / Detail refresh / Account / Rated Products). Not a full re-run
of B/C/D/F/G.

Agent cross-platform verification (2026-08-10, final tip after cleanup): web
matrix **PASS** (live Metro, 393×852, local Supabase); iOS Simulator (Expo
Go, Eazy-Review-iPhone-15, normal text) **PASS** for Browse/Detail first
viewport/auth gate/Account signed-out, with authenticated Rate UI not
interactively automated (see evidence). Evidence:
[`docs/evidence/task-17-my-rating-persistence/RESULT.md`](evidence/task-17-my-rating-persistence/RESULT.md).

Goal: complete the first real value loop:
Browse → Detail → Sign in → Rate/Edit → Detail updates → Rated Products
with honest comparable scores and resilient connected save UX.

Write contract:

1. Read the owner’s current rating.
2. Update the ten dimension columns and `private_note` only when a row exists.
3. Insert when it does not exist (dimensions + note only; server derives score).
4. On unique violation `23505`, retry as a dimensions/private-note-only update.
5. Clients never write `score`, `methodology_version`, or `rating_aggregates`.
6. Do not use PostgREST upsert for Task 17.

Do not add a `SECURITY DEFINER` save RPC unless the accepted direct,
RLS-protected path proves insufficient.

Deliverables:

- Shared `RATING_DIMENSIONS` / methodology `sneaker-10-v1` (ten dimensions).
- Form: 0–10 half-step dimensions only; no editable Overall; live 0–100 My
  Rating preview; optional Private note (500-char limit).
- Rate/Edit uses the native community slider for large changes, preserves
  44-point − / + half-step controls and Clear, lets vertical-biased drags
  scroll, and disables iOS full-screen Back only on this route while retaining
  the standard leading-edge Back gesture. This is presentation-only; rating
  data and write contracts do not change.
- Grouped UI: Style; Build and Wear; Market and Ownership.
- Product Detail decision-first order: product identity → 0–100 Eazy Score and
  Community Score overview → Decision summary → verified offers → expanded
  one-to-one dimension comparison (0–10) → compact My Rating → description →
  persistent Rate/Edit CTA. Explicit `score100` / `score10` (or equivalent)
  props — never a scale-ambiguous generic “score”.
- Decision summary: methodology-compatible overall delta plus highest/lowest
  Community dimensions across the canonical ten, with one-decimal tie, empty,
  partial, and methodology-mismatch handling. Community rating count stays in
  its score card (`Early score` below five); comparison rows name both values
  for accessibility.
- Real Rate/Edit with duplicate-submit prevention, incomplete-submit feedback
  (sticky footer count + per-field errors; no silent no-op), and required cache
  invalidations (public product, list, user rating, Rated Products).
- Fail-fast when known offline; bounded request timeout (~10s);
  `networkMode: 'always'` on the explicit rating save mutation so offline is
  not an indefinite paused pending state.
- Paused-query presentation for My Rating / Rate init / Rated Products /
  Detail owner refresh: no endless Loading spinner; cache when available;
  explicit offline when not.
- Preserve dimension + private-note form input after offline/timeout/transport
  failures; user retries after reconnect — **no** offline write queue.
- `app/account/rated-products.tsx` and Account → Rated Products → Detail.
- Empty Rated Products state.
- Forward-only schema migration + regenerated DB types + deterministic seed
  under sneaker-10-v1 (deliberate fixtures; no fake remapping of old quality
  into resale/acquisition).
- Focused tests for composite formula, mutation offline/timeout settlement,
  paused queries, invalidation, `23505` recovery, NetInfo lifecycle.
- Physical-device evidence for online save, known-offline save, mid-request
  disconnect, reachable-network/unreachable local Supabase, offline open
  without cache, offline with cache.

Acceptance:

- After a successful first save, exactly one rating row exists for that
  user/product pair; no pair can contain more than one row.
- Concurrent first saves do not expose an unhandled unique error.
- Cross-user reads never return `private_note`.
- Derived My Rating is 0–100; ten 9.0 dims → 90; 81.5 sum → 82; 0 is valid;
  null is unanswered (not zero); half steps accepted; invalid increments
  rejected; client cannot persist a disagreeing composite.
- At 393-point width, a horizontal-biased curved drag (approximately 60 points
  horizontal / 20 vertical) changes the slider without page scroll; a
  vertical-biased drag (approximately 10 horizontal / 60 vertical) scrolls
  without changing the score; and at least 40 points of vertical drift after
  horizontal activation does not lose the active slider.
- Slider drags never dismiss Rate/Edit; the iOS leading-edge Back gesture still
  works outside slider interaction.
- Normal system text size remains the Task 17 layout acceptance bar for
  Browse, Product Detail, Rate/Edit, Account, and Rated Products. Maximum /
  XXL Dynamic Type and VoiceOver end-to-end acceptance were physically
  failed or not completed during Task 17 and are **DEFERRED BY HUMAN SCOPE
  DECISION — POST-LAUNCH** to **Task 27** (not Task 17 merge blockers after
  that decision). Design may still prefer adaptive layout when practical;
  extreme accessibility hardening is not required to close Task 17.
- Community derivation mirrors Eazy; methodology mismatch is not silently
  aggregated.
- Product Detail keeps verified offer price, seller, size, currency, and
  checked date ahead of the long ten-row comparison; it does not add a mobile
  Difference column.
- Rated Product Detail shows the My Rating `/100` composite and score label
  compactly; all ten editable dimensions and the private note remain on the
  Rate/Edit screen. Signed-out, loading, offline, error, and unrated states
  remain explicit.
- My Rating and server-owned rating count/averages refresh from the database.
- Browse, Detail, user rating, and Rated Products caches invalidate correctly.
- Incomplete Save: sticky footer explains remaining categories; unanswered
  rows show inline errors; no API write until all ten dimensions are set.
- Known offline Save: fail-fast offline copy, no endless spinner, form kept.
- Timeout/transport: settled error, form kept, not mislabeled as offline when
  the device is online.
- Paused/offline queries never show infinite “Loading your rating…”.
- The client never writes `rating_aggregates`.
- No optimistic rating behavior or temporary connected-session map remains.
- Existing database concurrency and forgery suites still pass.
- Physical-device matrix A–F recorded under `docs/evidence/` before human
  acceptance.

Non-goals:

- No public written review, likes/helpful votes, rating-delete UI, optimistic
  update, durable offline mutation queue, new aggregate ownership model, or
  silent scale conversion heuristics (`score <= 10 ? score * 10`).
- No Task 17.5 — corrections remain under Task 17 until accepted.

## Task 18: Password Recovery And Deep Links

Status: **Implementation complete / acceptance pending.**

Depends on: Task 16.

Unlocks: Task 19 and recovery work in Tasks 25–26.

Execution owner: Parent — verified strong; the generic implementer may receive
only bounded non-sensitive leaf packets.

Parallel-safe with: Task 17 after all prerequisites are accepted and edit
scopes are file-disjoint.

Human gate: Preview/staging redirect configuration requires separate approval;
production configuration remains owned by Tasks 25–26 and a human. Physical
iPhone deep-link matrix is human-run before formal acceptance.

Goal: let email users recover access without mixing recovery risk into core
authentication.

Deliverables:

- Forgot Password and Reset Password routes.
- Recovery-only session handling.
- Document the development, preview/staging, and production recovery redirect
  matrix using the existing `eazyreview` scheme.
- Configure and verify the local/development recovery redirect during
  implementation.
- If physical-device acceptance requires preview/staging configuration, Task
  18 may configure that environment only after separate human approval and
  must record evidence of both the environment action and the resulting
  physical-device verification.
- Task 18 does not configure production. Task 25 completes any remaining
  preview/staging setup from the matrix and prepares the exact production
  redirect configuration for human application with recorded evidence. Task
  26 owns end-to-end verification of the production recovery link.
- Default provider templates are acceptable for development and internal beta.
  Branded email templates and dedicated SMTP are not Task 18 blockers.
  Public-release email delivery and provider configuration are verified during
  Tasks 25–26.
- Expired, replayed, malformed, direct-navigation, and ordinary-session states.
- New-password confirmation.
- Physical-device deep-link verification in a development or preview build
  (evidence slot: **not-tested** until a human records results).
- Focused recovery-state tests for verified, ordinary-session, direct,
  expired, replayed, and malformed states.

Implementation notes (acceptance pending):

- Sign In and logged-out Account expose **Forgot password?**.
- Request uses `supabase.auth.resetPasswordForEmail` with
  `Linking.createURL('/auth/reset-password')` as `redirectTo`.
- Local Supabase `additional_redirect_urls` includes the documented dev
  scheme/path variants. Staging/production redirects are not configured.
- Local Auth `external_url` is environment-backed from the gitignored root
  `.env` (`SUPABASE_AUTH_EXTERNAL_URL`) so physical-device recovery emails use
  a device-reachable Mac LAN `/auth/v1` verification host. Restart the local
  stack after changing it and request a fresh link.
- AuthProvider tracks `recoveryPhase` (`idle` | `processing` | `verified` |
  `unavailable`) and processes cold/warm auth deep links without logging
  tokens or full URLs. Only `verified` enables password update.
- Successful update uses `supabase.auth.updateUser({ password })` once (no
  automatic retry/queue) and routes to Account while remaining signed in.
- Evidence (SOP surface vocabulary in `docs/evidence/README.md`):
  [`docs/evidence/task-18-password-recovery/RESULT.md`](evidence/task-18-password-recovery/RESULT.md).

Acceptance:

- Only a verified recovery flow can update a password.
- Direct navigation and an ordinary signed-in session cannot expose an active
  reset form.
- Expired/replayed links offer a safe restart.
- The new password works and the old password fails.
- Recovery is proven outside web-only development.

Human acceptance: **not claimed.**

## Task 19: Protected Account Deletion

Status: Pending.

Depends on: Tasks 16–18.

Unlocks: Task 22.

Execution owner: Parent — verified strong; the generic implementer may receive
only bounded non-sensitive leaf packets.

Parallel-safe with: None.

Human gate: Actual account deletion is human-only on every environment; the
staging destructive checklist is also human-run.

Goal: provide complete in-app account deletion through a trusted server
boundary.

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
- A second pre-existing session for the deleted account cannot refresh after
  global revocation. After its already-issued access token reaches the
  configured expiry, it cannot establish a new authenticated application
  session.
- Already-issued access tokens are tested and documented against the
  configured JWT-expiry bound, which must be no more than one hour for the MVP;
  the app does not claim immediate cryptographic invalidation.
- A human records the staging destructive test.
- Production deletion is never performed by a coding agent or tool.

Non-goals:

- No soft-delete, retention warehouse, deactivation alternative, or
  user-upload cleanup before user uploads exist.

## Task 20: Browse Scale-Up

Status: **Conditional.**

Depends on: Task 15 and a measured scaling need.

Unlocks: Task 22 only if this conditional task is triggered.

Execution owner: Parent may delegate one bounded feature packet after the
trigger evidence is accepted.

Parallel-safe with: Task 21 only when the parent proves file-disjoint scopes.

Human gate: A human/parent records the measured trigger before implementation.

Goal: scale Browse only when catalog size and measured query behavior make
client-side loading/filtering inefficient.

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

Depends on: Task 15, Task 17, and enough real data for useful sections.

Unlocks: Task 22.

Execution owner: Generic implementer under one bounded feature packet; the
parent owns scope and acceptance.

Parallel-safe with: Task 20 only when the parent proves file-disjoint scopes.

Human gate: Human acceptance is required before Task 22.

Goal: replace the primary placeholder with a deliberately small real Feed.

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

## Task 22: Broader Automated App Tests And CI

Status: Pending.

Depends on: Tasks 14–19, Task 21, and Task 20 only if its conditional trigger
was met.

Unlocks: Task 23.

Execution owner: Parent may delegate bounded, file-disjoint test packets; the
parent owns integrated cache/account-switch acceptance.

Parallel-safe with: None.

Human gate: Human acceptance selects any deliberate E2E trigger and approves
the integrated regression boundary before Task 23.

Goal: close cross-feature verification gaps; connected tasks should already
have added focused tests as they landed.

Deliverables:

- Missing cross-feature regression coverage across catalog adapters, auth
  gates, rating mutations, recovery, and the mocked deletion client.
- Account-switch integration coverage proving profile and rating cache
  isolation across a real multi-feature transition.
- Tests outside the app route directory.
- One small Maestro smoke flow for the critical journey, run on demand or by
  deliberate PR trigger rather than every minor change.
- Broader database/application regression coverage beyond the focused suites
  that landed with Tasks 13–19.
- Coverage review, redundant-test removal, test-suite cleanup, and CI
  optimization across the existing Expo, frontend-test, and local-database
  jobs.

Acceptance:

- Existing frontend and local-database CI remain green, path-filtered, and
  documented while broader regression coverage is added without duplication.
- Focused tests from Tasks 15–19 remain green and missing cross-feature gaps
  are covered without broad snapshot duplication.
- Account switching cannot expose the prior user’s profile or rating cache.
- E2E verifies the main journey without relying on broad snapshot coverage.

## Task 23: Reliability, Accessibility, And Device QA

Status: Pending.

Depends on: Task 22.

Unlocks: Task 24.

Execution owner: Parent coordinates bounded engineering packets and human
device QA.

Parallel-safe with: None.

Human gate: Physical-device, ordinary release accessibility checks that remain
in this task's scope, and platform acceptance require recorded human evidence.

Goal: prepare a stable release candidate without adding a telemetry or
animation program.

Deliverables:

- One clear retry policy across Supabase and TanStack Query.
- Offline/reconnect states and root error recovery.
- Ordinary release accessibility/device QA on **normal and common text sizes**
  (readable labels where already implemented, basic touch-target comfort, light
  smoke for large-but-not-maximum content sizes when practical).
- Loading and disabled-submit behavior.
- Small-screen keyboard/scrolling validation.
- Real iPhone validation plus one Android compatibility smoke.
- Light-only and iPhone-only-on-iOS configuration verification.
- Product-list performance check with a realistically expanded catalog.

Non-goals:

- No persistent offline cache, elaborate telemetry platform, or animation
  system.
- Full VoiceOver end-to-end verification, Rate/Edit half-step VoiceOver
  interaction, logical reading-order audit at extreme accessibility sizes,
  maximum / XXL Dynamic Type acceptance, and an accessibility-size regression
  matrix are **not** Task 23 release blockers. Those were deferred by human
  scope decision to **Task 27** post-launch hardening after Task 17 physical
  evidence (2026-08-10).

## Task 24: Privacy, Legal, And Store Disclosures

Status: Pending.

Depends on: Task 23 and stable product data-collection behavior.

Unlocks: Task 25.

Execution owner: Parent prepares accurate drafts and inventory; a human owns
legal and store answers.

Parallel-safe with: None.

Human gate: A human approves legal text, disclosures, and store questionnaire
answers.

Goal: complete user-facing and store-facing obligations before release.

Deliverables:

- Final Privacy Policy, Terms of Use, and support/contact routes, each with a
  functional public web URL for store metadata.
- Direct Account links to the Terms, Privacy, and support/contact routes plus a
  public account-deletion information URL. The public destination explains the
  in-app deletion path and the data deletion/retention behavior; it is not a
  second in-app deletion action or a new Expo route. Do not add a generic
  Settings route unless concrete settings receive explicit task ownership.
- If Android distribution is planned, provide a functional public web resource
  where users can request account and associated-data deletion without the
  installed app. Explain identity verification and retention, and prepare its
  URL for the Google Play Data Safety form under the
  [Google Play account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN).
- Data inventory covering email, profile fields, ratings, private note, and any
  diagnostics actually enabled.
- Retention/deletion explanation and App Store privacy answers.
- Prepare accurate answers for the current
  [App Store age-rating questionnaire](https://developer.apple.com/news/?id=tlur8uvi),
  including social-media capability answers. Task 26 completes and reverifies
  the questionnaire after Task 25 creates the final App Store Connect app
  record.
- A rule to update disclosures whenever analytics or another data SDK is added.

## Task 25: EAS Environments And TestFlight Candidate

Status: Pending.

Depends on: Task 24.

Unlocks: Task 26.

Execution owner: Parent prepares configuration/runbooks; humans own protected
environment actions and uploads.

Parallel-safe with: None.

Human gate: Production project/configuration actions, credentials, migrations,
seeds, and TestFlight upload require separate human approval/execution.

Goal: create isolated development, preview, and production build paths and a
human-approved TestFlight candidate.

Deliverables:

- Stable iOS bundle ID, Android package ID, icon, splash, and version/build
  strategy.
- Development, preview, and production EAS profiles/variable sets.
- Preview connects only to staging.
- Production connects only to a human-approved production Supabase project.
- Complete any remaining preview/staging recovery-redirect setup from the Task
  18 matrix.
- Prepare the exact production recovery-redirect configuration from the Task
  18 matrix. A human applies the production environment change and records the
  resulting evidence; a coding agent does not change production configuration.
- Document the intended public-release recovery-email provider/template
  configuration; applying production provider changes remains a separate
  human-approved environment action.
- TestFlight upload and production migration/seed runbook.
- No EAS Update rollout until runtime versioning is understood and tested.

Boundaries:

- `EXPO_PUBLIC_*` values are public even when stored by the build system.
- Production database creation, linking, migrations, and seed application are
  separate human-approved operations.

## Task 26: Release Candidate And App Store Submission

Status: Pending.

Depends on: Task 25.

Unlocks: Task 27.

Execution owner: Parent coordinates evidence and runbooks; humans own release
systems and submission.

Parallel-safe with: None.

Human gate: Production verification, App Store Connect changes, submission,
and release choice are human-controlled actions.

Goal: verify the final beta and complete App Store submission materials.

Acceptance:

- Full `docs/RELEASE_CHECKLIST.md` pass.
- Clean-install and upgrade TestFlight tests.
- Sign-up, sign-in, recovery, rating, edit, logout, and deletion checks.
- No placeholder Feed or Account surfaces.
- Privacy/Terms links, screenshots, metadata, review notes, and deletion
  instructions are current.
- Complete and reverify the current App Store age-rating questionnaire in the
  final App Store Connect app record, plus privacy, deletion, and support
  disclosures, against the actual release-candidate feature set before
  submission.
- Verify public-release recovery-email delivery and provider configuration end
  to end with the release-candidate environment and record the evidence.
- Prove end to end that a public-release recovery email opens the installed
  release-candidate build through the approved production redirect and
  completes the verified password-reset flow.
- If a later Android publication task is authorized, it must verify the
  external deletion-request URL and complete the Google Play Data Safety
  deletion declarations at the Android submission boundary.
- Production variables, schema, and grants match the approved release plan.
- Known limitations and rollback decision are written. Known
  **initial-release limitations** (must not be claimed complete in App Store
  evidence):
  - Full VoiceOver verification deferred to Task 27 post-launch.
  - Maximum / XXL Dynamic Type not supported/accepted at accessibility extremes
    (physical FAIL recorded in Task 17; deferred to Task 27).
- A human chooses staged/manual release and completes App Review submission.

Boundaries:

- This task is an iOS-first App Store submission. Android scope remains the
  compatibility smoke owned by Task 23.
- Android production build upload, Play Console listing, testing-track
  promotion, review submission, and release decision require a separately
  authorized Android publication task.

## Task 27: Post-Launch Operations

Status: Pending.

Depends on: Task 26.

Unlocks: None.

Execution owner: Parent maintains the operating checklist; humans own incident
and production decisions.

Parallel-safe with: None.

Human gate: Production response, rollback, and provider/configuration changes
remain human-controlled.

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
- **Post-launch accessibility hardening** (bounded; not a large redesign until
  the shipped UI stabilizes), owned here after human scope decision on
  2026-08-10:
  - VoiceOver end-to-end verification
  - Logical reading-order audit where still needed
  - Maximum Dynamic Type / accessibility content-size layouts
  - Rate/Edit half-step VoiceOver interaction
  - Accessibility-size regression matrix
  - Touch-target / accessibility QA at extremes
  - Fixes based on the stabilized post-launch UI

Do not expand this into an unbounded accessibility redesign project without a
separate scoped plan.

## Task 28: Catalog Import And Admin Pipeline

Status: **Post-MVP.**

Depends on: Task 26 and evidence that manual catalog operations are stable.

Unlocks: None.

Execution owner: Parent scopes the future server-side pipeline; humans own
source rights and publication approval.

Parallel-safe with: Task 29 as a separately scoped workstream.

Human gate: Source permission, asset rights, schema changes, and any
environment deployment require separate approval.

Goal: add a reviewed import/admin path only after manual catalog behavior is
stable.

Potential scope:

- Source identity/provenance, image rights, unique external IDs, idempotent
  import jobs, freshness timestamps, source-specific rate limiting, retry
  limits, error handling, and a minimal review workflow.
- Choose and document catalog asset hosting only when the importer proves it is
  needed. Cloudflare R2 may be evaluated then; it is not an established
  requirement. Importing an image does not establish usage rights.
- Server/worker execution only; never mobile-client scraping.
- Keep imported products unpublished until validation passes.
- Add offer business keys or other schema only when an actual importer proves
  the need.

## Task 29: Public Publishing And Project Journal

Status: **Optional separate workstream; post-MVP.**

Depends on: Task 26 and the separately governed Eazy Review Lab plan.

Unlocks: None.

Execution owner: The Eazy Review Lab workstream under its own repository
governance.

Parallel-safe with: Task 28 as a separately scoped workstream.

Human gate: Publication, preview exposure, merge, and deployment each require
their separately authorized Lab workflow gates.

Goal: keep optional public publishing and project-journal work separate from
the mobile release critical path.

Potential outputs:

- Product-review articles, Eazy Score explanations, price-by-size
  visualizations, a technical case study, accepted-task journals, and
  read-only public product pages.

Boundary:

- Keep this read-only and outside the mobile release critical path.
- Consume reviewed product data; never become another source of truth for
  scores or catalog records.
- Use the separately governed
  [Eazy Review Lab plan](https://github.com/tyson-hu/eazy-review-lab/blob/main/PLAN.md#3-fixed-decisions)
  for publishing deployment and asset decisions. This mobile-app repository
  does not duplicate or override that workstream's provider configuration.
