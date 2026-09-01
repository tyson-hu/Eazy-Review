# Staged Codebase Simplification Plan

Status: **Packets S1, E1, and E3 are complete locally; E1 and the separately
addressed Account/Profile P2 have human acceptance, no other simplification
packet has started, and Android is explicitly out of the current plan.**

Base SHA: `db27309005e14d80f67df9bfe9cb4debd6dd47b6`

Planning branch: `codex/codebase-simplification-program`

Proposed decision:
`docs/decisions/2026-08-30-staged-codebase-simplification.md`

## Objective

Reduce accidental maintenance obligations without changing the Eazy Review
product flow, weakening a boundary, rewriting history, or replacing old
complexity with new coordination. Process one proved ownership boundary at a
time so later sessions and agents can resume from repository state rather than
chat history.

## Authority and stop conditions

- This plan records work; it does not itself authorize implementation, commit,
  push, PR lifecycle changes, deployment, hosted configuration, migration,
  account deletion, or production access.
- A human selected S1 on 2026-08-31 and later authorized its scoped commit.
  A later human message selected and authorized local E1 implementation at
  `0ade2942990486d946b0fb8ba2d3817ff1590b96`, then authorized one local commit
  for completed E1 and the separately approved tab-root correction. On
  2026-08-31 the human separately accepted the Account/Profile P2 physical
  recheck and authorized one local completion commit for that follow-up. On
  2026-08-31 the human selected local E3 implementation and later authorized
  its local completion commit. Push, PR lifecycle work, deployment, hosted
  configuration, database work, and production access remain unauthorized.
- Before a batch, a human selects its candidate and accepts every listed
  capability loss. One candidate is the default batch size.
- Stop when a real or unresolved dynamic consumer exists, a baseline cannot
  expose the proposed regression, or the cut crosses another ownership
  boundary.
- Do not modify applied migrations, security or authorization mechanisms,
  account-deletion/recovery coordination, generated files by hand, historical
  evidence, or request timeout/cancellation behavior as incidental cleanup.
  E1 below is an explicit ownership-convergence proposal, not permission to
  weaken that contract.
- Changes to canonical skills or their manifest require the separate
  `skills/skill-creator` approval gate. Generate wrappers; never edit them by
  hand.
- Agents and tools never execute account deletion in any environment.

## Coverage and evidence baseline

The initial audit and this extended pass inspected route entrypoints; product,
rating, account, Auth, query, environment, splash, and network modules;
frontend tests and support code; Supabase migrations, seed, concurrency tests,
and Edge Function boundaries; dependencies, Expo config, scripts, generated
documentation, skill wrappers, current decisions, session notes, and retained
evidence. It did not run a device build, inspect unknown external consumers, or
authorize a cut.

Current repository proof at the S1 planning baseline (`839ce4fc`):

- The production import graph contains 85 modules and 15 route entrypoints.
  Outside the candidates already recorded as S1, S2, and L1, no additional
  production module is unreachable from those entrypoints.
- `npm run typecheck` and `npm run lint` pass. A stricter TypeScript unused-symbol
  probe reports only the already-listed starter helper parameter and one test
  fixture parameter; neither establishes a new production packet.
- Direct-import absence was not treated as dependency proof. Expo/router peers,
  platform packages, build scripts, config plugins, and generated owners were
  checked before classifying a package as unused.

### Extended coverage map

| Area | Result of the extended pass |
| --- | --- |
| Routes and screen UI | No new whole-screen deletion. Similar loading, paused, empty, and error branches carry different public/private/auth semantics; a generic state component would add options rather than remove ownership. |
| Catalog and connected requests | E1: catalog duplicates the accepted shared deadline/cancellation owner. E2: catalog, ratings, and Auth duplicate error-shape extraction. |
| Auth, recovery, and account deletion | E3 finds obsolete proxy tests and E5 finds one dead alias. The provider, guarded storage, recovery queue, and Edge Function remain protected trust/concurrency boundaries. |
| Test and bootstrap support | E3 can retire 182 lines of redundant/proxy coverage. E4 is a one-caller splash relay that is too small for a standalone packet. |
| Supabase schema and tooling | No safe new cut. Applied migrations, least-privilege history, seed boundaries, database concurrency probes, and generated types retain distinct owners. |
| Dependencies, assets, and Expo config | No new candidate beyond S1–S3. Packages without direct app imports are peer, platform, development-build, or operational owners. |
| Scripts, docs, and generated artifacts | The task-graph parser replacement is already a deferred infrastructure task, not a second simplification packet. Generated indexes/wrappers and resolved notes retain their documented lifecycle. |

## Kanban portfolio

This board records planning and packet status; it is not execution authority.
S1, E1, and E3 are complete locally, and no other packet is in progress.
Priority ranks expected value and sequencing only: P1 is high-value, P2 is
worthwhile after stronger cuts, and P3 is fold-only housekeeping. Difficulty
reflects coordination and proof burden: XS is one local symbol/file, S is one
owner with focused tests, M crosses live modules or contracts, and L needs
product/skill approval or native proof.

| Lane | Priority | ID | Potential work | Benefit | Confidence | Difficulty | Gate or next move |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Implemented | P0 | S1 | Remove Create Expo starter subtree, sample font, and unused direct dependencies/config | High | Contract | M | Web/iOS pass; Android explicitly out of the current plan |
| Complete locally | P1 | E1 | Route catalog requests through the existing shared deadline/cancellation owner | High | Contract | M | Human acceptance and local commit complete; remote lifecycle remains unauthorized |
| Ready, unselected | P2 | E2 | Share only identical SDK/network error-shape extraction across catalog, ratings, and Auth | Medium | Contract | M | Keep every domain normalizer and transport policy separate |
| Complete locally | P2 | E3 | Retire redundant/proxy Auth and test-harness suites after moving the few real assertions to owner suites | Medium | Contract | S | Local completion commit is complete; remote lifecycle remains unauthorized |
| Decision required | P1 | S2 | Retire mock-era product detail contract and bundled fixture assets | Very high | Contract | L | Explicit capability choice plus skill-file approval if affected |
| Proof first | P2 | S3 | Remove `react-native-url-polyfill` over Expo WinterCG URL | Medium | Static | L | Boot-order probe and web/iOS/Android cold-start proof |
| Fold only | P3 | E4 | Inline the one-caller splash-dismiss relay and retire its proxy test | Low | Static | M | Only with layout/bootstrap work and boot-equivalence proof |
| Fold only | P3 | L1 | Remove dead `RatingRow` and tiny candidate-exclusive exports | Low | Static | XS | Fold into the packet that owns the surrounding contract |
| Fold only | P3 | E5 | Remove dead `reconcileGuardedSignedOutEvent` alias and stale test mock entry | Low | Static | XS | Task 19 is accepted/merged; fold into future Auth-owned work after a fresh consumer map |
| Retain | — | U1 | Temporary iOS CNG compatibility plugin | Potentially high | Incomplete | L | Revisit only at the accepted ADR's same-device no-plugin A/B trigger |
| Retain | — | R1 | App/runtime JWT decoders | Low potential | Conflicting contracts | M | Keep fail-closed environment and guarded-session parsing separate |
| Owned elsewhere | — | I1 | Replace Markdown task-graph parsing with structured config | High | Existing task | L | Follow the deferred Agent infrastructure checker v2 task |

S1, E1, and E3 were selected and completed locally. E2 remains ready but
unselected. S2 and S3 do not enter a ready lane until their stated
decision/proof gates pass. P3 items do not justify standalone work.

## Packet S1: remove the starter subtree

### Baseline burden and reachability

- The following files total 199 lines and have no consumer from `app/`,
  `src/`, or the test suites:
  - `components/EditScreenInfo.tsx`
  - `components/ExternalLink.tsx`
  - `components/StyledText.tsx`
  - `components/Themed.tsx`
  - `components/useClientOnlyValue.ts`
  - `components/useClientOnlyValue.web.ts`
  - `components/useColorScheme.ts`
  - `components/useColorScheme.web.ts`
  - `constants/Colors.ts`
- `assets/fonts/SpaceMono-Regular.ttf` is a 92 KB sample font used only by the
  unreachable `MonoText` helper.
- `expo-web-browser` is imported only by the unreachable `ExternalLink`.
  `expo-status-bar` has no application consumer. Their no-argument config
  plugin entries do not establish a surviving app contract at the pinned
  versions.
- Keep the `expo-font` dependency because Expo packages still consume it, but
  remove its empty app plugin entry unless a real configured font remains.

### Authorized cut when selected

1. Capture a clean baseline and exact consumer search.
2. Delete the nine source files and `SpaceMono-Regular.ttf`.
3. Remove direct `expo-web-browser` and `expo-status-bar` dependencies, their
   lock entries through the package manager, and the three empty app plugin
   entries.
4. Do not add replacement theme, external-link, or font abstractions.
5. Update only documents reported or semantically affected by the final path
   set.

Behavior surrendered: the unused starter theme helpers, starter external-link
behavior, and SpaceMono sample. Current product routes and UI retain their
existing behavior.

### Decisive proof and validation

```bash
rg -n "EditScreenInfo|ExternalLink|MonoText|Themed|useClientOnlyValue|useColorScheme|SpaceMono|expo-web-browser|expo-status-bar" \
  app src components constants package.json app.json
npm run typecheck
npm run lint
npm test -- --runInBand
npm run check:agent-infra
git diff --check
```

Resolve Expo config and smoke web plus iOS startup before claiming equivalence
within the current human-selected plan. Android proof is required only if
Android returns to scope. Undo is the single S1 diff or commit; there is no
data or hosted-state restoration.

### S1 operation receipt — 2026-08-31

- **Scope:** local S1 implementation only. No other packet, product flow,
  route, public prop, security/Auth/Supabase boundary, hosted state, or remote
  lifecycle action changed.
- **Baseline:** at `839ce4fc`, the exact consumer map found only the starter
  subtree's internal imports, package/config ownership, planning/history
  references, and one infrastructure-test path used as an arbitrary unrelated
  report input. The pre-change `npm run check` gate passed.
- **Retired obligation:** nine unreachable starter source files (199 lines),
  the 92 KB SpaceMono sample font, direct `expo-web-browser` and
  `expo-status-bar` ownership, their lock entries, and three no-argument config
  plugins. `expo-font` remains because Expo packages consume it.
- **Artifacts:** `app.json`, `package.json`, and `package-lock.json` now carry
  the surviving owners only. Deleting the last root `components/` source
  exposed Expo CLI 57's empty-target lint failure; the existing lint script now
  passes ESLint's native `--no-error-on-unmatched-pattern` flag without
  excluding any existing or future source file.
- **Realized net effect:** the starter subtree, font, two direct dependencies,
  and three empty plugins are gone with no replacement abstraction. Current
  application routes keep their existing implementation.
- **Behavior:** surrendered only the unreachable starter theme, external-link,
  and SpaceMono sample behavior. No current product behavior is intentionally
  changed.
- **Verification:** the decisive search has no match in `app/`, `src/`,
  `components/`, `constants/`, `package.json`, or `app.json`; typecheck and
  lint pass; 42 frontend suites and 496 tests pass; all 56 agent-infrastructure
  tests pass; pre- and post-change `npm run check` pass with 21/21 Expo Doctor
  checks and aligned dependencies; route preparation creates no tracked
  `tsconfig.json` drift; web export builds 16 routes and live `/browse` returns
  200 after bundling; the iOS 26.5 simulator launches the current-tree
  development build and completes its 1,873-module bundle.
- **Residual risk:** Android startup is intentionally skipped because the human
  excluded Android from the current plan on 2026-08-31. No Android result or
  Android runtime-equivalence claim is made; add that proof only if Android
  returns to scope. Existing Jest React `act(...)`, open-handle, and Supabase
  lock deprecation warnings remain visible and unchanged.
- **Retained candidates:** E1 is complete locally. E2 remains ready but
  unselected; S2 still requires a capability/skill decision; S3 still requires
  its native proof; E4, L1, and E5 remain fold-only; U1 and R1 remain retained.
- **Undo:** discard or revert the single S1 diff. No data, hosted state, or
  production restoration exists.

## Packet S2: retire the mock-era product contract

### Current burden and reachability

- `mockProducts.ts` (116 lines), `mockProductDetails.ts` (259), and
  `mockProductImages.ts` (34) total 409 lines. Their only production-tree
  relationship is internal to that disconnected fixture set.
- Current catalog tests use scoped catalog/view-model fixtures instead. Browse
  and Product Detail use connected queries.
- Eight files under `assets/images/products/` total about 3.1 MB and are
  referenced only by the disconnected mock image resolver. The seed URL for
  the Air Force 1 image points to a pinned historical commit, not the current
  branch copy.
- `Product` still carries mock-era detail summary fields; `ProductOffer`,
  `ProductDetailData`, and `RatingBreakdown.comment` serve the old fixture
  representation. `adaptProductDetail` republishes image, assessment, rating,
  and offer facts both inside `Product` and in dedicated siblings, and the
  detail route retains a matching fallback.
- Preserve `ProductDetailPublicData`, `VerifiedProductOffer`, scoped test
  fixtures, and the accepted separation between public product cache and
  viewer-owned My Rating.

### Capability choice required

Selecting S2 gives up the globally available eight-product mock catalog and
its `mock-product://` image scheme. Future tests and isolated examples use
purpose-built fixtures for their actual view model. If product or training
work still requires the global mock journey, retain S2.

### Authorized cut when selected

1. Re-run the full consumer map, including documentation, string protocols,
   dynamic imports, tests, seed URLs, and Git history.
2. Delete the three legacy fixture modules and their eight candidate-exclusive
   images.
3. Remove only candidate-exclusive product fields and types. Keep public
   catalog, Eazy assessment, Community summary, verified offer, and private My
   Rating contracts intact.
4. Make `ProductDetailPublicData` the one live detail representation: stop
   duplicating image, score, count, and price summaries into `Product`, then
   remove the route fallback that exists only for the duplicate fields.
5. Remove `RatingRow` only if its final consumer map is still empty; fold its
   design/skill references into this packet rather than opening L1 separately.
6. Update `docs/API_CONTRACTS.md`, `docs/DESIGN.md`, and `docs/TASKS.md` where
   affected. Obtain explicit skill-file approval before changing
   `product-data-modeling`, `feature-slice-builder`, or `ui-screen-builder`,
   then regenerate and verify both wrapper trees.
7. Leave historical archive and evidence records unchanged.

### Decisive proof and validation

Add or retain one adapter/route test proving a connected complete product and a
sparse product render from the single live detail representation. Then run:

```bash
rg -n "mock-product://|mockProducts|getMockProductDetailById|mockProductImages|ProductDetailData|ProductOffer|RatingRow" \
  app src docs skills
npm run typecheck
npm run lint
npm test -- --runInBand
npm run check:skill-wrappers
npm run check:agent-infra
git diff --check
```

Also smoke Browse, complete Product Detail, sparse Product Detail, signed-out
rating CTA, and signed-in My Rating restoration. Undo is the single S2 diff or
commit; the removed files have no data migration or hosted-state effect.

## Packet S3: prove and remove the duplicate URL polyfill

### Current burden and uncertainty

- `src/lib/supabase/client.ts` is the only repository import of
  `react-native-url-polyfill/auto`.
- At the pinned Expo SDK 57 version, Expo's native bootstrap installs its
  WinterCG `URL` and `URLSearchParams`; the additional package then overwrites
  those globals when the Supabase singleton loads.
- Repository-static ownership is clear, but a unit test alone cannot prove
  native module evaluation order for every supported entry path.

### Proof-first cut when selected

1. Before deletion, add the smallest boot-level probe that fails if valid and
   invalid URL parsing are unavailable before the Supabase singleton is
   constructed. Do not add a wrapper around `URL`.
2. Verify current web, iOS, and Android entrypoints use the Expo bootstrap.
3. Remove the import and dependency only if the probe and native cold-start
   checks pass without it.
4. If any entry path evaluates the client first, retain the package and record
   that consumer; do not invent another compatibility layer.

Behavior surrendered: the Supabase client module no longer self-installs URL
globals when imported outside the Expo application entry contract.

### Decisive proof and validation

Run the focused public-environment, Supabase-client, auth redirect, and recovery
URL tests; typecheck, lint, full frontend tests, web export/config resolution;
then cold-start iOS and Android and exercise sign-in plus recovery/deep-link
parsing. Report native device/simulator coverage separately from automated
checks. Undo is the single S3 diff or commit.

## Extended finding E1: converge catalog request deadlines

### Candidate, burden, and reachability

`src/features/products/api.ts` owns a private `DEFAULT_CATALOG_TIMEOUT_MS`,
abort and timeout errors, timer/listener cleanup, an `AbortController`, and a
three-way `Promise.race` in `runCatalogRequest`. The live
`src/lib/network/requestTimeout.ts` helper owns the same lifecycle for ratings
and declares that its ten-second default covers catalog and ratings. The
accepted connected-request reliability decision also places shared connected
request utilities under `src/lib/network/`.

This is two live implementations of one reliability obligation, not dead code.
The catalog copy remains reachable through both Browse and Product Detail.

### Cut and consequence when selected

1. Use `withRequestTimeout` and `DEFAULT_REQUEST_TIMEOUT_MS` from the existing
   shared owner; do not add a second adapter or request framework.
2. Remove only the catalog timer/controller/listener implementation and its
   private error constructors.
3. Teach the catalog normalizer to translate `RequestTimeoutError` to its
   existing `CatalogError('timeout')` contract.
4. Preserve external query cancellation as cancellation: a caller-aborted
   request must not become a retryable timeout or user-visible catalog failure.

No product capability is surrendered. The observable catalog timeout message,
ten-second default, underlying transport abort, one-retry policy, and silent
navigation/query cancellation remain unchanged.

### Confidence, risk, proof, and net effect

Confidence is contract-level because both implementations and their tests are
local. Risk is medium: a superficially smaller edit could misclassify external
abort or let the transport's abort rejection win as a generic server error.

The decisive proof is the combined catalog API, catalog error, product-query,
and shared request-timeout suites covering success, deadline, an abort-aware
transport rejection, already-aborted and later-aborted caller signals, timer
cleanup, catalog retry classification, and fixed presentation copy. Then run
typecheck, lint, the full frontend suite, and `git diff --check`. Smoke Browse
and Product Detail under reachable, timed-out, offline, and navigation-cancelled
conditions before claiming runtime equivalence.

Net effect: one deadline/cancellation lifecycle owner and one domain mapping,
with no new abstraction and no weaker error boundary. Undo is the single E1
diff or commit.

### E1 lifecycle and race contract

| Event | First owner or predecessor | Terminal result | Late event and cleanup |
| --- | --- | --- | --- |
| Success | Supabase transport resolves before either abort source | Adapted catalog data | Deadline and caller listener are cleared |
| Deadline | Shared ten-second timer fires first | `RequestTimeoutError` becomes `CatalogError('timeout')` | Combined signal aborts the transport; a later transport rejection cannot replace timeout |
| Caller abort before work settles | Caller signal is already aborted | Non-domain cancellation remains silent and non-retryable | Combined signal is aborted; deadline is cleared |
| Caller abort during work | Caller signal fires before the deadline | Non-domain cancellation remains silent and non-retryable | Underlying transport is aborted; deadline and listener are cleared |
| Abort-aware transport rejection | Transport rejects because the combined signal aborted | The first abort owner decides timeout versus caller cancellation | Transport rejection cannot reclassify the winning terminal event |
| Competing terminal events | Deadline, caller, transport, or success reaches the shared race first | Exactly one terminal result | Late settlements are ignored; deadline-first remains timeout even if caller state changes before API normalization |
| Cleanup | Any terminal path enters the shared helper's `finally` | Original terminal result is preserved | Timer and external listener are removed once |

### E1 operation receipt — 2026-08-31

- **Scope:** local E1 implementation only, based on tracked-clean
  `0ade2942990486d946b0fb8ba2d3817ff1590b96`. No other packet, shared-helper
  source, route, rating, Auth, dependency, Expo configuration, schema,
  migration, generated file, hosted state, or remote lifecycle action changed.
- **Baseline:** the focused catalog API/error/query and shared-timeout suites
  passed 28/28 tests; typecheck and lint passed; the full frontend suite passed
  42/42 suites and 496/496 tests; `check:readonly` passed.
- **Retired obligation:** `DEFAULT_CATALOG_TIMEOUT_MS`, `abortError`,
  `timeoutError`, and both `runCatalogRequest` call paths, including the
  duplicate controller, timer, external listener, terminal race, and cleanup.
- **Artifacts:** `src/features/products/api.ts` now sends both Supabase catalog
  requests through the existing `withRequestTimeout` owner.
  `src/features/products/errors.ts` maps its existing `RequestTimeoutError` to
  the existing catalog timeout contract. Owner-level regressions live in the
  existing catalog API/error and shared-timeout suites; the product-query suite
  is unchanged after deletion-first review found no missing owner assertion.
- **Realized net effect:** production code is 55 lines smaller
  (`api.ts` −56, `errors.ts` +1). Tests add 89 proof lines, so the complete
  code/test diff is +34 lines while removing one reachable production
  lifecycle owner. No adapter, configuration layer, error code, dependency, or
  replacement abstraction was added.
- **Behavior:** the ten-second deadline, underlying Supabase abort, existing
  `CatalogError('timeout')` mapping and fixed presentation copy, at most one
  automatic retry, distinct offline/server classifications, and silent
  non-retryable caller/navigation cancellation are preserved. Deadline-first
  remains timeout even when abort-aware transport rejection wins locally.
- **Verification:** after the review correction, the identical focused command
  passed 4/4 suites and 33/33 tests; typecheck and lint passed; the full
  frontend suite passed 42/42 suites and 501/501 tests; `check:readonly`, the
  removed-owner residue search, and `git diff --check` passed. Live 393×852 web
  smoke passed reachable Browse and Product Detail, cached offline copy,
  fixed timeout UI with exactly one retry and aborted underlying requests, and
  navigation cancellation with one aborted request, no retry, and no catalog
  error UI. A cold development-build walk on `Eazy-Review-iPhone-15` (iOS
  26.5) then passed against the linked, `ACTIVE_HEALTHY`
  `eazy-review-staging` project. A read-only anonymous Data API preflight
  returned its two published H2 fixtures; the simulator constructed the
  staging project client, rendered both staging-only Browse cards, opened both
  distinct Product Details, and returned through the real Back stack with no
  runtime error. The local `.env` files were isolated only for that process and
  restored with matching checksums. A later agent-observed physical rerun on
  an iPhone 17 Pro Max (iOS 27.0, installed Expo development build) passed the
  online local-Docker and staging lanes. Each target rendered its distinct
  anonymous Browse rows, both Product Details loaded, Product Detail Back
  returned to Browse, cold Browse Back stayed on Browse, and Feed → Browse →
  Back stayed on Browse. No hosted configuration or data changed. Independent
  deletion-first review and final read-only verification passed.
- **Residual risk:** agent-run iOS staging proof covers reachable anonymous
  catalog reads and native navigation, while its timeout, offline, and request-
  cancellation runtime proof remains web/automated; later human physical
  acceptance is recorded below. Android, Deno, database, and Edge Function
  checks were not run; Android was expressly excluded and the other lanes do
  not own this catalog-only refactor. No
  durable screenshots were added because E1 forbids new files; three temporary
  simulator captures remain under
  `/private/tmp/eazy-review-e1-ios-staging-smoke.n6qx6S/`. A diagnostic printed
  the local-only anon token while proving `.env.local` precedence; no staging,
  service-role, or production credential was printed. The local credential was
  then rotated without a database reset: the former token returns `401`, the
  fresh public key returns both seeded catalog rows, the same signing secret
  survives a preserving stop/start from a private mode-600 host file outside
  the checkout, and `check:secrets` passes. The human reports the current
  local-target physical offline/reconnect lane as `tested-pass` on 2026-08-31;
  this lane was not agent-observed. The Account/Profile offline state took
  about five minutes to appear. That latency was recorded outside E1's catalog
  owner and was later addressed under separate authorization: Account now
  presents the existing reactive offline state immediately, and its profile
  read uses the shared ten-second deadline/cancellation owner. Focused
  automated proof passes, and the requested physical offline/reconnect recheck
  is `tested-pass` by human report on 2026-08-31. The P2 finding is solved
  locally. The separate follow-up does not change E1 completion. Existing
  React `act(...)`, Jest
  open-handle/forced-exit, Supabase lock deprecation, and npm proxy warnings
  remain non-gating. Private error-object and nested-cause identity without a
  consumer are not claimed.
- **Retained candidates:** E2 remains ready but unselected; S2 still requires a
  capability/skill decision; S3 still requires native proof; E4, L1, and E5
  remain fold-only; U1 and R1 remain retained.
- **Undo:** revert the local completion commit. No data, hosted configuration,
  database, deployment, or production restoration exists.

### Authorized post-E1 tab-root correction — 2026-08-31

- **Scope:** the human separately authorized the Browse/Feed Back correction
  after E1. This does not select another simplification packet or authorize a
  commit, remote lifecycle action, hosted configuration, database work, or
  production access.
- **Root cause and correction:** Expo Router's installed tab owner defaulted to
  Feed as both the first route and the Back target. After that was corrected,
  cold `/` startup still linked the root `(tabs)` anchor plus `index`; the
  component redirect then replaced `index` with another `(tabs)` entry, making
  the first native Back look like Browse → Browse. The tab navigator now uses
  `initialRouteName="browse"` and `backBehavior="none"`, and the root Stack uses
  `<Stack.Screen name="index" redirect />` to exclude that component-only
  redirect from native stack history. The final production change is three
  native declarations across `app/(tabs)/_layout.tsx` and `app/_layout.tsx`; it
  adds no listener, gesture suppression, helper, adapter, dependency, or
  second routing owner.
- **Verification:** installed-router tab proof reports the old state as
  `initial=feed browse-back=feed` and the corrected state as
  `initial=browse browse-back=unhandled`; the installed Stack screen owner
  removes a route whose `redirect` prop is true. On `Eazy-Review-iPhone-15`
  (iOS 26.5), a fresh staging-backed launch and its first edge Back gesture
  retained the same Browse runtime screen hash (`0egt3nx`); Feed → Browse →
  Back retained its Browse hash (`0oabgeu`); and Product Detail's real Back
  returned to Browse. The anonymous staging catalog still rendered and the
  development bundle logged no new runtime error. Typecheck, lint, the full
  42-suite/501-test frontend run with the repository's known Jest force-exit,
  `check:readonly`, the E1 residue search, and `git diff --check` pass.
  Independent deletion-first review found no smaller correct diff and no
  actionable finding. The later iPhone 17 Pro Max physical rerun passed cold
  Browse Back, Feed → Browse → Back, and Product Detail Back against both
  local Docker and staging.
- **Residual risk:** the current local-target physical offline/reconnect lane
  and the solved Account/Profile P2 recheck are human-reported rather than
  agent-observed. Android remains excluded.
- **Undo:** revert the local completion commit. No native rebuild, reinstall,
  data restoration, hosted change, or credential rollback is required.

## Extended finding E2: share error-shape extraction, not domain policy

### Candidate, burden, and reachability

`src/features/products/errors.ts`, `src/features/ratings/errors.ts`, and
`src/features/auth/errors.ts` each traverse an unknown SDK/network error to read
the same record shape, numeric or three-digit-string status, string code/name,
and safe message. All three implementations are live. Their domain codes,
fixed user copy, retry rules, session-preservation policy, and transport
spellings are not identical.

### Cut and consequence when selected

1. Add one small internal network error-details reader for only the identical
   structural extraction.
2. Reuse it from the three feature normalizers and delete their repeated shape
   readers.
3. Keep `normalizeCatalogError`, `normalizeRatingError`, and Auth classification
   separate. Do not centralize user messages, retry rules, authorization codes,
   invalid-session policy, or transport regexes as options on a generic mapper.
4. Decide any spelling drift such as `fetch failed` explicitly; do not smuggle a
   behavior change into the consolidation.

No user-facing capability is intentionally surrendered. The cut removes
parsing duplication while preserving three domain owners.

### Confidence, risk, proof, and net effect

Confidence is contract-level for the identical extraction. Risk is medium
because these readers sit before safe-copy, retry, and logout decisions. The
decisive proof is a small shared-reader test plus the existing catalog, rating,
and Auth error suites, with explicit number/string status, missing/malformed
fields, error instances, transport spellings, fixed copy, retry, and ambiguous
session-rejection cases. Then run typecheck, lint, the full frontend suite, and
`git diff --check`.

Net effect: one structural parser replaces three copies; domain behavior stays
where it is. If the shared reader needs feature switches, retain the current
copies instead. Undo is the single E2 diff or commit.

## Extended finding E3: retire proxy and duplicate tests

### Candidate, burden, and reachability

Three suites total 182 lines but no longer provide 182 lines of independent
regression signal:

- `src/features/auth/AuthForms.test.tsx` repeats invalid-credential, offline,
  confirmation-required, and return-path cases already owned by Auth API,
  screen, and return-path suites. Its email-preservation case reassigns a local
  variable without mounting a form, and its duplicate-submit case invokes the
  API once rather than exercising the UI pending gate.
- `src/features/auth/AuthFieldProps.test.tsx` renders the generic `Input` with
  example props; it does not mount either Auth screen. The useful email/password
  prop checks belong in the existing screen suite against the real fields.
- `src/test/harness.smoke.test.tsx` proves the original Jest/RNTL harness can
  render. The same helper is now exercised across product, rating, account,
  Auth, and query suites, while `query.infrastructure.test.tsx` directly owns
  its provider isolation and cleanup behavior.

### Cut and consequence when selected

1. Map every assertion to an existing owner before deletion.
2. Move only the real email keyboard/capitalization and password-security
   assertions into `AuthScreens.test.tsx`; do not recreate the proxy component.
3. Delete the three superseded suites. If a claimed duplicate is not present in
   an owner suite, retain or move that assertion first.
4. Update the Task 14/API-contract references that still promise a standalone
   harness smoke file; do not rewrite historical evidence.

The surrendered capability is only an isolated "the harness starts" sentinel
and duplicate/proxy assertions. Live Auth form behavior, return-path security,
API error mapping, provider isolation, and cleanup remain directly tested.

### Confidence, risk, proof, and net effect

Confidence is contract-level from the local assertion map. Risk is low if each
assertion is reconciled first; deleting by filename without that map is not an
authorized shortcut. Run the Auth API, Auth screen, return-path, query
infrastructure, and provider-focused suites before and after the cut, then the
full frontend suite, typecheck, lint, agent-infrastructure/document checks, and
`git diff --check`.

Net effect: fewer false-confidence tests and less fixture maintenance, with the
remaining checks attached to real owners. Undo is the single E3 diff or commit.

### E3 operation receipt — 2026-08-31

- **Scope:** local E3 test-ownership consolidation only, based on tracked-clean
  `22e2bc20f49549582a32be56361bc0fae349431d`. No production source, Auth
  behavior, route, dependency, configuration, schema, migration, generated
  file, hosted state, or remote lifecycle action changed.
- **Baseline:** the three candidate suites passed 3/3 suites and 7/7 tests. The
  surviving Auth API/error/screen/return-path, query-infrastructure, and Auth
  provider owner set passed 7/7 suites and 152/152 tests.
- **Assertion map:** invalid-credential and offline normalization remain in the
  Auth API/error suites; confirmation behavior remains in Auth API and screen
  suites; return-path validation/navigation remains in its owner and screen
  suites; provider rendering, QueryClient isolation, and cleanup remain in
  `query.infrastructure.test.tsx`. Email keyboard/capitalization and password
  security now run against both real Auth screens. The deleted local-variable
  preservation and single-API-invocation cases exercised no form or pending
  gate, so they were not recreated as false signal.
- **Retired obligation:** `AuthForms.test.tsx`, `AuthFieldProps.test.tsx`, and
  `harness.smoke.test.tsx` are deleted with their proxy fixtures and seven
  duplicate or vacuous tests.
- **Artifacts:** `AuthScreens.test.tsx` owns the useful field assertions;
  `docs/API_CONTRACTS.md` and `docs/TASKS.md` no longer promise the standalone
  harness sentinel. Historical evidence remains unchanged.
- **Realized net effect:** 182 proxy-test lines are removed and 14 owner-test
  lines are added, for a net reduction of 168 test lines, three suites, and
  seven tests. No replacement helper, abstraction, dependency, or production
  code was added.
- **Behavior:** no runtime capability is intentionally changed. The isolated
  harness-start sentinel and proxy assertions are surrendered; real Auth field
  configuration, safe error mapping, navigation validation, provider
  isolation, and cleanup remain directly covered.
- **Verification:** the identical owner set passes 7/7 suites and 152/152 tests
  before and after. The decisive Auth screen suite passes 1/1 suite and 5/5
  tests; the full frontend suite passes 39/39 suites and 496/496 tests;
  typecheck, lint, `check:readonly`, the residue search, and `git diff --check`
  pass. Existing React `act(...)`, Jest force-exit/open-handle, Supabase lock,
  and npm proxy warnings remain non-gating and unchanged.
- **Residual risk:** no device walk was run because E3 changes tests and active
  documentation only; it does not alter a runtime bundle. Android remains
  explicitly out of scope. No user or production behavior claim depends on a
  deleted proxy suite.
- **Retained candidates:** E2 remains ready but unselected; S2 still requires a
  capability/skill decision; S3 still requires native proof; E4, L1, and E5
  remain fold-only; U1 and R1 remain retained.
- **Undo:** restore the three deleted suites, remove the owner-screen field
  assertions, and revert the active documentation edits. No data, hosted
  configuration, deployment, or production restoration exists.

## Fold-only and held extended findings

### E4: splash-dismiss relay

`src/lib/splash/bootstrap.ts` is a six-line relay with one caller in
`app/_layout.tsx`; its 22-line test proves only that the relay calls
`SplashScreen.hideAsync` once. If layout/bootstrap work is already selected,
inline the same fire-and-forget call at the same pre-provider location and
retire the proxy test. Preserve ordering before synchronous provider bootstrap
and prove cold-start behavior. The benefit is too small to justify standalone
native-proof work.

### E5: signed-out reconciliation alias

`reconcileGuardedSignedOutEvent` is an exact alias of the live
`reconcileGuardedAuthStorage` owner. It has no production caller; the only
non-historical code occurrence is a Jest module-mock entry. The accepted Task 19
implementation plan still names the old specialized boundary, but that record
is historical implementation context and stays unchanged. Task 19 is accepted
and merged, so a future Auth-owned packet may rerun the consumer map and fold in
the alias/mock removal. The benefit is too small for standalone work, and no
guarded storage behavior may change with it.

## Retained and rejected simplifications

- Auth provider/storage/account-deletion complexity protects authorization,
  exact-session settlement, cross-context races, and data-loss boundaries.
- The shared `requestTimeout` helper remains the deadline/cancellation owner.
  E1 may remove the competing catalog implementation only while preserving its
  observable contract; native helpers are not an equivalent cut under the
  accepted reliability decision.
- The public-environment JWT decoder fails closed without `atob`, validates
  UTF-8, and rejects elevated credentials. Auth storage's smaller decoder reads
  guarded-session identity in a different runtime/availability contract. A
  shared parser would cross security ownership for little reduction, so R1 is
  retained.
- `src/features/auth/hooks.ts` is a live import/mocking seam used by routes,
  providers, and tests. Its short relay surface is not dead indirection.
- Similar screen status branches and product/auth visual fragments preserve
  different data, authentication, and copy contracts. A configurable generic
  state machine or form component would add coordination rather than remove it.
- Edge Function request validation, fixed responses, adapter normalization, and
  confirmation checks stay separate at the account-deletion trust boundary;
  repeated-looking record/logging code is not a cleanup target.
- Applied migrations and their RLS/grant history are forward-only. Do not
  squash or rewrite them.
- Generated database types, `docs/DECISIONS.md`, and agent skill wrappers keep
  their canonical generators and checkers.
- The duplicated seed include exists for the database test runner's file
  boundary and has an equality check; relocating it would not reduce ownership.
- Historical decisions, evidence, and archives remain historical proof, not
  active-code deletion targets.
- The resolved recovery blocker note is explicitly allowed by the notes
  lifecycle and preserves rejected hypotheses; the Task 19 mirroring blocker is
  still referenced by current verification. Neither is a useful deletion.
- The deferred Agent infrastructure checker v2 task already owns replacement of
  Markdown task-graph parsing with structured config. I1 must not be duplicated
  as an opportunistic simplification packet.
- Keep `plugins/withIosDeviceBuildFixes.js` until the accepted temporary CNG
  decision's same-device no-plugin A/B revisit condition passes.
- Do not add an in-app local/staging Supabase hot switch. The current runtime
  intentionally has one immutable public environment, one Supabase client,
  one Query client, and environment-neutral public catalog keys. A hot switch
  would require client/Auth listener teardown, in-flight cancellation, full
  cache eviction or environment-keyed caches, session isolation, target UI,
  and transition tests; that adds more ownership than it removes and makes an
  accidental staging write easier. Expo SDK 57 development HMR imports its
  virtual environment from conventional `.env` files and can merge `.env` or
  `.env.local` values over shell-selected `EXPO_PUBLIC_*` values even when CLI
  dotenv loading is disabled. The proven no-rebuild procedure is therefore to
  stop Metro, temporarily isolate those ignored files, launch Metro with the
  selected public values and `--clear`, fully reload the app, and restore the
  files byte-for-byte afterward. Reconsider only if repeated, measured
  switching friction justifies a developer-only launch-profile task; do not
  implement a live production-app toggle.

## Cross-session and multi-agent protocol

Every continuation starts with:

1. `git status --short`, repository identity, branch, HEAD, and worktree
   topology.
2. Read `AGENTS.md`, the proposed decision, this plan, and
   `docs/notes/handoff.md`; then restate the selected packet before editing.
3. Confirm the human-selected candidate and authorization boundary. Planning
   approval is not implementation, commit, push, readiness, merge, deployment,
   or production approval.
4. Run the affected-document report for the actual changed paths before final
   documentation edits.

Use one mutation owner per packet. If delegation is explicitly authorized,
give agents non-overlapping consumer-map or read-only review domains; the
parent reconciles findings before any cut. Never let parallel agents edit the
same ownership boundary or generated output.

At each packet boundary, record the simplification skill's operation receipt:
scope, baseline, retired obligation, artifacts, realized net effect, behavior,
exact verification results, residual risk, retained candidates, and undo path.
Then update `docs/TASKS.md` and overwrite `docs/notes/handoff.md` using
`skills/session-handoff`.

## Program completion

The program is complete when every human-selected packet is either validated
and documented, or retained with the failed proof or real consumer recorded.
Unselected candidates remain proposals. No raw deletion, dependency, or line
count is a completion criterion.
