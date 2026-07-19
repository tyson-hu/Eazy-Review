# Eazy Review Tasks

## Current Repo Status

As of this document setup:
- Expo project exists with Expo Router.
- NativeWind v4 is configured with Tailwind, Babel, and Metro.
- Bottom tabs are Feed, Browse, and Account with placeholder screens.
- Reusable UI primitives exist under `src/components/ui/` (Screen, AppText, Card, Button, ScoreBadge, LoadingState, EmptyState, ErrorState, Input, ProductCard, RatingRow, RatingInputRow).
- Mock products, Product Detail, and Rating Form (Task 9) are implemented with session-only fake local rating state.

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

Added with Task 8 Packet 3:
- `RatingRow`

Added with Task 9:
- `RatingInputRow`

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

Status: Done.

Requirements:
- Product image area.
- Product title area.
- Metadata.
- Eazy Score.
- Community Score.
- Price/purchase section (lowest price emphasized plus price-by-size offers).
- Rating breakdown.
- My Rating state.
- Description.
- CTA. Destination decided: a minimal `/product/[id]/rate` placeholder route so the CTA navigates successfully (Task 9 replaces the placeholder); the placeholder must be explicitly named in its packet's edit scope.

Packet decomposition (run via the `implementer` per the Task Packet Format; sequential — later packets depend on the contract and share the screen file):

1. Packet 1 — Detail data contract and fixtures. Confirm the data needed for metadata, offers, rating breakdown, and My Rating; extend `src/types/product.ts` only where necessary; update affected `docs/API_CONTRACTS.md` sections. Do not overload `Product`: compose distinct concerns, targeting a shape along the lines of `ProductDetailData = { product; offers; ratingSummary; myRating | null }` (exact shape decided in the packet). My Rating is user-specific state and must not become a global catalog-product property. Fixture placement is the packet's decision within this boundary: catalog-card data stays in `mockProducts.ts` (extend only for genuine product metadata); offers, rating summaries, and user-specific mock ratings go in a dedicated detail fixture (e.g. `mockProductDetails.ts`) when embedding them would create duplicate or mixed-responsibility data. Any new fixture file must be explicitly listed in the packet's edit scope. This packet is also the implementer's positive-path boundary test (see rollout status).
   - Progress: Accepted. `ProductDetailData` in `src/types/product.ts`; detail fixtures + `getMockProductDetailById` in `src/features/products/mockProductDetails.ts` (catalog stays in `mockProducts.ts`). Docs updated. Implementer promoted to Active after in-scope positive-path validation.
2. Packet 2 — Product header and commerce summary (revised after Packet 1 acceptance). Switch lookup to `getMockProductDetailById(id)`. Header: image (null → deliberate placeholder), brand, name, SKU/metadata (omit missing SKU or release date gracefully). Scores use canonical Detail sources: Eazy Score from `detail.product.eazyScore`; Community Score from `detail.ratingSummary.communityScore` (rename `ProductRatingSummary.score` → `communityScore` in this packet before UI consumers); review count from `detail.ratingSummary.ratingCount` when shown. Purchase section owns the full price/purchase experience for Task 8: emphasize lowest price (derive from non-null `detail.offers` prices; use `product.lowestPrice` only as optional catalog fallback), list available offer rows or price-size pills with size, size region, seller/source, and currency-aware price display; graceful purchase-unavailable state when no usable offer prices exist. Do not use `product.communityScore` / `product.ratingCount` as Detail Community Score sources. Edge cases in acceptance: unknown id → Product not found; id `6` → zero ratings / no Community Score; id `8` → no Eazy Score; null image; missing SKU/release date; empty offers. Reuse `ScoreBadge`. New purchase-row component or `formatPrice` utility only if justified / missing. Packets 3–4 still own rating breakdown, My Rating, description, and CTA.
   - Progress: Accepted. Header, canonical score sources, purchase/price-by-size section, edge states, and `formatPrice` delivered. Reviewer finding on decimal-price formatting fixed; verifier passed.
3. Packet 3 — Ratings content. Canonical sources only: community category values and count from `detail.ratingSummary` (look/comfort/quality/outfit/value/overall averages are 0–10 — do not derive rows from `communityScore`, which is a 0–100 aggregate); My Rating from `detail.myRating`. Community breakdown shows those six categories as values out of 10; when count and averages are null/zero (product `6`), show one clear empty state such as "No community ratings yet" instead of six empty bars. My Rating: `null` → "Not rated yet" (no Rate CTA — Packet 4); non-null → overall emphasized, five supporting categories, optional comment only when present, visually distinct from Community Score. Add presentation-only `RatingRow` (`label`, `value: number | null`, optional `max`) used by both sections; screen maps data — the row must not know about `ProductRatingSummary` / `RatingBreakdown` or community-vs-personal. Edge cases: id `1` breakdown + My Rating with comment; id `2` breakdown + `myRating: null`; id `6` no community ratings and no My Rating; id `8` community ratings still render with null Eazy Score. Description, CTA, and rate route stay out of this packet.
   - Progress: Accepted. `RatingRow` presentation primitive; Community ratings from `detail.ratingSummary` category avgs (empty state when count 0 / all null); My Rating from `detail.myRating` (null → Not rated yet; non-null → overall + five categories + optional comment). Section order fixed to Community → Purchase → My Rating per `docs/DESIGN.md`. Verifier passed. No description/CTA.
4. Packet 4 — Description and action. Add a Description section after My Rating: non-null `product.description` renders the text; null (e.g. product `8`) keeps the section with a deliberate fallback such as "No product description available yet." Rate/Edit CTA uses existing `Button` and mock viewer state only: `myRating ? 'Edit my rating' : 'Rate this product'` — do **not** implement `Sign in to rate` (auth not connected; signed-out CTA deferred until authentication exists). Navigate to `/product/<id>/rate`. Create minimal `app/product/[id]/rate.tsx` placeholder (explicitly in edit scope): read route id, confirm product exists, show minimal product context, state that the rating form arrives in Task 9, unknown id → Product not found; no rating fields, local form state, or submit. Back navigation returns to Product Detail. Do not mark Task 8 Done — integrated completion follows.
   - Progress: Accepted. Description section after My Rating (null → "No product description available yet."); mock-viewer CTA via `Button` (`Edit my rating` / `Rate this product`); Expo Router path converted `app/product/[id].tsx` → `app/product/[id]/index.tsx` so nested `app/product/[id]/rate.tsx` placeholder can exist; CTA navigates to `/product/<id>/rate`. Signed-out `Sign in to rate` CTA deferred until authentication exists. Verifier passed. Task 8 remains Pending — integrated completion still open.
5. Integrated completion — parent-owned, not an implementer packet. Whole-screen reviewer pass; the parent evaluates the integrated findings and normally delegates the accepted ones as one bounded integrated-fix implementer packet (the parent may apply a trivial correction directly when delegation overhead would exceed the work, but must still run verification afterward); verifier; `npm run check`; human simulator walk; parent acceptance. Then mark Task 8 Done.
   - Progress: Accepted. Whole-screen review approved (nits only); parent applied USER_FLOWS route-path sync, Purchase catalog-fallback caption dedupe, single priced-offer filter, and USD catalog-fallback documentation. `npm run check` passed; human simulator walk confirmed good. Task 8 Done.

### Task 9: Build Rating Form Screen With Fake Local State

Status: Done.

Requirements:
- Look, comfort, quality, outfit, value, overall.
- Optional comment.
- 1-10 validation.
- Return to product detail after submit.

Packet decomposition (run via the `implementer` per the Task Packet Format; sequential):

1. Packet 1 — Rating form and validation. Replace the Task 8 rate-route placeholder with a usable mock form: product context, Rate vs Edit header from `detail.myRating`, string draft fields, prefill when My Rating exists, whole-number 1–10 field-level validation on submit, optional comment, single primary submit/save action. Valid submit does not mutate fixtures, navigate, or claim a save (Packet 2 owns success UX). Presentation-only `RatingInputRow` only if six score rows justify it.
   - Progress: Accepted. Form, string drafts, prefill, whole-number 1–10 field-level validation, presentation-only `RatingInputRow`. Valid submit clears errors only (no mutate / navigate / saved message). Parent review fixes: `Screen` `keyboardShouldPersistTaps="handled"`; simplified decimal check. Stale field errors while retyping deferred to Packet 2. Verifier passed (`typecheck`, `lint`, `git diff --check`).
2. Packet 2 — Mock submission, session persist, navigation. Controlled `saveMockMyRating` mutates private session fixtures; valid submit shows session-only success feedback then `router.replace` to Product Detail; docs clarify mock vs real invalidation.
   - Progress: Accepted. `saveMockMyRating` copies into private map; form validates then saves; honest session-only Alert then `router.replace(/product/${id})`; field error clears on retype; USER_FLOWS / API_CONTRACTS / DECISIONS updated. Community fixtures untouched. Verifier passed.
3. Integrated completion — parent-owned. Whole-screen reviewer pass; Detail `useFocusEffect` refresh so session My Rating re-reads on focus; web success path uses `window.alert` then navigate because RN `Alert` onPress is unreliable on web; submit uses `router.dismissTo` (not `replace`) so Detail → Rate does not leave a duplicate Detail on the stack; `npm run check`; human simulator walk; Task 9 Done.
   - Progress: Accepted. Verifier `npm run check` passed; source-contract smoke + focus composition confirmed. Mock persistence: session fixture map only; community summaries unchanged; reload resets. Post-acceptance review cleanup: comment empty→null only in `saveMockMyRating`; removed unreachable form save-failure Alert (form only mounts for known products); dropped redundant `typeof window` guards on web. Interactive mobile-preview walk: **simulator passed; physical device not tested**. PR follow-up: submit navigation switched from `replace` to `dismissTo` to unwind to the existing Detail route.

### Task 10: Review UX Flow Before Supabase

Status: Done — Phase 4 integrated re-audit passed; Supabase readiness **GO**.

Canonical journey: Browse → Product Detail → Rating Form (new-rating and edit-rating paths). Branch: `cursor/task-10-ux-review` (from merge `15109ec`).

Do not expand into Feed, Account, authentication, Supabase, social features, or marketplace purchasing. Session-only mock behavior must stay honest (no backend persistence or community-score recalculation claims).

#### Acceptance — Core journey

- User can locate Browse from the tab bar.
- Default Browse state communicates what products are available.
- Search works for brand, product name, and SKU.
- Search empty and deterministic error states are understandable and recoverable.
- Product cards clearly communicate identity, scores, and price.
- Tapping a card opens the correct Product Detail.
- Product Detail clearly distinguishes Eazy Score, Community Score, My Rating, purchase data, and review count.
- An unrated product clearly offers **Rate this product**.
- A rated product clearly offers **Edit my rating**.
- Invalid rating submission remains on the form and clearly identifies every invalid field.
- Valid new and edited ratings return to Detail and update My Rating for the current mock session.
- Back navigation returns to the prior meaningful screen without duplicate routes.
- Session-only persistence and reset limitations are understandable.

#### Acceptance — Quality gate

- No unresolved P0, P1, or core-flow P2 findings.
- Each screen has one obvious primary action.
- Keyboard-open scrolling allows the user to reach and activate Submit.
- Important empty, null, loading, error, and unknown-ID states remain usable.
- No misleading claim suggests backend persistence or community-score recalculation.
- Final integrated flow passes in an interactive mobile viewport.
- `npm run check`, `git diff --check`, and repository-status checks pass after the last code change.

#### Audit phases

1. Baseline screenshot audit (no code edits) — required capture set steps 1–18; findings reference numbered screenshots/observed steps. Procedure: `skills/interactive-preview-loop` → `docs/UX_SCREENSHOT_AUDIT_SOP.md` (mobile: `docs/MOBILE_SIMULATOR_SOP.md`; web: `docs/WEB_MOBILE_PREVIEW_SOP.md`). Evidence: `docs/evidence/`.
2. Findings report and parent triage (P0–P3); accept / reject / defer before any fix packets.
3. Bounded fix packets only from accepted findings (Browse / Detail / Rating groupings as needed).
4. Integrated re-audit after accepted fixes (same skill/SOPs).
5. Supabase readiness decision: **GO** / **CONDITIONAL GO** / **NO-GO**.

#### Progress

- Done: repository on `master` @ `15109ec`; branch `cursor/task-10-ux-review`; acceptance criteria tightened (this section).
- Done: Phase 1 baseline screenshot audit (iOS Simulator iPhone 16 + mobile web 393×852). Physical device: **tested-pass** (parent-reported 2026-07-18). Evidence report: `docs/evidence/task-10-baseline-ux/FINDINGS.md`.
- Done: Phase 2 findings + parent triage: `docs/evidence/task-10-baseline-ux/FINDINGS.md` — **F1–F8 all Accepted** (F4 confirmed via DevTools: `aria-label="(tabs), back"` / wrong `href`).
- Done: Phase 3 fix packets (Browse A, Detail B, Rating C, F4 header back, docs F8).
- Done: F4 verification — **Resolved** on web (`pass`), iOS Simulator (`pass`), and physical device (`tested-pass`). Evidence: `docs/evidence/task-10-f4-check/RESULT.md` + committed proof `screenshots/web-01-detail-back-button.png`. Not Phase 4.
- Done: agent infrastructure — preview SOPs + `skills/interactive-preview-loop`; evidence root `docs/evidence/`.
- Done: Phase 4 integrated re-audit — F1–F8 **Resolved**; iOS Simulator `pass`, mobile web @ 393×852 `pass`, physical device `not-tested` this run. Evidence: `docs/evidence/task-10-reaudit/RESULT.md` and the representative committed screenshots listed there.
- Done: Supabase readiness decision — **GO**. No unresolved P0, P1, or core-flow P2. The hard web deep-link Back → Feed behavior remains a documented P3 limitation outside the canonical Browse journey.
- Audit result / GO decision: **GO** (2026-07-18).
- Evidence retention (GitHub): the complete raw capture set remains **local-only** and was not deleted. GitHub hosts a **representative proof set** of **12 committed PNGs** total (1 F4 + 11 re-audit). All **33 baseline PNGs** and the other **31 re-audit PNGs** stay on the working machine; filenames cited in the audit reports for those omitted captures are **local capture IDs**, not repository-hosted files. Canonical rules: `docs/EVIDENCE_GITHUB_UPLOAD_SOP.md` (ignore rules in `.gitignore`).

## Follow-Ups / Discovered Work

- Done 2026-07-19: **Packet — Header chrome polish** — (1) `Screen` defaults to no top safe-area (`safeTop` opt-in); bottom inset still when `footer` is set; Feed duplicate in-page title removed so section cards start with `pt-4` under the tab header. (2) `HeaderBackButton` keeps a square 40×40 hit target (removed trailing `mr-2`) so iOS 26 liquid-glass shared background stays circular, not an oval with empty space after the chevron.
- Done 2026-07-04: promoted `.cursor/rules/security.mdc` content to `docs/SECURITY.md`; the rule is now a thin mirror. Context: `docs/DECISIONS.md` 2026-07-04 cross-agent portability entry.
- Added 2026-07-12: phased delegation system (policy: `docs/AGENT_WORKFLOW.md`, Delegation And Subagent Policy). Four approved roles, all instantiated in `.cursor/agents/`. Rollout status:
  - Done 2026-07-12: piloted `reviewer` and `verifier` during Tasks 6-7 (results below).
  - Done 2026-07-12: created `implementer.md` — Active. First-use positive-path validation passed on Task 8 Packet 1 (all changed paths inside allowed edit scope; typecheck + lint pass; served model recorded as Cursor Grok 4.5 / frontmatter `grok-4.5[effort=high,fast=false]`). Status in `docs/AGENT_WORKFLOW.md` is plain Active.
  - Done 2026-07-12: created `debugger.md` — Available, conditional escalation only, explicit parent invocation required. Remains unvalidated until its first legitimate escalation case; evaluate it then.
  - Follow-up: evaluate the implementer after Task 8 (delegation prompt quality, boundary adherence, rework, context savings vs. handoff cost).
- Done 2026-07-12: Expo SDK 57 patch dependency alignment (`expo`, `expo-linking`, `expo-router`) landed in PR #8 and was merged to `master`. The pilot branch was rebased onto that fix; `npx expo-doctor` and `npx expo install --check` pass.
- Done 2026-07-14: skill path sync after Task 8 route restructure — `app/product/[id].tsx` → `app/product/[id]/index.tsx` in `skills/ui-screen-builder`, `skills/feature-slice-builder`, and `skills/session-handoff` (approved skill-maintenance change; Task 8 remains Done).
- Added 2026-07-14: before wiring real multi-marketplace offers, define Product Detail lowest-price behavior for mixed currencies—enforce one currency per payload, group prices by currency, or introduce an explicit conversion source. Current mock/MVP catalog fallback assumes USD.

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
