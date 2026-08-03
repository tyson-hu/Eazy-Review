# Eazy Review Roadmap

Task detail, dependencies, acceptance, and current status live in
`docs/TASKS.md`. This file describes milestone order only.

## Current Position

- Tasks 1–10: app shell and mock Browse → Detail → Rate journey accepted.
- Tasks 11–12: secure Supabase schema/authorization foundation accepted
  locally and on explicitly authorized staging; production untouched.
- Task 13: deterministic complete/sparse local catalog seed accepted;
  staging and production untouched.
- Post–Task 12 review: **GO with roadmap revision**.
- Next task: **Task 14 — Connected Client And Query Foundation**.

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
reliability, accessibility, and device QA.

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
