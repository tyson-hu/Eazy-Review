# Eazy Review Roadmap

## Phase 1: Foundation

1. Confirm `docs/BLUEBOOK.md`.
2. Confirm `docs/DESIGN.md`.
3. Confirm `docs/DATA_MODEL.md`.
4. Set up `AGENTS.md`.
5. Set up `.cursor/rules`.
6. Set up local + staging Supabase through Tasks 11–12.

All phases follow the doc-update gate in `docs/DOCUMENTATION_POLICY.md`.

## Phase 2: UI Shell

1. App navigation.
2. Design tokens / theme.
3. Shared components.
4. Product card.
5. Rating display components.
6. Empty/loading/error components.

## Phase 3: Core Screens (mock)

1. Feed placeholder.
2. Browse/search.
3. Product detail.
4. Rating flow.
5. Account placeholder.
6. Rated products list (deferred until auth + real ratings).

Status: Browse / Detail / Rate mock journey Done (Tasks 6–10 **GO**). Feed and Account remain placeholders. Do not expand mock UI while Supabase foundation is open.

## Phase 4: Real Data

1. **Task 11** — environments and deny-by-default core schema.
2. **Task 12** — policies, explicit Data API grants, authorization tests.
3. **Task 13** — product seed data (small seed first).
4. **Task 14** — real Browse and Product Detail reads.
5. **Task 15** — authentication (email first, including recovery and deletion).
6. **Task 16** — owner-only My Rating persistence and Rated Products.
7. **Task 17** — server-owned aggregate verification/hardening; no mechanism re-selection.
8. **Task 18** — TanStack Query and cache invalidation.

Task detail and acceptance live in `docs/TASKS.md`. Do not connect UI before
Task 14 or place auth before real catalog reads.

Companion: generated skill discovery is owned by replacement PR #17.

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

Acceptance:
- User can browse fake products.
- User can open a product.
- User can submit a fake rating.
- UI flow feels understandable.
- Docs and tasks reflect any route/component/type decisions made during the mock flow.

Status: Done.

### Milestone 3: Supabase Security Foundation (Tasks 11–12)

Deliverables:
- Local + staging environments.
- Task 11 core schema migration with RLS enabled, inherited client privileges
  revoked, and no positive client grants.
- Separate Task 12 policies/grants migration plus authorization tests.

Acceptance:
- Published catalog access and owner-only private rating access pass the
  `docs/DATA_MODEL.md` scenarios.
- No production project is touched and no service-role key enters Expo.

### Milestone 4: Real Product Data (Tasks 13–14)

Deliverables:
- Small trusted seed.
- Browse and Product Detail read published Supabase rows.
- Deterministic primary `imageUrl` mapping.
- Single-currency offer and lowest-price mapping.

Acceptance:
- Connected catalog browsing no longer requires mock product reads.
- Only published products are visible anonymously.
- Primary-image and lowest-price rules in `docs/API_CONTRACTS.md` hold.

### Milestone 5: Auth (Task 15)

Deliverables:
- Sign up, sign in, sign out, session persistence, and auth-aware Account.
- Forgot-password request and reset-password completion/deep-link routes.
- Protected server-side account deletion with no service-role key in Expo.

Acceptance:
- Logged-out browsing stays public; rating requires login.
- Sign-up creates exactly one readable profile row.
- Recovery and account deletion work end-to-end.

### Milestone 6: Real Rating System (Tasks 16–18)

Deliverables:
- My Rating persistence using the controlled insert/update path, not an identity-column PostgREST upsert.
- Rated Products route and Account navigation.
- Server-owned aggregate verification.
- Query caching and invalidation.

Acceptance:
- One owner-only rating per user/product and trusted Community Score refresh.
- Private notes stay owner-only and the connected form says **Private note**.
- Rated Products opens the signed-in user's rated product details.

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
