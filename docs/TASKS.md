# Eazy Review Tasks

## Current Repo Status

As of this document setup:
- Expo project exists with Expo Router.
- NativeWind v4 is configured with Tailwind, Babel, and Metro.
- Bottom tabs are Feed, Browse, and Account with placeholder screens.
- Reusable UI primitives exist under `src/components/ui/` (Screen, AppText, Card, Button, ScoreBadge, LoadingState, EmptyState, ErrorState).
- Mock products, Product Detail, and Rating Form are not yet implemented.

## Definition Of Done

See Definition Of Done in `docs/AGENT_WORKFLOW.md`.

## First Implementation Task List

Complete these in order:

### Task 1: Create Expo Project With TypeScript

Status: Done in starter app.

Quality check:
- `package.json` has Expo and TypeScript dependencies.

### Task 2: Install And Configure Expo Router

Status: Mostly done in starter app.

Quality check:
- `package.json` uses `expo-router/entry`.
- Routes load through `app/_layout.tsx`.

### Task 3: Install And Configure NativeWind

Status: Done.

Scope:
- Install NativeWind and required peer/config packages for Expo SDK 57.
- Add Tailwind config.
- Add Babel/Metro config if required by the current NativeWind docs.

Quality check:
- `global.css` imported in root layout.
- `tailwind.config.js`, `babel.config.js`, and `metro.config.js` exist.
- `npm run check` passes.

### Task 4: Create App Tabs

Status: Done.

Create:
- `app/(tabs)/feed.tsx`
- `app/(tabs)/browse.tsx`
- `app/(tabs)/account.tsx`

Replace starter tab names with:
- Feed.
- Browse.
- Account.

Quality check:
- Starter `index.tsx`, `two.tsx`, and modal route removed.
- `app/index.tsx` redirects `/` to `/feed`.
- Tab layout uses Eazy Review names and icons.

### Task 5: Create Reusable UI Components

Status: Partial.

Created in this milestone:
- `Screen`
- `Button`
- `Card`
- `AppText`
- `ScoreBadge`
- `LoadingState`
- `EmptyState`
- `ErrorState`

Added with Task 7:
- `Input`
- `ProductCard`

Still pending:
- `RatingRow`

### Task 6: Create Mock Product Data

Status: Done.

Created:
- `src/types/product.ts` (Product, ProductCardData, RatingBreakdown, ProductRatingSummary, ProductOffer per `docs/API_CONTRACTS.md`)
- `src/features/products/mockProducts.ts` (8 mock products, including null-score and zero-rating entries for empty-state coverage)

### Task 7: Build Browse Screen With Mock Product List

Status: Done.

Requirements:
- Search input.
- Product list.
- Filter button placeholder.
- Sort button placeholder.
- Empty/loading/error states.
- Product cards navigate to Product Detail.

Delivered: local search over brand/name/SKU, disabled Filter/Sort placeholders, loading/empty/error states with an end-of-list scroll placeholder, and card navigation to `/product/[id]` via a minimal placeholder detail route (full screen is Task 8). Searching `__error__` is the deterministic mock path that enters the error state until a real data source can fail.

### Task 8: Build Product Detail Screen

Status: Pending.

Requirements:
- Product image area.
- Product title area.
- Metadata.
- Eazy Score.
- Community Score.
- Lowest price section.
- Rating breakdown.
- My Rating state.
- Description.
- CTA.

### Task 9: Build Rating Form Screen With Fake Local State

Status: Pending.

Requirements:
- Look, comfort, quality, outfit, value, overall.
- Optional comment.
- 1-10 validation.
- Return to product detail after submit.

### Task 10: Review UX Flow Before Supabase

Status: Pending.

Acceptance:
- User can browse fake products.
- User can open a product.
- User can submit a fake rating.
- UI flow is understandable.

## Follow-Ups / Discovered Work

- Done 2026-07-04: promoted `.cursor/rules/security.mdc` content to `docs/SECURITY.md`; the rule is now a thin mirror. Context: `docs/DECISIONS.md` 2026-07-04 cross-agent portability entry.
- Added 2026-07-12: phased delegation system (policy: `docs/AGENT_WORKFLOW.md`, Delegation And Subagent Policy). Four approved roles; only `reviewer` and `verifier` are instantiated in `.cursor/agents/`. Rollout status:
  - Done 2026-07-12: piloted `reviewer` and `verifier` during Tasks 6-7 (results below).
  - Create `implementer.md` only if delegated implementation proves beneficial in further use; the pilot validated review/verify delegation only.
  - Create `debugger.md` when a real multi-attempt or context-heavy debugging case justifies isolated diagnosis; until then the parent runs `skills/bugfix-debug-loop` directly.
- Discovered 2026-07-12 (pre-existing, found by `npm run check` during Task 7 validation): expo-doctor reports patch mismatches — expected `expo ~57.0.4` (found 57.0.2), `expo-linking ~57.0.2` (found 57.0.1), `expo-router ~57.0.4` (found 57.0.3). Not caused by Tasks 6-7 (no dependency changes). Track as a dependency-alignment task: update the packages to the SDK 57 patch versions (use `npx expo install expo@~57.0.4 expo-linking@~57.0.2 expo-router@~57.0.4` or equivalent), then confirm with `npx expo install --check` / `npm run check`. Prefer a small dedicated PR from `master` rather than bundling into the pilot PR.

## Reviewer/Verifier Pilot Results (2026-07-12, Tasks 6-7)

Flow used per task: parent implements -> `reviewer` spec review -> parent applies accepted findings once -> `verifier` runs narrowest checks.

- **Did the reviewer catch meaningful issues rather than repeat existing instructions?** Partially meaningful. Task 6: two real doc-sync findings (stale import path in the `docs/API_CONTRACTS.md` mock snippet; task status not updated) — useful but small. Task 7: three findings, one substantive (missing infinite-scroll placeholder required by `docs/USER_FLOWS.md` — a genuine spec omission the parent missed), one doc-sync, one real code-quality catch (uncleaned duplicate retry timer). No finding merely restated a rule.
- **Did the verifier classify failures accurately?** Yes. Task 6: clean pass, correct skip reasoning. Task 7: caught a real `react-hooks/set-state-in-effect` lint error and classified it caused-by-change with correct evidence; correctly declined to run an interactive flow walk as out of read-only scope. The expo-doctor patch-mismatch failure surfaced on the parent's re-run and was classified pre-existing by the parent.
- **Did delegation reduce parent-context noise without causing excessive handoff work?** Yes for verification (full lint/check output stayed out of parent context; reports were compact). Mildly for review — delegation prompts were long because every context path must be restated, but shorter than reading review context into the parent twice.
- **Did either subagent trigger at inappropriate times?** No. Both ran only when explicitly delegated at the pilot's defined points.
- **Fix-cycle note:** the reviewer-fix-verify sequence surfaced one avoidable loop — the reviewer's accepted retry-timer fix introduced the lint error the verifier then caught. One extra parent fix pass resolved it; within the one-review-fix-pass budget, but worth watching.

## Supabase Tasks

Do not start until mock UX flow works:
- Create Supabase project.
- Add schema migrations.
- Add RLS policies.
- Seed products.
- Add Supabase Auth.
- Add product and rating queries.
- Add TanStack Query.
- Replace mock product browsing with Supabase data.
- Replace fake rating flow with real rating mutations.
