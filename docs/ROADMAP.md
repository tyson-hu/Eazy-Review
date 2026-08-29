# Eazy Review Roadmap

Task detail, dependencies, acceptance, and current status live in
`docs/TASKS.md`. This file describes milestone order only.

## Current Position

- Tasks 1–10: app shell and mock Browse → Detail → Rate journey accepted.
- Tasks 11–12: secure Supabase schema/authorization foundation accepted
  locally and on explicitly authorized staging; production untouched.
- Task 13: deterministic complete/sparse local catalog seed accepted;
  staging and production untouched.
- Task 14: accepted; the client/query/test foundation is complete.
- Task 15: complete and merged (PR #32). Anonymous Browse and Product Detail
  use the deterministic public catalog locally, including physical iPhone LAN
  loads and phone-only offline/reconnect proof. Staging and production remain
  untouched.
- Task 16: **Done — human accepted and merged in PR #35 on 2026-08-09.** Core
  authentication and Account state; corrected physical iPhone checklist PASS;
  automated and web verification PASS. Task 17 owns durable My Rating and
  Rated Products.
- Task 17: **Done — human accepted and merged in PR #36 on 2026-08-11.**
  Durable My Rating
  (sneaker-10-v1), Community aggregates, Rated Products, Product Detail
  restoration, slider, offline/timeout reliability, zombie-session restore,
  incomplete-submit feedback. Full physical A–G **PASS** on SHA `1325198`;
  human-reported final physical smoke **PASS** on the final accepted tip
  (regression smoke). Web **PASS**; iOS Simulator **PASS with documented
  limits**. VoiceOver and maximum Dynamic Type remain **DEFERRED BY HUMAN
  SCOPE DECISION — POST-LAUNCH** → Task 27 (Dynamic Type failed twice;
  `a635251` reverted). Excluded identity features (social login, passkeys/MFA,
  editable/public profile, standalone user-facing global sign-out/session
  management, secure native session storage revisit) stay deferred — not part
  of Tasks 16–19 unless separately promoted. Task 19's mandatory internal
  global revocation is not a standalone account feature.
- Task 18: **Done — human accepted and merged in PR #37 on 2026-08-17.**
  Email password recovery request + reset deep-link route, non-enumerating
  confirmation, recovery-only Auth phase, local/dev `eazyreview` redirect
  allowlist. Automated local gate greened; physical device recovery matrix
  **tested-pass** on SHA `acac64d` (2026-08-15); web/simulator recovery walks
  **not-run**. The old-password rejection **tested-pass** by human report and
  Task 18 was human accepted on 2026-08-15. The merge satisfied Task 19's
  dependency but did not itself authorize implementation.
  Production recovery host configuration remains Tasks 25–26. Evidence:
  `docs/evidence/task-18-password-recovery/RESULT.md`.
- Task 19: **Partial — implementation complete; human staging deletion
  pending.** The local non-destructive packet includes current-password
  reauthentication, caller-derived Edge Function validation, global refresh-
  session revocation before hard deletion, honest non-atomic outcomes, and a
  revision-bound principal guard that preserves newer Auth/cache authority.
  Prior PR head `f64cb3d` passed exact-head Expo and Database CI. Fresh
  Function, frontend, local database/gateway, mobile-web, and iOS Simulator
  verification passed on 2026-08-29 against that head. A5 maintenance PR #44
  merged the ten expected SDK 57 patches (`f3886a5` / `33c66ee`); Task 19 is
  rebased locally onto that `master` at `1647f58`, with publish and fresh
  exact-head CI still pending. Physical-device review, staging
  deployment/configuration, destructive staging proof, human acceptance,
  merge, and production remain outstanding. Dashboard:
  `docs/evidence/task-19-protected-account-deletion/RESULT.md`; details:
  `docs/evidence/task-19-protected-account-deletion/VERIFICATION.md`.
- Post–Task 12 review: **GO with roadmap revision**.

The schema, aggregate mechanism, RLS/grants, score terminology, core journey,
and no-social MVP boundary are locked unless a reproducible defect appears.
Agent/process infrastructure changes remain exceptional maintenance work that
requires explicit approval and a concrete repository defect.

## Phase 1: Accepted Foundation

Tasks 1–12 delivered:

- Expo Router, NativeWind, app tabs, and reusable UI primitives.
- Accepted mock Browse, Product Detail, and session-only Rate/Edit UX.
- Seven-table Supabase schema.
- Trigger-owned Community Score and one rating per user/product.
- Least-privilege RLS, explicit Data API grants, and owner-only private notes.
- Local and explicitly authorized staging acceptance.

Historical packet detail is archived from the active task plan; accepted
contracts remain in `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md`, and the
current decision records.

## Phase 2: Connected Critical Path

**Tasks 13 → 14 → 15 → 16 → (17 and 18 as explicitly permitted) → 19.**

This milestone moves from deterministic seed data to the durable client/query
layer, real public catalog reads, core account state, owner-only rating and
recovery paths, and finally protected account deletion. The accepted
server-owned aggregate architecture is verified, not re-selected. Exact task
dependencies and parallel-safety live only in `docs/TASKS.md`.

## Phase 3: Product Completeness And Verification

**Tasks 20–23.** Browse scale-up remains conditional on measured need; Feed
must become useful or be removed. Connected work adds focused tests as it
lands, while Task 22 closes cross-feature gaps, adds a deliberately triggered
E2E smoke, and optimizes the already-present CI lanes. Task 23 owns release
reliability, ordinary device QA, and non-extreme accessibility smoke. Full
VoiceOver and maximum Dynamic Type hardening are post-launch (Task 27).

Task 21 must replace or remove the primary Feed placeholder before beta. Task
20 does not start merely because Filter/Sort existed in the mock design.

## Phase 4: Release Boundary

**Tasks 24 → 25 → 26 → 27.**

This phase owns privacy/terms/support, App Store disclosures, isolated build
environments, production runbooks, TestFlight, release-candidate QA, App
Review submission, rollback, and post-launch operating checks.

Production Supabase setup, migrations, seeds, account deletion, and release
remain deliberate human-controlled actions under `docs/SECURITY.md`.

## Post-MVP Workstreams

**Tasks 28–29.** Catalog import/admin work waits for stable manual catalog
behavior. Public publishing remains an optional read-only workstream outside
the mobile critical path and never becomes another score/catalog source of
truth.

## Explicit Deferrals

Until post-MVP evidence justifies them:

- Dark mode and iPad optimization.
- Social reviews, comments, likes, follows, and activity systems.
- Editable public profiles.
- Advanced filters and recommendation systems.
- Scraping/import automation and admin dashboard.
- Persistent offline Query cache.
- Sentry/product analytics.
- Additional RLS or aggregate redesign without a reproducible defect.
- Expanded agent roles, skills, evidence systems, or security tooling without
  explicit approval and a concrete project need.
