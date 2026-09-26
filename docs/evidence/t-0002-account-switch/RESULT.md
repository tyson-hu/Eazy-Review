# T-0002 — account-switch regression increment

Status: bounded local increment human accepted on 2026-09-25; repository
delivery proceeds through the normal PR and CI gates.
Date: 2026-09-25 (America/Chicago).
Contract: `tyson-hu/dispatch-hub@0f9bdd402d6014939a64a9d8a337c6078e62b8ef`,
`work/T-0002/TASK.md`, revision 1; original execution observed STATE revision 5, READY.
Project base: `8b6899e0d61b89ad63009d4343f53a1c42cc261a` (local and remote master).
Exact tested code commit: `09839904db87278b2f01332168d59804ab030e05`.
Accepted result commit: `ec9e83c119b510f2a77af6bc627aa4fc835590ae` (T-0002.R1);
it changed this report only relative to the tested commit, with no change to
tested code or executable inputs. That original result was local-only when
accepted. The repository-delivery follow-up records acceptance and the separately
authorized SDK 57 patch alignment below. The regression test is unchanged;
dependency changes require fresh validation on the updated PR head.
Branch: `codex/t-0002-account-regression`; its pull request owns the current
publication status, exact-head CI results and review conversation state.

## Acceptance and repository delivery

The user accepted T-0002.R1 on 2026-09-25. Hub decision T-0002.D1 records
acceptance of this local client-regression increment and its stated limits.
The subsequent user request authorizes persistence through the project's
normal PR + CI flow. Acceptance does not cover all Task 22 work or establish
CI, device, database, deployment or release results by itself.

Repository delivery keeps the original implementation and evidence together
with this acceptance record. Refer to the branch's PR checks for hosted
validation; do not infer those results from the local commands below.
Project #4 moves: none; Task 22 retains its Pending status and existing gates.

## Authorized CI prerequisite: SDK 57 patch alignment

PR #62's first head `9602cac37de8a9d14ed541518623fc85e4678952` passed repository
checks and 48 frontend suites / 559 tests in
[Expo CI run 36206067432](https://github.com/tyson-hu/Eazy-Review/actions/runs/36206067432).
Both CodeQL analyses passed in
[run 36206067352](https://github.com/tyson-hu/Eazy-Review/actions/runs/36206067352).
Required `validate` failed at Expo Doctor: eight existing SDK 57 patch versions
needed alignment. Package manifests, lockfile and CI were identical to master;
the failure was unrelated to the added regression assertions. Dependency-check
and export steps were not reached in that failed run.

After reviewing the concrete eight-package proposal, the user authorized:
“允许最小补丁对齐并继续 CI”. This follow-up changes only those direct ranges
and their necessary lockfile closure; no CI gate or install-script allowlist
is weakened and no product/auth/API implementation is changed.

| Direct package | Previous resolved | New range |
| --- | --- | --- |
| expo | 57.0.20 | ~57.0.25 |
| expo-constants | 57.0.17 | ~57.0.19 |
| expo-dev-client | 57.0.18 | ~57.0.19 |
| expo-font | 57.0.3 | ~57.0.4 |
| expo-linking | 57.0.9 | ~57.0.11 |
| expo-router | 57.0.19 | ~57.0.23 |
| expo-splash-screen | 57.0.8 | ~57.0.9 |
| expo-symbols | 57.0.2 | ~57.0.3 |

The minimized lockfile updates 27 packages (8 direct and 19 required transitive),
without adding/removing package entries. `expo-modules-jsi` 57.1.1 is required
by `expo-modules-core` 57.0.19; it is part of that required closure, not an SDK
major upgrade. Compatible unrelated resolutions and the existing Radix layout
were preserved; npm revalidated the minimized lockfile. Registry integrity and
install lifecycle metadata were checked for all 27 changed packages; none has
a preinstall/install/postinstall hook. The existing reviewed install-script
allowlist is unchanged. Updated-head local and hosted checks are recorded in
PR #62; the original local results below refer to the earlier dependency set.

## Boundary and existing coverage

The selected scenario is A → B → signed-out anonymous on one QueryClient:
real AuthProvider, profile, My Rating/private note, and Rated Products hooks.
The Auth SDK and data transport are synthetic; no database, real account,
session credential, deletion or remote environment is used.

At the base SHA:

- `src/features/auth/AuthProvider.test.tsx`: `clears prior user cache when
  switching A → B` exercised the real provider with seeded profile/public
  cache. `clears user-scoped cache on sign-out and keeps public catalog cache`
  separately exercised sign-out with seeded profile/rating cache.
- `src/lib/query/userScopedCache.test.ts`: four cases covered cancellation
  order, late A profile completion, sign-out and principal-selective cleanup;
  hooks and provider were not connected in those helper cases.
- `src/features/account/AccountScreen.test.tsx`: `does not display account A
  data for account B` used mocked auth/profile/rated-products hooks already
  set to B; it did not perform an A → B transition.
- `src/features/ratings/mutations.test.tsx`: rating query enablement and owner
  keys used mocked auth. Screen tests also stubbed those query hooks.

The bounded search inspected these actual tests, provider harness and query
hooks. It found no equivalent combined provider + three private query families
scenario; this is not a claim about every test in the repository.

## Minimal change and assertions

Expanded the existing A → B test in `src/features/auth/AuthProvider.test.tsx`
instead of adding another test suite or duplicating its Auth SDK fixture.
The case is named `isolates profile, ratings and private notes across
A → B → anonymous, including late A reads` and reuses `sampleMyRating`,
`uniformDimensions`, `createAppQueryClient`, and `renderWithProviders`.

1. Real hooks fetch A's profile, My Rating with private note and Rated Products.
2. Refetch all three A-owned queries while deliberately holding their API
   promises; switch to B through the existing injected Auth SDK event source.
3. Assert every A signal aborted, all three A cache entries removed, B's
   distinct data loaded, and no committed B hook-consumer state contains A data.
4. Resolve A's held transport promises despite cancellation; assert A cache
   remains absent and B/public catalog data remains intact.
5. Emit sign-out; assert all A/B private entries removed, anonymous consumers
   have no private data, no new private API calls occur, and public cache remains.

The original regression implementation changed no product/auth/API/cache logic,
dependencies or CI. The later authorized dependency prerequisite is described
separately above; the regression assertions are unchanged.
This is a hook-consumer integration test, not a rendered screen journey or E2E.

## Execution and trust

Node `v26.9.0`, npm `11.19.1`, existing installed dependencies, macOS;
Jest/Expo preset and React Native Testing Library. No install or environment
rebuild. Package scripts, Jest/Babel/setup/harness and check configuration were
inspected; executable inputs were compared against the user-supplied project
base (no pre-existing tracked differences), and the new test diff was reviewed
before execution. Only sample Git hooks exist; no custom hooksPath is configured.

Commands run from the project root, with `CI=1 EXPO_NO_DOTENV=1`:

- Base SHA: `npm test -- --runInBand --runTestsByPath src/features/auth/AuthProvider.test.tsx src/lib/query/userScopedCache.test.ts --testNamePattern='clears prior user cache|clears user-scoped cache on sign-out|removeUserScopedQueries|removePrincipalScopedQueries'`
  — pass, 6 tests / 2 suites, 56 skipped by selection. Existing nested worktree
  produced a Jest Haste naming-collision warning; the run exited 0. It was not
  removed or modified to suppress the warning.
- Development working tree: same paths with pattern
  `'isolates profile, ratings and private notes|clears user-scoped cache on sign-out|removeUserScopedQueries|removePrincipalScopedQueries'`
  — pass, 6 tests / 2 suites, 56 skipped; not yet exact-commit evidence.
- Final focused command: `npm test -- --runInBand --runTestsByPath src/features/auth/AuthProvider.test.tsx src/lib/query/userScopedCache.test.ts --testNamePattern='isolates profile, ratings and private notes|clears user-scoped cache on sign-out|removeUserScopedQueries|removePrincipalScopedQueries'`
  — pass, exit 0, 6 tests / 2 suites, 56 skipped by selection, on exact tested
  commit `09839904db87278b2f01332168d59804ab030e05`; no warning.
- `npm run check:readonly` — pass, exit 0, on the same exact commit: 110
  infrastructure/self-tests (24 wrapper + 1 decision + 26 secret + 59 graph),
  wrapper/index checks, repository secret scan, graph, typecheck and lint.
  The secret scanner's negative-fixture diagnostic was expected; its self-test
  and final repository scan passed. No real secret was reported.
- Independent static reviewer `/root/review_t0002`: no actionable findings
  on that commit's diff and relevant contracts. Read-only verifier
  `/root/verify_t0002` ran the two final commands, confirmed unchanged HEAD,
  clean tracked tree and `git diff --check`. Those agent checks alone do not
  establish human acceptance; the later user decision is recorded above.
  Test/fixture repair rounds used: 0/1; no failed check or repair loop.

Local raw logs: `.codex/reports/t-0002/baseline.log` and
`.codex/reports/t-0002/focused-development.log` (ignored, not published).
Final verifier receipt: `.codex/reports/t-0002/final-verification.md`;
static review receipt: `.codex/reports/t-0002/independent-review.md`.
These two receipts preserve agent-reported observations, not raw stdout.
No failed test or real isolation defect has been observed in these runs.

## Limits and reviewer-facing value

User risk: switching accounts could otherwise display a previous person's
profile, rating or private note in the next session.
This evidence connects the real client auth transition and all three private
query families, including late reads, in one repeatable synthetic scenario.
It does not establish server/RLS isolation, screen rendering, real auth
transport, rating mutations, devices, CI or release readiness. Human acceptance
is limited to the bounded increment described above.

Task 22 remains Pending. Its broader integrated-boundary acceptance and E2E
trigger human gate remain open; this increment is not whole-task acceptance.
Browser/native/physical, database, remote/CI, full Expo/Doctor and deployment
checks were not_run in the original local implementation stage. Hosted CI for
repository delivery is recorded separately by the PR checks. The authorized
lockfile update triggers the existing path-filtered Database CI on its
disposable local runner; it does not authorize staging/production access.
Browser/device and deployment checks remain outside this delivery's scope.
Proposed Project #4 writes: none.
The old ignored `docs/notes/handoff.md` describes Project #4 migration and is
preserved alongside the four unrelated untracked planning documents.

Repository delivery is limited to this accepted increment; do not select or
start another task, expand Task 22, or imply a product release from this PR.
