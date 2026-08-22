# Task 19 — Protected Account Deletion

## Status

**Partial — implementation complete; human staging deletion pending.**

This packet is published in draft PR #43 on
`codex/task-19-guarded-account-deletion`. The original implementation head is
`1391effa102e3f0434c69ede179144c2213d3c53`; the current local remediation is
not yet published. The live PR becomes authoritative for its exact head and
checks after push. No deployment, hosted configuration, account deletion,
readiness transition, acceptance, merge, or production action occurred.

## Evidence matrix

| Surface | Status | Evidence / boundary |
| --- | --- | --- |
| Mocked Edge Function tests | **pass** | `npm run check:functions`: Deno format/lint/frozen check plus 25 injected-mock tests; no live Auth call |
| Principal-bound Auth-storage races | **pass** | Exact post-SDK adoption, pre-dispatch raw authority, exact displaced-A CAS, C-before-B with delayed event delivery, empty/A2/malformed/blocked preservation, unavailable/invalid replacement, and final raw-publication regressions pass |
| Preparing/pending/settled, offline bootstrap, and late Auth proof | **pass** | Non-destructive unit/provider tests; no hosted session used |
| Two-context notification, cache isolation, foreground/mount reconciliation | **pass** | Payload-free web/native coordination and provider tests; foreground behavior is mocked, not interactive proof |
| Client/provider/UI Jest | **pass** | Default parallel Jest and a Node 24 three-worker no-cache run each passed 41 suites / 465 tests after the online test-isolation correction; existing React `act` and forced-exit teardown warnings remain visible |
| Read-only FK metadata proof | **pass** | Exact-head Database CI on `1391effa...` passed the two pg_catalog assertions, local reset, pgTAP/concurrency suite, and generated-type parity without deleting an account |
| `npm run check:readonly` | **pass** | Skill wrappers, decisions, secrets, agent infrastructure, typecheck, and lint passed on the corrected tree |
| `npm run check:expo` | **pass** | Post-`npm ci` remediation run passed route preparation, `check:readonly`, 41 suites / 465 Jest tests, Expo Doctor 21/21, and Expo dependency alignment |
| Exact-head Expo CI | **not-run** | Corrected remediation head is not yet published. The prior `1391effa...` head failed twice with a first timeout consistent with the locally reproduced offline-`onlineManager` state; the failed runners did not directly record the singleton value |
| Exact-head Database CI | **not-run** | Corrected remediation head is not yet published; prior `1391effa...` Database CI passed |
| Web mobile preview | **not-run** | No authenticated safe review session was used |
| iOS Simulator | **not-run** | No authenticated safe review session was used |
| Physical device | **not-tested** | Human-only review remains outstanding |
| Staging Function deployment/configuration | **not-run** | Not authorized; hosted JWT expiry and credential wiring remain unverified |
| Human staging deletion | **not-tested** | Human-only on every environment; agents/tools never submit deletion |
| Second-session refresh rejection | **not-tested** | Human staging matrix only |
| Residual JWT-expiry observation | **not-tested** | Hosted JWT lifetime must be verified at no more than 3,600 seconds |
| Human acceptance | **not-run** | No acceptance claim |
| Production | **not-run** | Production untouched |

Status vocabulary follows `docs/evidence/README.md`: automated/environment
surfaces use `pass` / `fail` / `blocked` / `not-run`; physical/destructive
human surfaces use `tested-pass` / `tested-fail` / `not-tested`.

## Implemented local boundary

- Inline signed-in-only **Delete Account** confirmation; no deletion route.
- Secure **Current password** reauthentication for the fixed current email.
- Isolated non-persisting Auth and Functions clients; exact fresh bearer;
  target-free, zero-body request; no automatic destructive retry.
- Caller/claim/live-session/recent-password-AMR validation, confirmed global
  refresh-session revocation, one hard-delete attempt, and at most one
  non-destructive uncertainty lookup.
- Honest deleted, retained-account-signed-out, ambiguous-signed-out, and
  superseded outcomes.
- Non-stealing Auth/storage locking, minimized revision-bound local guard,
  exact-session cleanup/adoption/CAS, payload-free cross-context signals, and
  latest-winner/cache arbitration that preserves B/C. Deletion restoration
  performs no shared-session write.
- Exact catalog-only FK metadata assertions for the two accepted cascades; no
  migration or generated database type changed.

## Security and lifecycle notes

- Agents never invoked the Function with a real bearer and never submitted the
  confirmation in a browser, simulator, device, SQL tool, Auth Admin tool, or
  API client.
- No token, password, email, user ID, session object, server credential, or
  recovery URL is retained in this evidence.
- Guard metadata is local operational safety state, not retained product data;
  it contains no token/password/email/profile/rating/note/server result.
- Global sign-out removes refresh capability but does not invalidate an
  already-issued JWT signature before `exp`; staging must prove the configured
  expiry bound and residual behavior.
- The full unabortable recovery callback is not wrapped in the provider FIFO:
  that exact arrangement reproduced an accepted Task 18 deadlock. Post-SDK
  guarded adoption instead reacquires Auth/storage locks, exact-checks current
  authority, and returns `superseded` when B/C won. Superseded recovery may
  replace only exact displaced A with isolated-valid B through an application-
  owned CAS; raw C/A2/empty/malformed/blocked authority is preserved.
- A fresh audit found that SDK `setSession(B)` could overwrite raw C before C's
  delayed Auth event. The authorized correction removed deletion restoration
  writes and replaced recovery restoration with the exact CAS. Its independent
  review found one test-coverage gap; the bounded review-fix pass added A2,
  malformed, blocked, uncertainty, and no-transient-B proof.

## Remaining human staging matrix

- profile, My Rating, and private-note cascade;
- shared-product Community Score recomputation;
- last-rater count `0` with null averages/score;
- local auth/cache cleanup and anonymous Browse;
- offline relaunch does not restore guarded deleted authority;
- deleted-credential sign-in rejection;
- second pre-existing session cannot refresh;
- already-issued access-token behavior through `exp`; and
- hosted JWT expiry no greater than 3,600 seconds.

Nothing in this local evidence is physical, destructive, deployed, accepted,
ready, merged, or production verification.

## Local automated handoff

| Command | Result |
| --- | --- |
| `npm run check:functions` | **pass** — 25 Deno tests; format, lint, and frozen type-check pass |
| Focused storage/recovery/deletion correction | **pass** — 3 suites / 81 tests before the provider-level finding |
| Focused superseded recovery provider regression | **pass** — stored B wins, stale A never publishes, A cache is removed, and B/public cache remains |
| Superseded recovery fallback review cases | **pass** — unavailable validation settles non-A then converges; invalid exact B is removed; recovery-owned B is suppressed and raw C wins |
| C-before-B RED/green regression | **pass** — both recovery and deletion first failed by publishing B, then preserved/published already-stored C after correction |
| CAS/provider correction set | **pass** — 3 suites / 128 tests; exact A→B, C/A2/empty/malformed/blocked preservation, uncertainty/no-retry, and no deletion `setSession` |
| Correction auth/storage/cache matrix | **pass** — final verifier 9 suites / 219 tests; pre-existing React `act` warnings remain visible |
| Independent CAS correction review | **needs fixes, addressed** — no production defect; one Important test-matrix finding accepted and corrected in the one review-fix pass |
| Independent final CAS verifier | **pass** — 9 suites / 219 tests, full Jest 41 suites / 465 tests, Deno 25/25, `check:readonly`, whitespace, and empty migration/generated-type diff |
| Auth/storage/cache matrix | **pass** — 9 suites / 209 tests |
| Prior pre-CAS final verifier | **pass** — historical AuthProvider 49/49, 9-suite matrix 209/209, Deno 25/25, `check:readonly`, whitespace, and migration/generated-type diff |
| `npm run check:readonly` after CAS docs | **pass** — wrappers, decisions, secrets, agent infrastructure, typecheck, and lint |
| `npm test -- --runInBand --forceExit` after CAS | **pass** — 41 suites / 465 tests; pre-existing React `act` and forced-exit teardown warnings remain |
| Exact-head Expo CI reproduction on `1391effa...` | **fail** — both attempts reached the same first 5-second recovery-test timeout and the same nine contaminated follow-on failures |
| Offline-singleton RED / GREEN | **pass** — forcing `onlineManager` offline reproduced the exact first timeout; resetting it in the file-level `beforeEach` made the focused test pass without increasing a timeout |
| Node 24 CI-shaped Jest | **pass** — 41 suites / 465 tests with three workers and a cold Jest cache |
| Expo SDK 57 patch alignment | **pass** — Expo resolved the five direct packages to `expo` 57.0.15, `expo-constants` 57.0.13, `expo-dev-client` 57.0.14, `expo-linking` 57.0.7, and `expo-router` 57.0.15; clean `npm ci` passed |
| Current `npm run check:expo` | **pass** — route preparation, `check:readonly`, 41 suites / 465 Jest tests, Expo Doctor 21/21, and dependency alignment passed after clean install |
| Current `CI=1 npx expo export --platform web` | **pass** — 16 static routes exported; no authenticated or destructive flow was exercised |
| Prior Task 19 `npx expo install --check` | **fail, resolved locally** — the five inherited patch mismatches above motivated the bounded alignment |
| `git diff --check` | **pass** |
| Migration/generated-type diff | **pass** — no changed path under `supabase/migrations` or `src/types/database.generated.ts` |

Earlier correction passes removed stale SDK-view publication and completed
unavailable/invalid terminal settlement. The later C-before-B audit proved that
serialization alone was insufficient: a delayed C event allowed stale
`setSession(B)` to overwrite raw C before final checks. The current correction
uses exact raw compare-and-commit only for displaced-A recovery and no session
write for deletion restoration. Current focused and matrix results are above;
the final full-suite/read-only verifier results are recorded after the final
documentation gate.

Existing React Testing Library `act`/worker-teardown warnings remain visible
and are not reported as resolved.
