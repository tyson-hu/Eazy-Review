# Eazy Review Roadmap

## Phase 1: Foundation

1. Confirm `docs/BLUEBOOK.md`.
2. Confirm `docs/DESIGN.md`.
3. Confirm `docs/DATA_MODEL.md`.
4. Set up `AGENTS.md`.
5. Set up `.cursor/rules`.
6. Set up Supabase local + staging (Task 11) — **in progress next**.

All phases follow the doc-update gate in `docs/DOCUMENTATION_POLICY.md`.

## Phase 2: UI Shell

1. App navigation.
2. Design tokens / theme.
3. Shared components.
4. Product card.
5. Rating display components.
6. Empty/loading/error components.

Status: Done for MVP shell (Tasks 1–5).

## Phase 3: Core Screens (mock)

1. Feed placeholder.
2. Browse/search.
3. Product detail.
4. Rating flow.
5. Account placeholder.
6. Rated products list (deferred until auth + real ratings).

Status: Browse / Detail / Rate mock journey Done (Tasks 6–10 **GO**). Feed and Account remain placeholders. Do not expand mock UI while Supabase foundation is open.

## Phase 4: Real Data (packetized)

Replace the old “add Supabase” checklist with these milestones. Detail and acceptance live in `docs/TASKS.md` Tasks 11–18.

1. **Task 11** — Environments and core schema (RLS on at create = deny-by-default; no client grants; no mobile UI wiring).
2. **Task 12** — Policies, Data API grants, authorization tests (grants only after policies).
3. **Task 13** — Product seed data (small seed first).
4. **Task 14** — Real Browse and Product Detail reads.
5. **Task 15** — Authentication (email first).
6. **Task 16** — My Rating persistence + Rated Products (`private_note`, owner-only; Account rated list).
7. **Task 17** — Server-owned community aggregates (verify/harden Task 11 trigger path; no mechanism re-selection).
8. **Task 18** — TanStack Query and cache invalidation.

Companion: skill-wrapper front-matter validation — **Done** (`npm run check:skill-wrappers` in `npm run check` + CI).

## Phase 5: Social Layer

Future only, after core app works:
- Comments / public written reviews.
- Likes.
- Shares.
- Reports/moderation.
- Activity feed.

Do not start during Tasks 11–18.

## Phase 6: Polish And Release

1. Performance cleanup.
2. Error states.
3. Auth edge cases.
4. TestFlight QA.
5. App Store assets.
6. Release checklist.

## MVP Milestones

### Milestone 1: App Shell

Deliverables:
- Expo app created.
- Expo Router working.
- Bottom tabs working.
- NativeWind working.
- Basic reusable UI components created.

Acceptance:
- User can open Feed, Browse, and Account tabs.
- App runs on iOS/Android simulator or physical device.
- Docs and tasks reflect the completed app-shell state.

Status: Done.

### Milestone 2: Mock Product Experience

Deliverables:
- Mock products.
- Browse screen.
- Product cards.
- Product detail screen.
- Rating form with fake local update.
- Task 10 UX readiness **GO**.

Acceptance:
- User can browse fake products.
- User can open a product.
- User can submit a fake rating.
- UI flow feels understandable.
- Docs and tasks reflect any route/component/type decisions made during the mock flow.

Status: Done.

### Milestone 3: Supabase Foundation (Tasks 11–13)

Deliverables:
- Local and staging Supabase environments.
- Versioned migrations for core tables with RLS enabled at create (deny-by-default).
- Task 12 policies + `anon`/`authenticated` grants + authorization tests.
- PostgreSQL constraints.
- Small product seed (expand catalog after trust).

Acceptance:
- Published products can be read publicly only after Task 12 policies and grants.
- Unpublished products are not anonymously readable.
- User ratings (when auth exists) are owner-writable; `private_note` is not readable by other users.
- Clients cannot write `rating_aggregates` or execute aggregate refresh RPCs.
- Data model, API contracts, tasks, security, and decisions are current.
- No production project touched by agents.
- Secret scanning is required and present for Task 11.
- Task 11 never completes with client grants while RLS policies are still missing.

### Milestone 4: Real Product Data (Task 14)

Deliverables:
- Browse fetches Supabase products.
- Product detail fetches Supabase product.
- Product card shows real score and price data.

Acceptance:
- No mock catalog required for product browsing on the connected path.
- Only published products are visible to anonymous clients.

### Milestone 5: Auth (Task 15)

Deliverables:
- Sign up.
- Sign in.
- Sign out.
- Session persistence.
- Auth-aware Account screen.

Acceptance:
- Logged-out user can browse.
- Logged-out user must sign in to rate.
- Logged-in user can access rating form.
- Sign-up produces exactly one readable `public.profiles` row for the new user (Account can load it).

### Milestone 6: Real Rating System (Tasks 16–18)

Deliverables:
- User can submit rating (insert vs score-only update — not PostgREST upsert of identity columns).
- User can edit rating.
- Rating summary recalculates server-side.
- Product detail refreshes after rating (TanStack Query invalidation).
- Rated Products screen (`app/account/rated-products.tsx`) lists the signed-in user’s ratings and opens Detail (Task 16).

Acceptance:
- Community Score changes after user rating via server-owned aggregates.
- User cannot create duplicate ratings for the same product.
- Private notes stay owner-only; Rate/Edit shows **Private note**, not Comment.
- Logged-in user can find rated products from Account.

### Milestone 7: Feed

Deliverables:
- Today's Pick.
- Trending Now.
- Best Eazy Scores.
- Best Community Scores.
- Newly Added.

Acceptance:
- Feed uses real product data.
- Product cards open Product Detail.

Defer until after Milestone 6.

### Milestone 8: Polish

Deliverables:
- Loading states.
- Empty states.
- Error states.
- Form validation.
- Better spacing.
- Basic settings pages.
- Terms and privacy placeholders.

Acceptance:
- App feels stable and usable.

## Explicit deferrals (post Task 10)

Do not pull these into Phase 4 foundation work:
- Fit profiles, ownership duration, experience labels.
- Price-history snapshots, advanced taxonomy, comparison features.
- Public AI-readable product pages, Sentry, product analytics.
- Custom MCP server (reassess after the 2026-07-28 MCP spec final).
- Agent-role expansion or blanket Cursor Router default changes without measured trials.
