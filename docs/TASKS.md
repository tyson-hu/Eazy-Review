# Eazy Review Tasks

## Current Repo Status

As of PR #22 review remediation (2026-07-28):
- Expo project exists with Expo Router; NativeWind v4 configured.
- Bottom tabs are Feed, Browse, and Account with placeholder screens.
- Reusable UI primitives exist under `src/components/ui/`.
- Mock products, Product Detail, and Rating Form (Tasks 6–10) use session-only
  fake local rating state — Expo is **not** connected to Supabase yet.
- Local Supabase foundation is in place: core schema migration, deny-by-default
  RLS (no client policies/grants), internal-helper execution revocation, modern
  secret scanning, and passing pgTAP plus same-product insert and fixture-only
  multi-product rating-delete concurrency tests.
- All four Task 11 migrations passed explicitly authorized staging acceptance.
  The fourth forward-only PR #22 review migration orders actual 64-bit
  advisory-lock keys. Task 12 has not started; production was not touched.

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
- Done 2026-07-26: Product Detail/Browse offer payloads stay single-currency
  for MVP (Task 11/13 schema and seed allowlist; Task 14 adapter/filtering);
  cards carry the selected currency instead of hardcoding `$`. Decision:
  [`Keep MVP offer payloads single-currency`](decisions/2026-07-25-keep-mvp-offer-payloads-single-currency.md).
- Done 2026-07-26: **ADR decision governance** — preserved the complete pre-ADR log in one archive, promoted only durable active decisions, generated the compact `docs/DECISIONS.md` index, and added `decisions:build` / `decisions:check`.
- Done 2026-07-26: **PR #14 replacement-stack integration** — independently reviewed, corrected, and merged PRs #15 → #16 → #20 → #17 → #19 → #18. The final #18 composition preserves both skill-wrapper and ADR governance, and no application behavior, dependency, lockfile, Supabase environment, or database state changed.

## Reviewer/Verifier Pilot Results (2026-07-12, Tasks 6-7)

Flow used per task: parent implements -> `reviewer` spec review -> parent applies accepted findings once -> `verifier` runs narrowest checks.

- **Did the reviewer catch meaningful issues rather than repeat existing instructions?** Partially meaningful. Task 6: two real doc-sync findings (stale import path in the `docs/API_CONTRACTS.md` mock snippet; task status not updated) — useful but small. Task 7: three findings, one substantive (missing infinite-scroll placeholder required by `docs/USER_FLOWS.md` — a genuine spec omission the parent missed), one doc-sync, one real code-quality catch (uncleaned duplicate retry timer). No finding merely restated a rule.
- **Did the verifier classify failures accurately?** Yes. Task 6: clean pass, correct skip reasoning. Task 7: caught a real `react-hooks/set-state-in-effect` lint error and classified it caused-by-change with correct evidence; correctly declined to run an interactive flow walk as out of read-only scope. The expo-doctor patch-mismatch failure surfaced on the parent's re-run and was classified pre-existing by the parent.
- **Did delegation reduce parent-context noise without causing excessive handoff work?** Yes for verification (full lint/check output stayed out of parent context; reports were compact). Mildly for review — delegation prompts were long because every context path must be restated, but shorter than reading review context into the parent twice.
- **Did either subagent trigger at inappropriate times?** No. Both ran only when explicitly delegated at the pilot's defined points.
- **Fix-cycle note:** the reviewer-fix-verify sequence surfaced one avoidable loop — the reviewer's accepted retry-timer fix introduced the lint error the verifier then caught. One extra parent fix pass resolved it; within the one-review-fix-pass budget, but worth watching.

## Supabase Tasks (post Task 10)

Mock UX is **GO**. Work these as small sequential milestones, not one large “add
Supabase” task. `docs/DATA_MODEL.md` is the canonical schema and authorization
contract. Task 11 and Task 12 must use separate forward-only migrations.

### Task 11: Environments And Core Schema

Status: **Done.**

Local `supabase start`, `npm run test:db:reset` (clean migration apply + pgTAP
+ concurrency races), and `npm run check:secrets` all passed on branch
`cursor/task-11-supabase-core-schema`. The current local gate has six pgTAP
files, **183** assertions, a same-product insert race, a fixture-only
multi-product rating-delete race, and 22 secret-scanner regressions. Review
hardening detects modern `sb_secret_` keys and privileged JWTs, covers
recognized root and bundled-asset text files (including gitignored root
Expo/EAS configs),
revokes client execution across all six internal helpers, and processes
statement transition tables in stable 64-bit advisory-lock-key order. On
2026-07-28 the authorized staging target received all four Task 11 migrations.
The original
migration, security, trigger, behavior, residue, and lint matrix passed, then
review-remediation re-acceptance confirmed four-migration parity, zero old row
triggers, all three transition-table statement triggers, actual 64-bit
lock-key ordering, continued helper execution denial, a passing
transaction-rolled-back multi-product insert/update/delete smoke, zero fixture
residue, and linked lint with no schema errors. Production was **not** touched.
Expo remains disconnected.

Goal: create local and staging Supabase environments plus the smallest secure
core schema. Do not connect the mobile UI, seed the full catalog, or touch a
production project.

#### Packet 1 — Local Supabase CLI bootstrap (config only)

Added: `supabase/config.toml` (local-only; `project_id = "eazy-review"` is a
local Docker/CLI label, not a hosted project ref),
`supabase/.gitignore`, and Expo-safe `.env.example` fake
placeholders (URL + publishable/legacy anon key only). Pre-existing empty
`supabase/migrations/`, `supabase/functions/`, and `supabase/seed/` placeholder
dirs remain. Seed loading is disabled in config until Task 13. No migration
SQL, tables, RLS, seed data, or mobile client in this packet. The later
human-authorized staging link lives only in gitignored `supabase/.temp/`
metadata; no hosted project reference or credential is committed.

Local CLI commands (Docker required for start/reset; do not run against a
linked remote or production):

```bash
# Start local stack (requires working Docker Desktop / docker.sock)
supabase start

# Stop local stack
supabase stop

# Reset local DB from committed migrations (+ seed when Task 13 enables it)
supabase db reset
# or: npm run db:reset

# Packet 6/7 database tests (pgTAP + race; requires local stack up)
npm run test:db
# Fresh reset then tests:
npm run test:db:reset
```

Install CLI if missing (Homebrew only; never `curl | bash`):
`brew install supabase/tap/supabase`.

Deliverables:

- Committed local Supabase configuration and a separate staging target.
- A versioned migration for `profiles`, `products`, `product_images`,
  `eazy_assessments`, `user_ratings`, `rating_aggregates`, and
  `product_offers`.
- Required constraints from `docs/DATA_MODEL.md`, including:
  `products.is_published`; versioned Eazy assessments with one current row per
  product; one rating per user/product; immutable rating identity; owner-only
  `private_note` capped at 500 characters; deterministic image order; and
  non-negative, finite offer sizes/prices with MVP `US` / `USD` checks.
- RLS enabled on every exposed table in the same migration as table creation.
  The migration explicitly revokes any inherited `PUBLIC`, `anon`, and
  `authenticated` table privileges, then adds no client policies or positive
  client grants.
- Trigger-owned Community Score aggregation using the canonical formula in
  `docs/DATA_MODEL.md`, the `auth.users` → `profiles` creation trigger,
  immutable rating identity, and server-maintained timestamps.
- `handle_new_user` and the aggregate-writing
  `handle_user_rating_change` entrypoint are trigger-only
  `SECURITY DEFINER` functions. They use `SET search_path = ''`, fully
  qualified relations, and explicit `REVOKE EXECUTE` from `PUBLIC`, `anon`,
  and `authenticated`. Timestamp and immutability helpers remain
  `SECURITY INVOKER` unless elevation is proven necessary.
- Expo configuration accepts only the project URL and publishable/legacy anon
  key; no secret or service-role key enters the mobile bundle.
- Secret scanning is wired into the foundation workstream and fails on a safe
  deliberate test pattern.

Acceptance:

- Local reset succeeds from committed migrations; staging is the only remote
  environment used; no production project is accessed.
- Every exposed table has RLS enabled and client roles still have no policies
  or table privileges.
- An auth-user insert creates exactly one matching profile row.
- Aggregate behavior is locally tested for rating insert/update/delete, last
  rating removal, concurrent writes to one product, concurrent fixture-only
  multi-product rating deletes, and product deletion. Product deletion must
  complete without recreating a zero-count aggregate row for the
  deleting/deleted parent or failing its FK cascade.
- Fixed-value tests prove two-decimal arithmetic category/overall averages and
  `score = round(avg(overall) * 10)` from the unrounded mean. The documented
  four-rating rounding-boundary fixture produces `overall_avg = 1.25` and
  `score = 13`; zero ratings produce count `0` and null averages/score.
- New products have a joinable zero-count aggregate row.
- Aggregate/profile helpers are not callable by `PUBLIC`, `anon`, or
  `authenticated`.
- Effective-privilege assertions prove `PUBLIC`, `anon`, and `authenticated`
  have no table access, regardless of inherited defaults.
- No Browse, Detail, Rating, auth-screen, full-seed, or TanStack Query work is
  included.

The exact aggregate SQL is intentionally deferred to Task 11 implementation and
must not be copied from planning pseudocode without the local tests above.

#### Packet 2 — Core table DDL

Added one CLI-created core migration,
`supabase/migrations/20260727213403_task_11_core_schema.sql`, containing the
seven core tables — `profiles`, `products`, `product_images`,
`eazy_assessments`, `user_ratings`, `rating_aggregates`, `product_offers` —
with the checks, unique constraints, foreign keys, and indexes from the Task 11
Schema Contract in `docs/DATA_MODEL.md`. The DDL is byte-identical to that
contract. No extension is created: `gen_random_uuid()` is built into
PostgreSQL 13+ and the product-name GIN index uses built-in full-text search.

Triggers/functions were completed in Packet 3 on this same file. Deny-by-default
RLS and privilege revocation were completed in Packet 4 on this same file.
Secret scanning landed in Packet 5. Packet 6 SQL tests are under
`supabase/tests/database/` and passed after local reset (see Packet 6). No
seed data, no client policies or positive client grants, and no Expo app code
in Task 11. Review hardening later added the separate forward-only migration
`supabase/migrations/20260728001835_task_11_review_hardening.sql`; the applied
core migration was not edited.

#### Packet 3 — Triggers and functions

Appended trigger/function SQL to the same migration
`supabase/migrations/20260727213403_task_11_core_schema.sql`:

- `handle_new_user` — `AFTER INSERT ON auth.users` → `public.profiles (id)`
  only; trigger-only `SECURITY DEFINER`; `SET search_path = ''`; fully
  qualified; `REVOKE EXECUTE` from `PUBLIC` / `anon` / `authenticated`.
- `create_zero_rating_aggregate` — `AFTER INSERT ON products` inserts the
  only zero-count `rating_aggregates` row (`rating_count` 0, null avgs/score);
  direct execution is revoked in the review-hardening migration.
- `handle_user_rating_change` — trigger-only `SECURITY DEFINER` entrypoint on
  `user_ratings` INSERT/UPDATE/DELETE; empty search path; fully qualified;
  `REVOKE EXECUTE` from `PUBLIC` / `anon` / `authenticated`. Packet 3's
  row-level `user_ratings_refresh_aggregates_trigger` is historical; Packet 8
  replaces it with three event-specific statement triggers.
- `refresh_rating_aggregates(product_id)` — inner `SECURITY INVOKER` helper;
  originally used `pg_advisory_xact_lock(hashtext(product_id))` before reading
  ratings; Packet 9 replaces this historical 32-bit mapping with a 64-bit key;
  UPDATEs only when the product row still exists (product-delete cascade
  safe); zero ratings → count 0 / null avgs / null score; category avgs
  `round(avg(col)::numeric, 2)`; `score = round(avg(overall) * 10)` from the
  unrounded mean; sets `updated_at`. Also `REVOKE EXECUTE` from client roles.
- `reject_user_rating_identity_change` — `BEFORE UPDATE` rejects changes to
  `product_id` / `user_id`; direct execution is revoked in the
  review-hardening migration.
- `set_updated_at` — `SECURITY INVOKER` timestamp helper on UPDATE for
  `profiles`, `products`, `eazy_assessments`, `user_ratings`,
  `product_offers` (aggregates via refresh); direct execution is revoked in the
  review-hardening migration.

All six internal functions are non-executable by `PUBLIC`, `anon`, and
`authenticated`; see Packet 7.

No RLS enable, table `REVOKE`/`GRANT`, or policies in this packet (Packet 4).

#### Packet 4 — Deny-by-default RLS and privilege revocation

Appended RLS enable + privilege revocation to the same migration
`supabase/migrations/20260727213403_task_11_core_schema.sql` for all seven
exposed tables (`profiles`, `products`, `product_images`, `eazy_assessments`,
`user_ratings`, `rating_aggregates`, `product_offers`):

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on each table
- `REVOKE ALL PRIVILEGES ON TABLE ... FROM PUBLIC`
- `REVOKE ALL PRIVILEGES ON TABLE ... FROM anon, authenticated`

No `CREATE POLICY` statements. No positive table `GRANT` to `PUBLIC`, `anon`,
or `authenticated`. No optional `service_role` grants. Task 12 policies and
Data API grants stay out of this packet. At Packet 4 close the migration was
still unapplied locally; Packet 6 completed start/reset/test verification.
No remote link.

#### Packet 5 — Secret scanning (validation path)

Added a zero-dependency Node scanner `scripts/check-secrets.cjs` plus
`scripts/check-secrets.test.cjs`. Scripts: `npm run check:secrets` (wired into
`npm run check`) and `npm run test:secrets` (temp-tree plant → fail → remove →
pass). Expo CI runs `check:secrets`. Scans allowlisted tracked text paths,
recognized bundled-asset text formats, plus every recognized root-level text
format, including dynamic Expo/EAS configuration;
fails on the deliberate test token, service-role key assignments with values,
exact-shape modern `sb_secret_` keys, JWTs with a `service_role` role claim,
direct PostgreSQL URLs, database-password assignments, and JWT-signing-secret
or Supabase management-token assignments; JWT inspection includes
`.env.example`. Findings redact matched values. No real credentials committed;
`.env.example` stays fake placeholders only. At Packet 5 close the migration
was still unapplied; staging/production untouched.

#### Packet 6 — SQL tests (authored and locally verified)

Added focused pgTAP tests under `supabase/tests/database/`:

| File | Covers |
| --- | --- |
| `schema.test.sql` | 7 tables; key indexes/constraints/triggers; RLS enabled |
| `profiles.test.sql` | `auth.users` insert → one profile; `handle_new_user` EXECUTE denied |
| `ratings.test.sql` | valid insert; range/unique/`private_note` failures; identity immutable; `updated_at` server-maintained |
| `aggregates.test.sql` | zero row; insert/update/delete refresh; last-rating nulls; fixtures `1.25`/`13` and `6.00`/`5.50`/`55`; product-delete cascade; advisory-lock structural guard |
| `offers_images.test.sql` | negative/non-finite offer values; invalid market/currency; unique `sort_order`; cascades |
| `security.test.sql` | `has_table_privilege` deny for PUBLIC/anon/authenticated; no policies; all six internal helpers deny EXECUTE |

npm scripts: `test:db:pgtap` → `supabase test db --local`;
`test:db:concurrency` → `scripts/test-db-concurrency.cjs`; `test:db` runs both;
`db:reset` → `supabase db reset`; `test:db:reset` → reset then both test
layers. Local `project_id = "eazy-review"` is a CLI label only (not a remote
link).

**Local runtime status (2026-07-27):** After Docker Desktop recovered,
`DO_NOT_TRACK=1 supabase start` succeeded, both Task 11 migrations applied on
reset, and `npm run test:db:reset` reported **All tests successful**
(Files=6, Tests=176, Result: PASS) followed by a passing two-session race.

**Staging runtime status (2026-07-28):** After explicit authorization, CLI
`--help` discovery preceded linking. `supabase db push --linked --dry-run`
listed only the two Task 11 migrations and no seed/role files; the push and
subsequent migration list succeeded. Linked lint reported no schema errors.
Direct staging verification confirmed 7/7 RLS tables, zero policies, zero
prohibited client table privileges, all six helpers with zero prohibited
executions, both required `SECURITY DEFINER` functions, and all nine expected
triggers. Seven transaction-rolled-back profile/aggregate behavior checks
passed with zero fixture residue. The hosted `supabase test db --linked`
runner could not resolve its temporary pgTAP functions and ran zero assertions,
so the already-passing local 176-assertion suite was retained and staging was
verified through the direct catalog/behavior matrix instead. Production was
not contacted.

After PR #22 review remediation, a second explicitly authorized dry run listed
only `20260728115256_prevent_rating_lock_inversion.sql` and no seed/role files.
The push completed and remote history matched all three local migrations.
Catalog re-acceptance found zero old aggregate row triggers, all three expected
statement triggers with transition tables, ordered product iteration in the
trigger helper, and denied `anon`/`authenticated` helper execution. A
transaction-rolled-back two-product rating/delete smoke restored both
aggregates to zero/null; linked lint reported no schema errors and the fixture
left no residue.

#### Packet 7 — Review hardening

- `scripts/check-secrets.cjs` detects the current
  `sb_secret_<22-char-random>_<8-char-checksum>` format anywhere in scanned
  text, including Expo/public assignments; fixtures construct synthetic values
  at runtime and assert redaction.
- `.env.example` receives the same decoded JWT inspection as every other
  scanned file; the fake anon placeholder remains clean, while a synthetic JWT
  whose payload claims `service_role` fails regardless of variable name.
- CLI-created forward migration
  `supabase/migrations/20260728001835_task_11_review_hardening.sql` revokes
  `EXECUTE` from `PUBLIC`, `anon`, and `authenticated` on all six internal
  functions. The security matrix covers every role/function pair.
- `scripts/test-db-concurrency.cjs` opens two overlapping PostgreSQL sessions,
  confirms the second writer waits on `Lock:advisory`, commits the first, and
  asserts the final aggregate includes both ratings.
- These corrections plus the staging evidence above completed the initial Task
  11 acceptance. They do not implement, plan, or otherwise begin Task 12.

#### Packet 8 — PR #22 review remediation

- Secret scanning accepts every recognized root-level text format, with
  regressions for `app.config.ts`, `app.config.js`, and `eas.json`; at Packet 8
  close, the scanner suite passed 18/18.
- CLI-created forward migration
  `supabase/migrations/20260728115256_prevent_rating_lock_inversion.sql`
  replaces the row-level aggregate refresh trigger with insert, update, and
  delete statement triggers. Transition tables provide every affected product;
  `handle_user_rating_change` initially refreshed distinct IDs in stable UUID
  order; Packet 9 corrects ordering to use the actual lock keys.
- The concurrency harness retains the same-product insert race and adds two
  synchronized user-deletion cascades across two products. The old trigger
  reproduced a PostgreSQL advisory-lock deadlock; the new migration lets both
  deletes commit and leaves both aggregate rows at zero/null.
- Local migration apply, 180 pgTAP assertions, both concurrency races, and the
  focused scanner suite pass. Explicitly authorized staging application and
  re-acceptance passed as recorded in Packet 6. Production was not contacted.

#### Packet 9 — PR #22 second review remediation

- CLI-created forward migration
  `supabase/migrations/20260728162303_order_rating_advisory_lock_keys.sql`
  maps each affected product to the 64-bit `hashtextextended` key used by
  `pg_advisory_xact_lock`, orders those actual keys, and keeps product ID only
  as a deterministic collision tie-breaker. The first three applied migrations
  remain unchanged.
- The concurrency harness deletes only deterministic fixture
  `public.user_ratings` rows; it never deletes `auth.users`, including cleanup.
  Fixture users are reused with `ON CONFLICT DO NOTHING`.
- Candidate enumeration supplements Git with every recognized root text file
  present on disk, so gitignored `app.config.ts`, `app.config.js`, `eas.json`,
  `.npmrc`, and `.editorconfig` remain scanned.
- Dependency lockfiles are scanned for high-confidence credentials. Direct
  PostgreSQL connection strings and database-password assignments also fail
  with redacted findings, preserving the permanent Expo credential boundary.
- PostgreSQL 17.6 directly rejects `Infinity` for the precision-constrained
  `numeric(4,1)` size and `numeric(10,2)` price columns with SQLSTATE `22003`.
  Two pgTAP regressions now preserve that finite-value contract; no redundant
  constraint migration was added.
- At Packet 9 close, local acceptance was 183 pgTAP assertions, both
  concurrency races, and 18/18 secret-scanner regressions. Explicitly
  authorized staging
  application/re-acceptance passed on 2026-07-28 with migration parity,
  catalog/security checks, transaction-rolled-back multi-product behavior,
  zero fixture residue, and linked lint. Production was not contacted.

#### Packet 10 — PR #22 JWT signing-secret review remediation

- Secret scanning rejects non-empty assignments to established Supabase,
  GoTrue, and generic JWT signing-secret variable names across `.env`
  assignments, JavaScript object properties, and quoted JSON/EAS keys.
- Empty assignments remain allowed, findings redact matched values, and all
  fixtures remain synthetic. At Packet 10 close, the scanner suite passed
  19/19.
- This review correction changes no migration, database environment, Expo
  runtime, client policy, or Data API grant. Task 12 remains pending, and
  staging/production were not contacted.

#### Packet 11 — PR #22 third secret-scanner review remediation

- Database-password detection covers quoted JSON/EAS keys in addition to
  `.env` and JavaScript assignment forms.
- Supabase access/management-token assignments fail for private and
  accidentally Expo-public variable names, including quoted JSON/EAS keys.
- Recognized text files under bundled `assets/` are scanned while image, font,
  and other binary extensions remain excluded.
- Each confirmed review finding has a synthetic redaction regression; the
  current scanner suite passes 22/22.
- This review correction changes no migration, database environment, Expo
  runtime, client policy, or Data API grant. Task 12 remains pending, and
  staging/production were not contacted.

### Task 12: Policies, Data API Grants, And Authorization Tests

Status: **Pending.** Task 11 is accepted; no Task 12 work has started.

Goal: add complete RLS policies, then explicit least-privilege Data API grants,
then prove unauthorized scenarios fail.

Deliverables:

- A new forward-only migration; do not edit or extend Task 11's applied
  migration.
- Published-catalog policies for products and related images, current Eazy
  assessments, aggregates, and offers.
- Owner-only `user_ratings` policies; insert/update also require a published
  product, while an owner may still delete an existing rating after unpublish.
- Public profile reads and owner-only updates of mutable profile fields; no
  client profile insert.
- `REVOKE ALL PRIVILEGES` from `PUBLIC`, `anon`, and `authenticated` on each
  client-facing table before rebuilding the explicit allowlist in
  `docs/DATA_MODEL.md`.
- Column-level profile and rating write grants. Rating identity and audit
  columns are never client-updatable; aggregate rows remain client read-only.
- Authorization tests and effective privilege-inventory assertions using
  `has_table_privilege` / `has_column_privilege`.

Required scenarios:

- Anonymous users can read published catalog rows and cannot read unpublished
  products or their related rows.
- Anonymous users cannot create ratings.
- An authenticated user can read/create/update/delete only their own rating and
  cannot rate an unpublished product.
- A user cannot read another user's `private_note` or change another user's
  rating.
- Clients cannot insert profiles, rewrite identity/audit columns, write
  aggregates, or execute trigger-only helpers.
- Intended access fails without its explicit grant, proving grants and RLS are
  separate controls.
- `PUBLIC` contributes no effective access; `anon` / `authenticated` match the
  allowlist exactly.
- A server-only `service_role` client has the exact positive table privileges
  in `docs/DATA_MODEL.md`, can exercise rating writes and their aggregate
  trigger side effects, and its secret never appears in the Expo bundle.

### Task 13: Product Seed Data

Status: Pending.

Goal: seed one or two representative products first; expand toward the eight-product mock catalog only after the small seed is trusted.

Acceptance:
- Seed SQL (or approved script) loads into local reset and staging.
- Every seeded product has a matching `rating_aggregates` row created by the
  Task 11 product-insert trigger (zero-count when no ratings yet). Seed/import
  code verifies that row but never inserts or updates aggregates directly. No
  published product relies on a missing summary join.
- Seeded / imported `product_offers.currency` and `product_offers.size_region` values are trimmed, uppercased, and inside each schema whitelist (MVP: `USD` / `US` only); never insert `NULL`, `''`, or arbitrary codes that bypass `default 'USD'` / `default 'US'`.
- Image strategy decided: use approved HTTP(S) / Storage URLs in
  `product_images`, or leave images absent so Task 14 maps `imageUrl: null` and
  shows the existing placeholder. Do not persist the mock-only
  `mock-product://` scheme as connected catalog data.
- Seeded `product_images` use deliberate unique `sort_order` values per product (schema unique `(product_id, sort_order)`).
- Populate only provenance/timing fields that exist in the Task 11 schema:
  `eazy_assessments.methodology_version` and
  `product_offers.last_checked_at` when applicable. A future `source_type` or
  rights-provenance column requires its own schema-contract change; Task 13 must
  not invent one.

### Task 14: Real Browse And Product Detail Reads

Status: Pending.

Goal: replace mock product reads for Browse and Product Detail. Rating writes stay mock/session until Task 16. Skill: `skills/feature-slice-builder` in **connected-read** mode (no migrations/RLS — those stay in `skills/supabase-schema-change`).

Deliverables:
- Browse and Product Detail load published catalog rows from Supabase (not `mockProducts` / `getMockProductDetailById` for those screens).
- **Primary image mapping:** flatten `product_images` to a single `imageUrl` using `sort_order ASC`, then `created_at ASC`, then `id ASC`; products with no images → `null`. Selection must be stable across repeated reads.
- **Offer currency (MVP):** each product’s offer payload is single-currency. Omit or reject mismatched-currency offers before computing lowest price; never take a raw numeric minimum across currencies (`docs/API_CONTRACTS.md`). Browse `ProductCardData` must carry that same selected currency as `lowestPriceCurrency` (with `lowestPrice`) so cards do not hardcode `$`.
- **Rate/Edit compatibility adapter (required in this task):** Detail will navigate with real product UUIDs, but rating persistence stays session-only until Task 16. Do **not** leave the rate route bound only to `getMockProductDetailById` / `saveMockMyRating` against `mockProducts` keys — that rejects every UUID and blocks Task 15’s “logged-in user reaches the form” path.
  - Load rate-screen product context from the same real product/detail repository used by Detail (or a thin adapter over it).
  - Keep connected catalog/detail reads viewer-independent as
    `ProductDetailPublicData`; compose transitional My Rating state outside that
    public payload.
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
- **Delete account:** logged-in Account Delete Account action with destructive confirmation (and reauthentication if the provider requires it); protected server-side deletion (never a service-role key in the Expo bundle); defined cascade / anonymization / retention for `profiles`, `user_ratings`, and related rows; local session/cache cleanup. Supply a documented human-run end-to-end check that confirms the deleted account can no longer sign in. Coding agents and MCP/tools must not execute the destructive account-deletion step on any environment.
- **Delete-current-user boundary:** the protected server verifies the bearer
  session, derives the target id only from that caller (no authoritative
  client-supplied user id), calls Auth Admin global sign-out with the verified
  caller JWT, then hard-deletes that same auth user with a server-only secret.
  Never write directly to `auth.sessions`; failed revocation aborts before
  deletion. `profiles` and `user_ratings` cascade with no MVP retention copy;
  affected `rating_aggregates` remain and are recomputed by the existing
  trigger path.
- **Session/JWT handling:** record a configured JWT expiry of at most one hour.
  Session revocation stops refresh immediately but does not falsely claim to
  invalidate already-issued JWTs before expiry; sensitive server endpoints
  validate `session_id` against a live Auth session when immediate rejection is
  required.

Acceptance:
- Sign up / sign in / sign out / session persistence.
- Sign-up creates exactly one `public.profiles` row for the new `auth.users` id
  (via Task 11 `handle_new_user`); the logged-in Account screen can read that
  row. Optional mutable avatar / display name / username fields may be null
  until edited; joined date maps from non-null `profiles.created_at`.
- Logged-out Rate CTA becomes sign-in gate; logged-in user reaches the form.
- Account screen reflects auth state without Feed/social scope growth (including Forgot Password when logged out and Delete Account when logged in).
- Password recovery path works end-to-end for an email user (request →
  email/deep-link → verified `PASSWORD_RECOVERY` session → new password →
  sign-in with new password only). Direct route navigation, an ordinary
  signed-in session, and expired/invalid links cannot update a password.
- Delete-account implementation and non-destructive tests pass; a human performs
  and records the destructive end-to-end check (delete → cleared local
  session/cache → a second pre-existing session cannot refresh → deleted
  credentials cannot sign in). The check records the configured residual JWT
  lifetime and confirms protected access ends within that bound. An agent must
  not self-complete this acceptance item by deleting an account through the
  app, MCP, SQL, or an admin API. The client holds no service-role key.
- Mocked non-destructive tests prove Auth Admin receives the verified caller
  JWT with `global` scope and user deletion is not called when revocation fails.
- The same human-run local/staging checklist proves the deleted user's profile
  and ratings are gone, affected aggregates are recomputed correctly (including
  last-rater removal), and unrelated users/products remain.
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
- `['product', productId]` contains public `ProductDetailPublicData` only.
  Product Detail composes `myRating` from the separate user-scoped query; no
  viewer-owned rating or private note is cached under a shared product key.
- No Redux/Zustand for server state; no optimistic rating mutations in the first backend version.
