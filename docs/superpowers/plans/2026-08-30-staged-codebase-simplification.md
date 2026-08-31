# Staged Codebase Simplification Plan

Status: **Planning only; implementation has not started.**

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

- This plan records work; it does not authorize implementation, commit, push,
  PR lifecycle changes, deployment, hosted configuration, migration, account
  deletion, or production access.
- Before a batch, a human selects its candidate and accepts every listed
  capability loss. One candidate is the default batch size.
- Stop when a real or unresolved dynamic consumer exists, a baseline cannot
  expose the proposed regression, or the cut crosses another ownership
  boundary.
- Do not modify applied migrations, security or authorization mechanisms,
  account-deletion/recovery coordination, generated files by hand, historical
  evidence, or the current request timeout contract as incidental cleanup.
- Changes to canonical skills or their manifest require the separate
  `skills/skill-creator` approval gate. Generate wrappers; never edit them by
  hand.
- Agents and tools never execute account deletion in any environment.

## Coverage and evidence baseline

The initial audit inspected route entrypoints; product, rating, Auth, query,
environment, and network modules; Supabase migrations, tests, seed, and Edge
Function boundaries; package/config ownership; generated documentation and
skill wrappers; current decisions; and retained evidence. It did not run a
device build or inspect unknown external consumers.

| ID | Candidate | Evidence state | Benefit | Risk | Planning disposition |
| --- | --- | --- | --- | --- | --- |
| S1 | Create Expo starter subtree and unused dependencies | Contract proof from repository consumer map | High | Low | First batch after approval |
| S2 | Mock-era product-detail contract and assets | Contract proof in repository; explicit capability choice remains | Very high | Low–medium | Second batch after capability and skill-doc approval |
| S3 | `react-native-url-polyfill` over Expo WinterCG URL | Static owner proof; native boot proof missing | Medium | Low–medium | Proof-first conditional batch |
| L1 | Dead `RatingRow` and tiny unused exports | Static consumer proof | Low | Low | Fold into owning batch; no standalone work |
| U1 | Temporary iOS CNG compatibility plugin | Current accepted ADR and prior no-plugin failure | Potentially high | High until device A/B | Retain; revisit at its ADR trigger |

## Packet S1: remove the starter subtree

### Current burden and reachability

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

Resolve Expo config and smoke web plus iOS/Android startup before claiming
runtime equivalence. Undo is the single S1 diff or commit; there is no data or
hosted-state restoration.

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

## Retained and rejected simplifications

- Auth provider/storage/account-deletion complexity protects authorization,
  exact-session settlement, cross-context races, and data-loss boundaries.
- `requestTimeout` owns deadline enforcement, external cancellation, and timer
  or listener cleanup. Native helpers are not an equivalent cut under the
  accepted reliability decision.
- Applied migrations and their RLS/grant history are forward-only. Do not
  squash or rewrite them.
- Generated database types, `docs/DECISIONS.md`, and agent skill wrappers keep
  their canonical generators and checkers.
- The duplicated seed include exists for the database test runner's file
  boundary and has an equality check; relocating it would not reduce ownership.
- Historical decisions, evidence, and archives remain historical proof, not
  active-code deletion targets.
- Keep `plugins/withIosDeviceBuildFixes.js` until the accepted temporary CNG
  decision's same-device no-plugin A/B revisit condition passes.

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
