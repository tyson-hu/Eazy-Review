# Eazy Review Roadmap

Task detail, dependencies, acceptance, and current status live in
`docs/TASKS.md`. This file describes milestone order only.

## Current Position

- Tasks 1–10: app shell and mock Browse → Detail → Rate journey accepted.
- Tasks 11–12: secure Supabase schema/authorization foundation accepted
  locally and on explicitly authorized staging; production untouched.
- Post–Task 12 review: **GO with roadmap revision**.
- Next task: **Task 13 — Product Seed Data**.

The schema, aggregate mechanism, RLS/grants, score terminology, core journey,
and no-social MVP boundary are locked unless a reproducible defect appears.
Do not expand agent/process infrastructure while the connected application and
release path remain unfinished.

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

Complete in order:

1. **Task 13 — Product Seed Data**
   - Two deterministic products: one complete and one sparse.
   - SQL-only local seed and focused acceptance.
2. **Task 14 — Connected Client And Query Foundation**
   - Supabase client, generated types, Query client, lifecycle/online
     integration, query keys, environment validation, and the minimal frontend
     test harness required by connected tasks.
3. **Task 15 — Real Public Catalog Reads**
   - Published Browse/Detail reads and removal of mock-only mechanics.
   - No temporary UUID rating map.
4. **Task 16 — Core Authentication And Account State**
   - Sign-up, sign-in, sign-out, restoration, profile, and Rate gate.
5. **Task 17 — My Rating Persistence And Rated Products**
   - Direct RLS-protected save path, cache invalidation, Rated Products, and
     app-level aggregate verification.
6. **Task 18 — Password Recovery And Deep Links**
   - Recovery-only reset state and real-device deep-link verification.
7. **Task 19 — Protected Account Deletion**
   - Caller-derived Edge Function boundary and human-run destructive
     acceptance.

Why this order:

- The durable client/query layer exists before connected screens.
- Public reads never depend on a short-lived session-rating bridge.
- Core auth, recovery, and deletion remain independently reviewable.
- Aggregate architecture is not reopened; the app verifies the accepted
  server-owned behavior when real rating writes land.

## Phase 3: Product Completeness And Verification

1. **Task 20 — Browse Scale-Up (conditional)**
   - Begin only after catalog size/query plans prove a need.
2. **Task 21 — Real Feed MVP**
   - At most three truthful, non-duplicative sections.
3. **Task 22 — Automated App Tests And Database CI**
   - Cross-feature regression and account-switch coverage, test-suite cleanup,
     path-filtered database CI, and one small E2E smoke.
4. **Task 23 — Reliability, Accessibility, And Device QA**
   - Retry/offline behavior, VoiceOver/Dynamic Type, phone QA, iPhone
     validation, and Android smoke.

Task 21 must replace or remove the primary Feed placeholder before beta. Task
20 does not start merely because Filter/Sort existed in the mock design.

## Phase 4: Release Boundary

1. **Task 24 — Privacy, Legal, And Store Disclosures**
2. **Task 25 — EAS Environments And TestFlight Candidate**
3. **Task 26 — Release Candidate And App Store Submission**
4. **Task 27 — Post-Launch Operations**

This phase owns privacy/terms/support, App Store disclosures, isolated build
environments, production runbooks, TestFlight, release-candidate QA, App
Review submission, rollback, and post-launch operating checks.

Production Supabase setup, migrations, seeds, account deletion, and release
remain deliberate human-controlled actions under `docs/SECURITY.md`.

## Post-MVP Workstreams

- **Task 28 — Catalog Import And Admin Pipeline**
  - Add provenance, external IDs, idempotent server-side imports, freshness,
    rights review, and minimal admin review only after manual catalog behavior
    is stable.
- **Task 29 — Public Publishing And Project Journal**
  - Optional read-only publishing/case-study work outside the mobile critical
    path; never another score/catalog source of truth.

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
