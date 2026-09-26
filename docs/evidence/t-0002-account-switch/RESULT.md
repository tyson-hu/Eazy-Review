# T-0002 — account-switch regression increment

Status: local implementation; final committed-input verification pending.
Date: 2026-09-25 (America/Chicago).
Contract: `tyson-hu/dispatch-hub@0f9bdd402d6014939a64a9d8a337c6078e62b8ef`,
`work/T-0002/TASK.md`, revision 1; observed STATE revision 5, READY.
Project base: `8b6899e0d61b89ad63009d4343f53a1c42cc261a` (local and remote master).
Branch: `codex/t-0002-account-regression`; all project changes are local-only.

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

No product implementation, auth/API/cache logic, dependencies or CI changed.
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
- Final focused tests and `npm run check:readonly`: not_run on a committed
  result yet. Independent review: pending. Test/fixture repair rounds used: 0/1.

Local raw logs: `.codex/reports/t-0002/baseline.log` and
`.codex/reports/t-0002/focused-development.log` (ignored, not published).
No failed test or real isolation defect has been observed in these runs.

## Limits and reviewer-facing value

User risk: switching accounts could otherwise display a previous person's
profile, rating or private note in the next session.
This evidence connects the real client auth transition and all three private
query families, including late reads, in one repeatable synthetic scenario.
It does not establish server/RLS isolation, screen rendering, real auth
transport, rating mutations, devices, CI, human acceptance or release readiness.

Task 22 remains Pending. Its integrated-boundary acceptance and E2E trigger
human gate remain open; this increment is not whole-task acceptance.
Browser/native/physical, database, remote/CI, full Expo/Doctor and deployment
checks: not_run (outside this increment). Proposed Project #4 writes: none.
The old ignored `docs/notes/handoff.md` describes Project #4 migration and is
preserved alongside the four unrelated untracked planning documents.

Next action after evidence/report synchronization: user review of T-0002.R1;
stop without selecting or starting another task.
