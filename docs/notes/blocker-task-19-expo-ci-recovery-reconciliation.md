# Blocker — Task 19 Expo CI recovery reconciliation — 2026-08-22

## Problem

Draft PR #43 remains blocked because exact-head Expo CI repeatedly fails the
`AuthProvider password recovery` suite while the same source passes all local
focused, parallel, Node 24 CI-shaped, read-only, and full Expo gates. At current
head `95765558843cda68150e6fece9a2eda8c37afea3`, the first test no longer
times out, but stored B is never passed to isolated validation in CI and nine
later recovery cases settle from contaminated state.

## Attempts so far

1. Reproduced the published `1391effa...` failure without source changes.
   Expo CI run `32545200777`, attempts 1 and 2, both failed the same first test
   at Jest's 5-second timeout, followed by the same nine recovery failures.
2. Hypothesis 1: the explicitly-online recovery suite inherited an offline
   TanStack `onlineManager` singleton. Forced offline locally reproduced the
   exact timeout. Commit `1a515e13b1992f6dcc53f08a030e28acf0022d13`
   reset `onlineManager` in the test `beforeEach` and aligned the five Expo SDK
   57 patch dependencies. Local gates passed. Exact-head Expo CI run
   `32573878672` still produced the original timeout and nine follow-on
   failures. Exact-head Database CI run `32573878692` passed.
3. Hypothesis 2: the test's cold-initial-link plus unbounded manual validation
   latch raced provider bootstrap on the slower runner. Commit
   `95765558843cda68150e6fece9a2eda8c37afea3` waited for signed-out bootstrap,
   seeded the A/B caches, triggered the same callback through the warm-link
   listener, retained all authority/storage/cache assertions, and cleaned up
   in `finally`. Local focused 50/50, full 465/465, Node 24 three-worker
   no-cache, `check:readonly`, and `check:expo` passed. Exact-head Expo CI run
   `32574561570` still failed, now because isolated B validation had zero calls;
   Database CI run `32574561580` passed.

## Ruled out

- Expo dependency mismatch: `expo` 57.0.15, `expo-constants` 57.0.13,
  `expo-dev-client` 57.0.14, `expo-linking` 57.0.7, and `expo-router` 57.0.15
  pass Expo Doctor 21/21 and `expo install --check` locally.
- Lockfile install failure: clean `npm ci` passes; candidate npm-audit counts
  are lower than the base and no install-script approval changed.
- Offline singleton as the complete cause: the explicit online reset is valid
  test isolation, but exact-head `1a515e1...` retained the timeout.
- The naked validation latch as the complete cause: removing it eliminated the
  timeout at `9576555...`, but CI still did not call isolated B validation.
- Edge Function or database regression: exact-head Database CI passed at both
  remediation heads, including Deno checks, local reset, pgTAP/concurrency,
  generated-type parity, and cleanup.
- Basic local worker/cache shape: Node 24 with three workers and a cold Jest
  cache passes 41 suites / 465 tests; the parent-owned local `check:expo`
  passes completely.

## Evidence

Current exact-head Expo CI (`32574561570`) reports:

```txt
FAIL src/features/auth/AuthProvider.test.tsx (14.373 s)
  ● AuthProvider password recovery › invalidates A recovery and reconciles stored B when callback adoption is superseded

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "***"

    Number of calls: 0

      1663 |       await waitFor(() =>
      1664 |         expect(validateStoredSession).toHaveBeenCalledWith(winnerB.access_token),

Test Suites: 1 failed, 40 passed, 41 total
Tests:       10 failed, 455 passed, 465 total
```

The preceding exact-storage assertion passed, so the callback wrote/preserved B
before the missing validation assertion. The remaining nine failures again
show signed-out or unchanged stored-B outcomes after the first failure.

Current head and checks:

```txt
PR: #43
Head: 95765558843cda68150e6fece9a2eda8c37afea3
Expo CI: failure — run 32574561570
Database CI: pass — run 32574561580
```

No check used a real bearer or executed account deletion.

## Environment facts

- Exact-head CI: GitHub Ubuntu 24.04, Node 24.19.0, npm 11.17.0, clean
  `npm ci`, default parallel `npm test`.
- Local: macOS arm64; Node 26 default and an existing Node 24.16.0 runtime.
- The failure occurs before Expo Doctor/export; route preparation,
  `check:readonly`, and dependency installation pass in CI.
- React `act()` and worker/open-handle warnings predate this remediation and
  remain visible locally and in CI.
- The resolved untracked blocker note
  `docs/notes/blocker-task-19-superseded-recovery-publication.md` is separate
  history and was not modified.

## Next hypothesis

On CI, the superseded callback reaches storage/adoption but calls the default or
otherwise not-ready `requestGuardReconciliationRef` path before the guarded
reconciliation effect can isolate-validate stored B. A fresh authorized epoch
should instrument only fixed stage labels around `AuthProvider.tsx` guarded
reconciliation setup (`870–1115`) and superseded callback settlement
(`1250–1315`), then compare the exact Linux order. Do not change product
timeouts, disable the check, or attempt a third fix without that new evidence.
