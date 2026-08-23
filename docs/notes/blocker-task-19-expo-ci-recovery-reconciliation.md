# Blocker — Task 19 Expo CI recovery reconciliation — 2026-08-22

Status: **Resolved for PR remediation on implementation head `28ac202`; later
human and environment gates remain outstanding.**

## Diagnostic problem

Draft PR #43 diagnostic head `b843dc8` remains the historical failing baseline:
exact-head Expo CI repeatedly fails the
`AuthProvider password recovery` suite while the same source passes all local
focused, parallel, Node 24 CI-shaped, read-only, and full Expo gates. Diagnostic
head `b843dc8c786d4e2c4ea58856f58926dfb6b69cf9` proved the superseded callback
uses the ready reconciliation function, but its first guarded read sees an
empty authority slot. Static tracing then established that Expo CI resolves an
environment-derived Auth storage key for the injected test client while the
regression writes B to `sb-injected-auth-token`. Isolated B validation is never
reached and nine later recovery cases settle from contaminated state.

The required independent integrated review of exact baseline `b843dc8` then
found two materially distinct current-head auth-preservation blockers before
any remediation edit was made. First, standalone guard arm can interleave with
an already-running token refresh: the guard drops rotated A2, and a later
confirmed pre-revocation rollback disarms over stale raw A1. Second, a settled
guard allowing same-principal S1 can reject valid recovery S2 as superseded;
when the provider has no exact displaced-session snapshot, force reconciliation
can remove valid S1 on principal match alone. Both findings were independently
traced and accepted as blockers. They require scope beyond the storage-key
correction described below.

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
4. Diagnostic evidence pass: commit
   `b843dc8c786d4e2c4ea58856f58926dfb6b69cf9` added fixed, payload-free stage
   labels only. Exact-head Expo CI run `32576388524` proved the callback drains
   its tail, calls the ready reconciliation ref, enters reconciliation, and
   classifies the first guarded snapshot as `empty`; isolated validation never
   starts. Database CI run `32576388501` passed. No product fix was attempted.

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
- Default/not-ready reconciliation ref: the diagnostic run emitted
  `guard-schedule`, `guard-reconcile-enter`, and `guard-snapshot-read-start`;
  neither default-ref label appeared in the failing path.
- Tail ordering as the missing stage: the failing path emitted
  `callback-superseded-tail-drained` before requesting reconciliation.
- Edge Function or database regression: exact-head Database CI passed at both
  remediation heads, including Deno checks, local reset, pgTAP/concurrency,
  generated-type parity, and cleanup.
- Basic local worker/cache shape: Node 24 with three workers and a cold Jest
  cache passes 41 suites / 465 tests; the parent-owned local `check:expo`
  passes completely.

## Evidence

Published diagnostic exact-head Expo CI (`32576388524`) reports:

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

The fixed stage order for the first failed path is:

```txt
callback-superseded-tail-wait
callback-superseded-tail-drained
callback-superseded-request
guard-schedule
guard-reconcile-enter
guard-snapshot-read-start
guard-snapshot-empty
callback-outcome-signed-out
```

The preceding exact-storage assertion passed on `sb-injected-auth-token`.
Static source evidence explains the apparently contradictory read:

- Expo CI sets a public local-shaped `EXPO_PUBLIC_SUPABASE_URL`.
- At diagnostic head `b843dc8`, `resolveProviderStorageKey(clientProp)` calls
  `getSupabaseAuthStorageKey()` before its injected-client fallback.
- The CI URL therefore yields a derived key instead of
  `sb-injected-auth-token`.
- The regression writes and asserts B at `sb-injected-auth-token`.
- Guarded reconciliation receives the derived key and classifies that distinct
  slot as empty.
- `src/features/auth/api.ts` already resolves an explicitly supplied client to
  `sb-injected-auth-token` before consulting public environment.

The remaining nine failures again show signed-out or unchanged stored-B
outcomes after the first failure.

Published diagnostic head and checks:

```txt
PR: #43
Head: b843dc8c786d4e2c4ea58856f58926dfb6b69cf9
Expo CI: failure — run 32576388524
Database CI: pass — run 32576388501
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
- The resolved blocker note
  `docs/notes/blocker-task-19-superseded-recovery-publication.md` is separate
  history and was not modified.

## Baseline integrated review blockers

### In-flight refresh versus standalone guard arm

- `AuthProvider` arms the deletion guard before acquiring the shared Auth
  operation lock. A refresh that already holds that Auth lock can therefore
  finish after arm.
- The guarded adapter correctly drops the rotated A2 write and the provider
  ignores its blocked event, but a confirmed pre-revocation failure then
  disarms without preserving A2. Raw storage remains stale A1.
- Smallest identified correction: acquire the shared Auth-operation lock around
  guard arm so an earlier refresh persists before arm, then retain the existing
  guard behavior for later refreshes. This changes the approved standalone-arm
  sequencing language and needs matching focused rollback coverage.

### Settled same-principal recovery S1 to S2

- Guard adoption treats allowed same-principal raw S1 as a superseding winner
  when valid recovery S2 has a different exact snapshot, so S2 is not adopted.
- The blocked S2 event can leave the provider without an exact displaced
  snapshot. Force reconciliation currently permits removal when only the
  principal matches, allowing valid S1 to be removed.
- Smallest safe direction: carry the exact pre-exchange predecessor through a
  serialized S1-to-S2 adoption transaction, preserve A2/C/empty/malformed/
  blocked authority, and forbid principal-only removal when the displaced
  snapshot is unknown. This needs real-storage, recovery-API, and provider
  regressions.

## Local remediation outcome

The bounded local product/test remediation addresses all three accepted
blockers together:

1. `resolveProviderStorageKey` now honors an explicitly supplied client before
   public environment; configured-environment/injected-client proof passes and
   the temporary stage labels are removed;
2. deletion guard arm now runs behind earlier Auth work in a short
   `Auth operation -> storage` section, releases before isolated
   reauthentication, and proves rotated A2 survives confirmed pre-revocation
   rollback; and
3. guarded recovery captures an exact settled or lease-expired-pending
   predecessor and publishes same-principal S2 only after an exact serialized
   adoption transaction. Recovery-owned S2 events remain maintenance-only
   until adoption succeeds. Unknown displacement never authorizes primary,
   companion, or same-principal cache cleanup, so valid S1 is preserved and
   published only after isolated validation plus exact recheck.

The product/test candidate is frozen at Git tree
`3d8bf2be5cfadab6197c95b4f4036006df4caab4`. Disposable credential-free
validation passed: 6 affected suites / 205 tests, the full 41-suite / 495-test
frontend run, `npm run typecheck`, `npm run lint`, `npm run check:readonly`,
`npm run check:expo` with Expo Doctor 21/21, and `npm run check:functions` with
25/25 Deno tests. Existing React `act(...)` and open-worker warnings remain
visible and non-failing. No real bearer or account was used.

The remediation and initial documentation sync were published as
`28ac20204ef4c2386b0aa041f805ee2aea520780`. Exact-head Expo CI run
`32615690386` passed, clearing the diagnostic failure, and Database CI run
`32615690393` passed. The old diagnostic hosted result remains historical
evidence only.

Do not change product timeouts, weaken or serialize CI, deploy/configure
Supabase, execute deletion, mark the PR ready, accept, merge, or touch
production. GitHub metadata, replies/resolutions, hosted configuration,
readiness, merge, and every destructive action remain separate gates.
