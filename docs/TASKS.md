# Eazy Review Tasks

## Current Repo Status

As of 2026-07-24 (post Task 10 / PR #13 merge):
- Expo SDK 57 app with Expo Router, NativeWind v4, and bottom tabs (Feed, Browse, Account).
- Reusable UI primitives under `src/components/ui/` (Screen, AppText, Card, Button, ScoreBadge, LoadingState, EmptyState, ErrorState, Input, ProductCard, RatingRow, RatingInputRow, HeaderBackButton).
- Mock Browse → Product Detail → Rate/Edit journey is UX-ready (Task 10 **GO**), with bundled catalog images, decision summary, Overall-first rating form, and session-only My Rating.
- Head is maintenance after Task 10 (skill-discovery restore + Expo patch alignment). **No Supabase client, migrations, auth, or real product/rating APIs yet.**
- Next work is a security-first Supabase foundation (Tasks 11+). Do not expand UI, Feed, agent framework, MCP, social features, or AI assistant while that foundation is open.

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

- Done 2026-07-19: **UI style layout/shape/type pass** — Visual System + primitives aligned to `docs/UI_STYLE.md` chrome grammar: pill CTAs/inputs, card padding 24px / gaps 20–24px, no card/button/text shadows (product-image shadow only), `AppText` body ~17px / weights 400+600, press `scale(0.95)`. Did not adopt Apple full-bleed marketing tiles, black global nav, or 80px section pads. Spec: `docs/UI_STYLE.md` + `docs/DESIGN.md` Visual System; durable context: `docs/decisions/2026-07-19-separate-style-language-from-product-ux.md`.
- Done 2026-07-19: **Screen-level chrome alignment** — stacked screen cards now use 20px spacing, Detail score/price emphasis uses weight 600, primary Button labels use weight 400, and `app/+not-found.tsx` reuses `Button`. Feed and Account product jobs were not redesigned.
- Done 2026-07-19: **Approved UI audit remediation** — contrast-safe secondary/score tones; eight bundled mock catalog images; Detail decision summary before the complete community breakdown; Overall first on Rating; explicit web tab accessibility labels. Mobile web 393×852 `pass`; iOS Simulator `not-run`; physical device `tested-pass` on iPhone 17 Pro Max / iOS 27.0. Evidence: `docs/evidence/ui-audit-remediation-20260719/RESULT.md` (three representative web PNGs selected; physical journey observed live through iPhone Mirroring; raw diagnostics local-only).
- Done 2026-07-19: **UI remediation follow-up** — ProductCard uses CSS `boxShadow` on web and native shadow/elevation props elsewhere, removing the React Native Web `shadow*` deprecation warning; multiline Comment uses the 18px card radius while single-line score inputs remain pills.
- Done 2026-07-19: **Physical-device completion for the UI audit remediation** — after two LAN attempts stalled before app load, an explicitly approved temporary Expo tunnel loaded the app on iPhone 17 Pro Max / iOS 27.0. The physical Browse → Detail → Rate/Edit journey passed, including brand/name/SKU search, empty-state recovery, invalid validation, session-only save feedback, updated `My Rating`, both rating branches, and meaningful Back navigation. The tunnel was stopped after the run.
- Done 2026-07-21: **PR #11 review polish** — shared Detail community-category field list; Decision summary hides Top strength / Weakest when averages tie at one-decimal display precision; unmapped `mock-product://` URIs use the "Image coming soon" placeholder; mock catalog PNGs resized/compressed to 800×533 (~3.1MB total). Contract note: `docs/API_CONTRACTS.md`. This routine review-fix history remains archive-only.
- Done 2026-07-19: **Packet — Header chrome polish** — (1) `Screen` defaults to no top safe-area (`safeTop` opt-in); bottom inset still when `footer` is set; Feed duplicate in-page title removed so section cards start with `pt-4` under the tab header. (2) `HeaderBackButton` keeps a square 40×40 hit target (removed trailing `mr-2`) so iOS 26 liquid-glass shared background stays circular, not an oval with empty space after the chevron.
- Done 2026-07-04: promoted `.cursor/rules/security.mdc` content to `docs/SECURITY.md`; the rule is now a thin mirror. Durable context: `docs/decisions/2026-07-04-agent-agnostic-security-source.md`.
- Added 2026-07-12: phased delegation system (policy: `docs/AGENT_WORKFLOW.md`, Delegation And Subagent Policy). Four approved roles, all instantiated in `.cursor/agents/`. Rollout status:
  - Done 2026-07-12: piloted `reviewer` and `verifier` during Tasks 6-7 (results below).
  - Done 2026-07-12: created `implementer.md` — Active. First-use positive-path validation passed on Task 8 Packet 1 (all changed paths inside allowed edit scope; typecheck + lint pass; served model recorded as Cursor Grok 4.5 / frontmatter `grok-4.5[effort=high,fast=false]`). Status in `docs/AGENT_WORKFLOW.md` is plain Active.
  - Done 2026-07-12: created `debugger.md` — Available, conditional escalation only, explicit parent invocation required. Remains unvalidated until its first legitimate escalation case; evaluate it then.
  - Follow-up: evaluate the implementer after Task 8 (delegation prompt quality, boundary adherence, rework, context savings vs. handoff cost).
- Done 2026-07-12: Expo SDK 57 patch dependency alignment (`expo`, `expo-linking`, `expo-router`) landed in PR #8 and was merged to `master`. The pilot branch was rebased onto that fix; `npx expo-doctor` and `npx expo install --check` pass.
- Done 2026-07-14: skill path sync after Task 8 route restructure — `app/product/[id].tsx` → `app/product/[id]/index.tsx` in `skills/ui-screen-builder`, `skills/feature-slice-builder`, and `skills/session-handoff` (approved skill-maintenance change; Task 8 remains Done).
- Done 2026-07-21: restore `test-and-validation-loop` discovery stubs — `.agents/skills/` and `.claude/skills/` wrappers were accidentally replaced with full skill copies (no YAML front matter) during Task 10; restored thin `name` / `description` stubs pointing at `skills/test-and-validation-loop/SKILL.md`. This routine repair remains archive-only.
- Done 2026-07-23: Expo SDK 57 patch realignment for CI — `expo-doctor` failed on PR #13 with 7 out-of-date packages (`expo`/`expo-router` → `~57.0.8`, `react-native-screens` → `~4.26.0`, plus matching Expo module patches). This routine dependency maintenance remains archive-only.
- Done 2026-07-25: mixed-currency Detail lowest-price strategy assigned to Task 14 — MVP one currency per product offer payload (no raw cross-currency min). See `docs/API_CONTRACTS.md` and `docs/DATA_MODEL.md` Resolved decisions.
- Added 2026-07-24: post–Task 10 weekend plan recorded — packetized Supabase Tasks 11–18, `private_note` language, RLS-before-UI, skill-wrapper validation companion; freeze UI/agent/MCP expansion. Durable sequencing: `docs/decisions/2026-07-24-security-first-supabase-task-sequencing.md`; roadmap: `docs/ROADMAP.md` Phase 4.
- Done 2026-07-24: **skill-wrapper validation** — `scripts/check-skill-wrappers.cjs` / `npm run check:skill-wrappers` wired into `npm run check` and Expo CI. The validation implementation history remains archive-only.

## Reviewer/Verifier Pilot Results (2026-07-12, Tasks 6-7)

Flow used per task: parent implements -> `reviewer` spec review -> parent applies accepted findings once -> `verifier` runs narrowest checks.

- **Did the reviewer catch meaningful issues rather than repeat existing instructions?** Partially meaningful. Task 6: two real doc-sync findings (stale import path in the `docs/API_CONTRACTS.md` mock snippet; task status not updated) — useful but small. Task 7: three findings, one substantive (missing infinite-scroll placeholder required by `docs/USER_FLOWS.md` — a genuine spec omission the parent missed), one doc-sync, one real code-quality catch (uncleaned duplicate retry timer). No finding merely restated a rule.
- **Did the verifier classify failures accurately?** Yes. Task 6: clean pass, correct skip reasoning. Task 7: caught a real `react-hooks/set-state-in-effect` lint error and classified it caused-by-change with correct evidence; correctly declined to run an interactive flow walk as out of read-only scope. The expo-doctor patch-mismatch failure surfaced on the parent's re-run and was classified pre-existing by the parent.
- **Did delegation reduce parent-context noise without causing excessive handoff work?** Yes for verification (full lint/check output stayed out of parent context; reports were compact). Mildly for review — delegation prompts were long because every context path must be restated, but shorter than reading review context into the parent twice.
- **Did either subagent trigger at inappropriate times?** No. Both ran only when explicitly delegated at the pilot's defined points.
- **Fix-cycle note:** the reviewer-fix-verify sequence surfaced one avoidable loop — the reviewer's accepted retry-timer fix introduced the lint error the verifier then caught. One extra parent fix pass resolved it; within the one-review-fix-pass budget, but worth watching.

## Supabase Tasks (post Task 10)

Mock UX is **GO**. Work these as small sequential milestones — not one large “add Supabase” task. Task 11 and Task 12 must use separate migrations. Task 12 creates a new forward-only migration for policies and Data API grants after Task 11's deny-by-default migration has been applied and verified. Canonical schema: `docs/DATA_MODEL.md`. Skill: `skills/supabase-schema-change`.

### Weekend / near-term freeze

Out of scope until the foundation tasks below say otherwise:
- Broad UI restyling, Feed, Filter/Sort expansion.
- New agent roles, global model reassignment, custom MCP server.
- Marketplace scraping, public written reviews, social features, AI chatbot/verdicts.
- Connecting the mobile UI before Task 14.
- TanStack Query before Task 18 (after real reads exist).
- Production database access or automated production migrations for coding agents.

### Task 11: Environments And Core Schema

Status: Pending — next.

Goal: local + staging Supabase environments and the smallest readable core schema. **Do not connect the mobile UI.**

Deliverables:
- Supabase CLI; local stack; separate staging project (no production work).
- Versioned SQL migration(s) for first tables:
  - `profiles` (row created by protected `AFTER INSERT ON auth.users` trigger — clients never INSERT profiles)
  - `products` (including `is_published` for draft vs public catalog)
  - `product_images` (unique `(product_id, sort_order)` so Task 14 primary-image selection is deterministic)
  - `eazy_assessments` (editorial Eazy Score; versioned rows with required `is_current` + partial unique one-current-per-product index; replaces planned `official_ratings` name)
  - `user_ratings` (scores + `private_note`, not `comment`; immutable `product_id` and `user_id`)
  - `rating_aggregates` (server-owned Community Score summary)
  - `product_offers` (required in Task 11 so Task 12 policies/grants and Task 14 Detail offers have a relation)
- PostgreSQL constraints: scores 1–10; `private_note` max 500 chars; one rating per user per product; required timestamps; valid FKs; `product_offers.price` and `product_offers.size` null or a finite `>= 0` value (negative and `'NaN'::numeric` rejected; null remains unavailable / unsized); `product_offers.currency` `not null` default `'USD'` with check `currency in ('USD')`; `product_offers.size_region` `not null` default `'US'` with check `size_region in ('US')` (expand each whitelist when more codes / sizing systems ship).
- **Enable RLS on every exposed table in the same migration as table creation** (deny-by-default: no client policies yet). Do **not** grant `anon` / `authenticated` table privileges in Task 11.
- Optional: `service_role` tooling grants only (never ship service-role into Expo).
- Aggregate helpers: **Task 11 owns the aggregation mechanism** — implement `refresh_rating_aggregates` + `handle_user_rating_change` / `user_ratings_refresh_aggregates_trigger` (trigger after insert/update/delete). Helpers are `SECURITY DEFINER` with `REVOKE EXECUTE` from `PUBLIC` / `anon` / `authenticated` (trigger-only); per-product serialized refresh before reading `user_ratings`; zero-count `rating_aggregates` row on every `products` INSERT (see `docs/DATA_MODEL.md`). Do not leave mechanism choice (RPC vs schedule vs trigger) to Task 17.
- **New-user profile trigger:** `handle_new_user` on `auth.users` AFTER INSERT inserts `public.profiles (id)` only; `REVOKE EXECUTE` from clients (see `docs/DATA_MODEL.md`).
- Environment-variable validation pattern (anon key / URL only in Expo; never service-role in the mobile bundle).
- **Secret scanning** wired for the foundation workstream (CI and/or pre-commit); Task 11 does not pass without it.
- Docs: `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md`, `docs/SECURITY.md`, this file, and the Task 11 records linked from generated `docs/DECISIONS.md`. Add a new decision record only if implementation changes a durable high-impact choice.

Acceptance:
- Local `supabase start` / reset works from committed migrations.
- Staging project exists and is the only remote target for agent work.
- Every Task 11 table has RLS enabled; client roles cannot read/write via the Data API yet (no policies + no `anon`/`authenticated` grants).
- Inserting into `auth.users` (local auth / test harness) creates exactly one matching `public.profiles` row for that id.
- Migration is human-readable; no UI, seed catalog, auth screens, or TanStack Query in this task unless explicitly added as a tiny companion packet.
- Confirmation recorded that no production project was touched.
- Secret scanning job/hook is present and fails on a deliberate test secret pattern (or documented equivalent proof).

Task 11 contract checklist (fill before implementation):
- Exact tables and excluded features.
- Allowed file paths — must cover both schema **and** environment setup deliverables above:
  - `supabase/migrations/**`, `supabase/config.toml`, and other committed local Supabase CLI config needed for `supabase start` / reset
  - package scripts / lockfile changes required for the CLI or secret-scan tooling (`package.json`, `package-lock.json`)
  - env example and validation module for anon URL/key only (for example `.env.example`, `src/lib/supabase*` or equivalent — no service-role in the mobile bundle)
  - secret-scanning CI/hook config
  - listed docs (`docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md`, `docs/SECURITY.md`, `docs/TASKS.md`; `docs/decisions/*.md` plus generated `docs/DECISIONS.md` only if a qualifying decision changes)
  - Do **not** expand into Browse/Detail/Rating UI, seed catalog, auth screens, or TanStack Query unless an explicit tiny companion packet says so
- Required constraints (including `product_offers.price` / `product_offers.size` null or finite `>= 0`, rejecting negatives and `'NaN'::numeric`; `product_offers.currency` / `product_offers.size_region` `not null` with MVP whitelist checks), `is_published`, RLS-on-create (deny-by-default), aggregate `REVOKE`s, per-product serialized aggregate refresh, and `auth.users` → `profiles` ensure trigger (see `docs/DATA_MODEL.md`).
- Assessment history locked to the versioned model: `eazy_assessments.is_current boolean not null`, partial unique index `eazy_assessments_one_current_per_product`, and confirmation that Task 12 / Task 14 will select only `is_current = true` (overwrite-only is not allowed — `docs/DATA_MODEL.md` Resolved decisions).
- Explicit confirmation that `anon` / `authenticated` table `GRANT`s are **deferred to Task 12** (and that clients never receive `profiles` INSERT).
- Whether seed data is included (default: no full catalog).
- Required validation commands (include `npm run decisions:check`, `npm run check:skill-wrappers`, and the secret-scan command).
- Staging-only execution confirmation.

### Task 12: Policies, Data API Grants, And Authorization Tests

Status: Pending.

Goal: add complete RLS policies, then grant least-privilege Data API access to `anon` / `authenticated`, then prove unauthorized scenarios fail. **Grants must not land before policies.**

Deliverables:
- A **new** forward-only migration (do not edit or extend Task 11's applied migration) that adds policies and Data API grants after Task 11's deny-by-default schema has been applied and verified.
- Policies matching `docs/DATA_MODEL.md` (published catalog reads, owner-only `user_ratings` with published-product INSERT/UPDATE checks, no client writes to `rating_aggregates`).
- Explicit Data API `GRANT`s for `anon` / `authenticated` **after** those policies exist (see Privileges And Data API Exposure in `docs/DATA_MODEL.md`), including **`REVOKE ALL PRIVILEGES`** on each client-facing table from `anon` / `authenticated` before rebuilding the allowlist, then **column-level** `UPDATE` on `profiles` (`display_name`, `username`, `avatar_url`) and column-level `user_ratings` grants: INSERT permits `product_id`, `user_id`, score columns and `private_note`; UPDATE permits only score columns and `private_note` (no client grants on `id` / timestamps; identity columns never appear in the UPDATE set).
- Authorization tests (SQL or project-approved harness), including privilege inventory (`information_schema.role_table_grants` / column privileges) and attempted audit-column updates.

Required scenarios (minimum):
- Anonymous can read published products (and related public catalog reads for published products only).
- Anonymous cannot read unpublished products or their related catalog rows.
- Anonymous cannot create ratings.
- Authenticated user can create / update / delete **own** rating (`product_id` and `user_id` immutable).
- Authenticated user cannot insert or update a rating for an unpublished product (own DELETE still allowed).
- Authenticated user cannot rewrite `profiles` / `user_ratings` audit or identity columns via Data API grants (prove after revoke+allowlist; table-wide UPDATE must not remain).
- Client cannot directly insert arbitrary `profiles` rows; authenticated users can update only their own mutable profile fields.
- User cannot read another user’s `private_note`.
- User cannot modify another user’s rating.
- Client cannot modify `rating_aggregates` (no write grants; cannot execute refresh RPC).
- Client cannot mark a purchase as verified (when that column exists).

Acceptance:
- Policies and grants land in a migration separate from Task 11's schema/deny-by-default migration (Task 11 migration left unchanged after apply).
- RLS remains enabled on all exposed tables; policies match `docs/DATA_MODEL.md`.
- `anon` / `authenticated` grants exist only alongside the policies that authorize them.
- Authorization tests cover the scenarios above.
- Aggregate refresh remains server-owned (function/trigger); clients cannot write summary rows or execute refresh helpers via RPC.

### Task 13: Product Seed Data

Status: Pending.

Goal: seed one or two representative products first; expand toward the eight-product mock catalog only after the small seed is trusted.

Acceptance:
- Seed SQL (or approved script) loads into local reset and staging.
- Every seeded product has a matching `rating_aggregates` row (zero-count when no ratings yet — product insert trigger and/or explicit seed rows). No published product relies on a missing summary join.
- Seeded / imported `product_offers.currency` and `product_offers.size_region` values are trimmed, uppercased, and inside each schema whitelist (MVP: `USD` / `US` only); never insert `NULL`, `''`, or arbitrary codes that bypass `default 'USD'` / `default 'US'`.
- Image strategy decided: upload approved assets to Storage **or** keep mock-image resolution until real catalog ingestion (see unresolved decisions in `docs/DATA_MODEL.md`).
- Seeded `product_images` use deliberate unique `sort_order` values per product (schema unique `(product_id, sort_order)`).
- Provenance fields populated where required by the schema (`source_type`, capture timestamps, methodology version as applicable).

### Task 14: Real Browse And Product Detail Reads

Status: Pending.

Goal: replace mock product reads for Browse and Product Detail. Rating writes stay mock/session until Task 16. Skill: `skills/feature-slice-builder` in **connected-read** mode (no migrations/RLS — those stay in `skills/supabase-schema-change`).

Deliverables:
- Browse and Product Detail load published catalog rows from Supabase (not `mockProducts` / `getMockProductDetailById` for those screens).
- **Primary image mapping:** flatten `product_images` to a single `imageUrl` using `sort_order ASC`, then `created_at ASC`, then `id ASC`; products with no images → `null`. Selection must be stable across repeated reads.
- **Offer currency (MVP):** each product’s offer payload is single-currency. Omit or reject mismatched-currency offers before computing lowest price; never take a raw numeric minimum across currencies (`docs/API_CONTRACTS.md`). Browse `ProductCardData` must carry that same selected currency as `lowestPriceCurrency` (with `lowestPrice`) so cards do not hardcode `$`.
- **Rate/Edit compatibility adapter (required in this task):** Detail will navigate with real product UUIDs, but rating persistence stays session-only until Task 16. Do **not** leave the rate route bound only to `getMockProductDetailById` / `saveMockMyRating` against `mockProducts` keys — that rejects every UUID and blocks Task 15’s “logged-in user reaches the form” path.
  - Load rate-screen product context from the same real product/detail repository used by Detail (or a thin adapter over it).
  - Keep My Rating in a temporary session map keyed by **viewer identity + product ID** (any product ID string, including UUIDs). A product-ID-only map is not enough once Task 15 adds auth in the same JS runtime — user B must not see or overwrite user A’s note.
  - Clear or re-key the map on sign-in / sign-out / account switch (Task 15 must verify this if the map still exists then).
  - Replace that session map with Supabase persistence in Task 16.
- Detail/Browse mapping produces a non-null `ProductRatingSummary` even when the aggregate join is missing: normalize to the canonical empty summary (`ratingCount: 0`, null averages / Community Score). Prefer the DB zero-row from Task 11/13; normalization is the safety net.

Acceptance:
- Anonymous Browse and Detail work against Supabase public reads.
- Canonical Detail field sources in `docs/API_CONTRACTS.md` still hold (including single-currency lowest price and deterministic primary `imageUrl`).
- Browse cards show the selected offer currency correctly (`lowestPrice` + `lowestPriceCurrency`; no hardcoded `$`).
- No client-trusted Community Score calculation.
- Opening Rate/Edit for a seeded Supabase product UUID shows the form (product context loads); session save/load works for that UUID without requiring a mock catalog id.
- A published product with zero ratings still yields `ratingSummary.ratingCount === 0` (never an undefined summary).
- Repeated Browse/Detail reads for a multi-image product return the same primary `imageUrl`.

### Task 15: Authentication

Status: Pending.

Goal: email auth first unless Apple Sign-In is required for the next TestFlight. Browse remains public; rating requires login. Own password recovery and account deletion so users are not locked out and the release gate can pass. Skill: `skills/feature-slice-builder` in **auth-connected** mode (implement the in-app delete-account product flow; never delete accounts via MCP — FORBIDDEN on every environment).

Deliverables:
- Sign up / sign in / sign out / session persistence.
- **Password recovery:** `app/auth/forgot-password.tsx` (request) and `app/auth/reset-password.tsx` (completion / recovery deep-link target); Account logged-out Forgot Password entry point (`docs/DESIGN.md`); recovery-email submission with honest success/error states; recovery deep-link / session handling on Reset Password; new-password completion; verify new password works and old password does not.
- **Delete account:** logged-in Account Delete Account action with destructive confirmation (and reauthentication if the provider requires it); protected server-side deletion (never a service-role key in the Expo bundle); defined cascade / anonymization / retention for `profiles`, `user_ratings`, and related rows; local session/cache cleanup; verify the deleted account can no longer sign in.

Acceptance:
- Sign up / sign in / sign out / session persistence.
- Sign-up creates exactly one `public.profiles` row for the new `auth.users` id (via Task 11 `handle_new_user`); the logged-in Account screen can read that row (avatar / display name / username / joined date fields as designed — nulls until the user edits).
- Logged-out Rate CTA becomes sign-in gate; logged-in user reaches the form.
- Account screen reflects auth state without Feed/social scope growth (including Forgot Password when logged out and Delete Account when logged in).
- Password recovery path works end-to-end for an email user (request → email/deep-link → new password → sign-in with new password only).
- Delete-account path works end-to-end; deleted credentials cannot sign in; client holds no service-role key.
- If the Task 14 transitional session rating map still exists, it is namespaced by signed-in user (and cleared or re-keyed on auth change) so one account cannot read or overwrite another’s in-memory My Rating.

### Task 16: My Rating Persistence And Rated Products

Status: Pending.

Goal: persist the signed-in user’s rating (`private_note` owner-only); ship Account → Rated Products so users can find and reopen products they rated. Do **not** use a direct PostgREST upsert that updates identity columns. Skill: `skills/feature-slice-builder` in **connected-write** mode. If a security-definer helper or other SQL/RLS work is still missing, run a scoped `skills/supabase-schema-change` sub-packet first, then return to connected-write for frontend integration.

Deliverables:
- `saveUserRating` / delete APIs using a **security-definer** helper **or** insert vs score-only update with unique-conflict retry (`23505` → score/private-note-only update) per `docs/API_CONTRACTS.md` — not `from('user_ratings').upsert(…)`. If the preferred definer helper is chosen, it must authorize inside the function (`auth.uid()` only, published-product check, insert with `product_id` + `auth.uid()` then conflict-update scores/`private_note` only, restricted `EXECUTE`) per that contract.
- Frontend rename `comment` → `privateNote` and UI label **Private note** (retire “Comment” on the connected form).
- Connected Rate/Edit enforces the 500-character `private_note` limit before submit.
- Create `app/account/rated-products.tsx` (route already documented in `docs/USER_FLOWS.md`); wire Account → Rated Products → Product Detail.
- `getUserRatedProducts` (and query hook if not deferred to Task 18) returns the signed-in user’s rated products for that list.

Acceptance:
- One rating per user per product enforced.
- Concurrent first saves for the same user/product do not leave an unhandled unique-constraint failure; the final row contains one complete submitted rating (atomic helper or insert→`23505`→score-only update).
- Private note never returned for other users.
- Detail My Rating reflects persisted data after submit; mock session map retired for the connected path.
- Frontend field rename `comment` → `privateNote` and visible **Private note** label land with this task (or an explicit tiny precede packet).
- Connected Rate/Edit form enforces the 500-character `private_note` limit before submit (`maxLength` and/or explicit validation with a clear field error) so oversized notes fail in-form instead of only at the database check.
- Logged-in user can open Rated Products from Account, see products they rated, and navigate to Detail.
- Empty Rated Products state is handled.

### Task 17: Server-Owned Community Aggregates

Status: Pending — **verification and hardening only** (Task 11 already selects and implements the trigger-based refresh mechanism).

Goal: prove the Task 11 trigger-owned Community Score path stays correct under concurrency and forgery attempts; never client-written. Changing the mechanism requires a new superseding ADR and a forward migration — not a Task 17 mechanism re-selection.

Acceptance:
- Insert/update/delete rating refreshes `rating_aggregates` via the Task 11 triggers/helpers.
- Concurrent ratings for the same product leave a correct final `rating_count` / averages (refresh serialized per product; cover concurrent writes in aggregate tests).
- Tests prove clients cannot forge aggregates (no write grants; cannot execute refresh RPC).
- Performance evaluation recorded if refresh cost is a concern; no new mechanism choice unless an ADR supersedes the Task 11 trigger decision.

### Task 18: TanStack Query And Cache Invalidation

Status: Pending — after real reads (Task 14+).

Goal: query hooks, query-key factory, runtime validation for DB responses, structured loading/retry; invalidate product / user-rating keys after rating mutations.

Acceptance:
- Mock fetch paths replaced for connected screens (including Rated Products when present).
- Invalidation list in `docs/API_CONTRACTS.md` is implemented (includes `['ratedProducts', userId]` after rating mutations).
- User-scoped keys include the authenticated account id (`['userRating', userId, productId]`, `['ratedProducts', userId]`); queries stay disabled until `userId` is known; auth transitions clear prior user-scoped cache entries.
- No Redux/Zustand for server state; no optimistic rating mutations in the first backend version.

### Companion: Skill-wrapper validation

Status: Done (2026-07-24).

Added `scripts/check-skill-wrappers.cjs` / `npm run check:skill-wrappers`, wired into `npm run check` and Expo CI. Validates:
- `skills/manifest.json` is the authoritative inventory; canonical `skills/`, both wrapper roots, the `AGENTS.md` Skill Index, and the `docs/LOOP_ENGINEERING.md` **Loop Index** Skill column must match it (Trigger cells must be non-empty and must not carry skill paths; prose outside the table does not count; each data row needs exactly one Skill-cell path);
- each `.agents/skills/*/SKILL.md` and `.claude/skills/*/SKILL.md` has YAML front matter (`name`, `description`);
- front matter is parsed as YAML; `name` / `description` must be non-empty **strings** after trim (rejects null, booleans, and every YAML numeric form including hex/octal/binary/`0x10`);
- declared canonical `skills/<name>/SKILL.md` exists and is referenced;
- agent and Claude wrapper directories stay synchronized and byte-identical.

Converts the PR #13 repair into a durable regression check.
