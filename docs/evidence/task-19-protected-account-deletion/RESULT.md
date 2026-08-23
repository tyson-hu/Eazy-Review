# Task 19 — Protected Account Deletion

## Status

**Partial — implementation complete; human staging deletion pending.**

This packet is published in draft PR #43 on
`codex/task-19-guarded-account-deletion`. The original implementation head is
`1391effa102e3f0434c69ede179144c2213d3c53`; the first validation remediation
is published at `1a515e13b1992f6dcc53f08a030e28acf0022d13`, the controlled
warm-link repair at `95765558843cda68150e6fece9a2eda8c37afea3`, and the
diagnostic baseline at `b843dc8c786d4e2c4ea58856f58926dfb6b69cf9`. The
bounded three-invariant remediation is frozen locally as product/test Git tree
`3d8bf2be5cfadab6197c95b4f4036006df4caab4`. At this documentation checkpoint
those corrected bytes are not yet committed or pushed, so their exact-head
hosted CI does not yet exist. The live PR becomes authoritative after
publication. No
deployment, hosted configuration, account deletion, readiness transition,
acceptance, merge, or production action occurred.

## Evidence matrix

| Surface | Status | Evidence / boundary |
| --- | --- | --- |
| Mocked Edge Function tests | **pass** | `npm run check:functions`: Deno format/lint/frozen check plus 25 injected-mock tests; no live Auth call |
| Principal-bound Auth-storage races | **pass** | Exact post-SDK adoption, pre-dispatch raw authority, exact displaced-A CAS, C-before-B with delayed event delivery, empty/A2/malformed/blocked preservation, unavailable/invalid replacement, and final raw-publication regressions pass |
| Preparing/pending/settled, offline bootstrap, and late Auth proof | **pass** | Non-destructive unit/provider tests; no hosted session used |
| Injected storage-key precedence | **pass** | With ambient public Supabase configuration present, provider/API reconciliation reads only the injected Auth slot and leaves the derived public slot untouched |
| Auth-lock-before-arm / A2 rollback | **pass** | Guard arm waits behind prior Auth work, releases before isolated reauthentication, and confirmed pre-revocation rollback preserves exact rotated A2 while later A3 remains quarantined |
| Settled S1-to-S2 recovery | **pass** | Exact settled S1/guard capture, distinct- and same-session-ID S2, and already-exact-S2 adoption pass without redundant or premature publication |
| Lease-expired-pending recovery | **pass** | Exact session and empty predecessors adopt S2 only while guard/raw authority remains exact; changed and unavailable authority is preserved |
| Unknown-displacement cleanup | **pass** | Missing exact displacement removes no primary/companion storage or same-principal cache; valid S1 publishes only after isolated validation and exact recheck |
| Recovery S2 publication | **pass** | Recovery-owned S2 events remain maintenance-only until exact guarded adoption releases quarantine and current raw authority wins |
| Two-context notification, cache isolation, foreground/mount reconciliation | **pass** | Payload-free web/native coordination and provider tests; foreground behavior is mocked, not interactive proof |
| Client/provider/UI Jest | **pass** | Disposable affected run passed 6 suites / 205 tests; full frontend run passed 41 suites / 495 tests. Existing React `act` and open-worker warnings remain visible |
| Read-only FK metadata proof | **pass** | Exact-head Database CI on diagnostic `b843dc8...` passed the catalog assertions, local reset, pgTAP/concurrency suite, generated-type parity, and cleanup without deleting an account; remediation changes no database source |
| `npm run check:readonly` | **pass** | Skill wrappers, decisions, secrets, agent infrastructure, typecheck, and lint passed on product/test tree `3d8bf2b...` in disposable credential-free validation |
| `npm run check:expo` | **pass** | Product/test tree `3d8bf2b...` passed route preparation, `check:readonly`, 41 suites / 495 Jest tests, Expo Doctor 21/21, and dependency alignment in disposable credential-free validation |
| Exact-head Expo CI — diagnostic `b843dc8...` | **fail** | Reconciliation read the environment-derived empty Auth slot; 40/41 suites and 455/465 tests passed. This is the frozen diagnostic baseline, not validation of the local remediation |
| Exact-head Expo CI — remediation candidate | **not-run** | Corrected bytes are not yet published at this documentation checkpoint |
| Exact-head Database CI — diagnostic `b843dc8...` | **pass** | Deno Function checks, local reset, pgTAP/concurrency tests, generated-type parity, and cleanup passed |
| Exact-head Database CI — remediation candidate | **not-run** | Corrected bytes are not yet published; no database source changed in this remediation |
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
- Explicit/injected/singleton Auth storage-key precedence; a short Auth-lock-
  before-arm section that drains earlier work and preserves A2 on rollback.
- Operation-local exact settled/expired-pending recovery predecessors; S2 stays
  maintenance-only until exact guarded adoption succeeds, and unknown
  displacement grants no session, companion, or same-principal cache cleanup.
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
| Frozen product/test candidate | **pass** — repository tree `3d8bf2be5cfadab6197c95b4f4036006df4caab4`; validation-only dependency symlink excluded, and all 12 tracked modified paths byte-matched the active worktree |
| Current affected frontend matrix | **pass** — 6 suites / 205 tests; injected-key, Auth-lock-before-arm/A2 rollback, exact settled/expired-pending adoption, unknown displacement, and no-transient-S2 coverage |
| Current full frontend suite | **pass** — 41 suites / 495 tests; existing React `act(...)` and open-worker warnings remain visible |
| Current `npm run typecheck` / `npm run lint` | **pass** |
| Current `npm run check:readonly` | **pass** — wrappers, decisions, secrets, agent infrastructure, typecheck, and lint |
| Current `npm run check:expo` | **pass** — route preparation, `check:readonly`, 41 suites / 495 tests, Expo Doctor 21/21, and dependency alignment |
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
| Offline-singleton RED / GREEN | **pass, insufficient alone** — forcing `onlineManager` offline reproduced the exact first timeout and justified the file-level reset, but `1a515e1...` exact-head CI retained the timeout |
| Exact-head Expo CI on `1a515e1...` | **fail** — the same first timeout and nine follow-on failures recurred after online reset and SDK patch alignment; Database CI passed |
| Final controlled warm-link repair | **pass locally** — the test waits for signed-out bootstrap, seeds A/B cache, triggers the same callback through the provider listener, retains every authority/storage/cache assertion, and cleans up in `finally`; focused 50/50 and full 465/465 passed |
| Node 24 CI-shaped Jest | **pass** — 41 suites / 465 tests with three workers and a cold Jest cache |
| Expo SDK 57 patch alignment | **pass** — Expo resolved the five direct packages to `expo` 57.0.15, `expo-constants` 57.0.13, `expo-dev-client` 57.0.14, `expo-linking` 57.0.7, and `expo-router` 57.0.15; clean `npm ci` passed |
| Prior pre-remediation `npm run check:expo` | **pass** — route preparation, `check:readonly`, 41 suites / 465 Jest tests, Expo Doctor 21/21, and dependency alignment passed after clean install |
| Prior `CI=1 npx expo export --platform web` | **pass** — 16 static routes exported; no authenticated or destructive flow was exercised |
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
