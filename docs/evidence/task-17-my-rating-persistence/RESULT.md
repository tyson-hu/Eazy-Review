# Task 17 — My Rating Persistence (rubric + offline reliability)

## Status

**Task 17 — defect corrections, UX packets, auth-restore hardening, and
incomplete-submit feedback are committed on PR #36 for human physical-device
review. Not accepted. Not merged.**

Physical-device acceptance exposed two blockers after the first Task 17 commit
(`8c3e648`). Both are corrected on this branch under Task 17 (no Task 17.5).
Later Product Detail restoration and Rate/Edit slider presentation work also
landed on the same branch without changing rating write contracts. Auth restore
was hardened after a zombie-session physical finding; incomplete Save now
surfaces sticky-footer feedback instead of a silent no-op.

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / check:readonly) | PASS on final tree (see Final automated validation) |
| Local database (`npm run test:db` / `test:db:reset`) | PASS on prior tip; **no DB change** on this incomplete-submit patch |
| Simulator / web mobile preview | See companion UX packets; not re-run in this reliability packet |
| Physical iPhone matrix A–G | **PENDING HUMAN** |
| Human acceptance | **NOT CLAIMED** |
| Merge | **NOT AUTHORIZED** |

## Branch and SHAs

- Branch: `agent/task-17-my-rating-persistence` (PR #36, draft)
- Prior delivered commit (kept intact): `8c3e648` — Implement Task 17 My Rating
  persistence and Rated Products
- Rubric + offline reliability correction: `2c21317`
- Docs/ADR sync: `221396a`
- Evidence matrix update: `34ca88b`
- Product Detail restoration + Rate/Edit native slider: `6863a91`
- Prior tip before this auth patch: `6863a91a0333b64f3a1ae15468aa6bee41db98ff`
- Auth zombie-session restore hardening: `1325198`
- Incomplete-submit UI feedback (sticky footer + field errors): `2c4c7f2`

Physical testing must use tip `2c4c7f2` (or later on this branch), not an
intermediate commit.

## Defects corrected

### A — Rating model / score contract

- Root cause: editable Overall 1–10 was shown through 0–100 ScoreBadge semantics;
  Community dimensions did not match Eazy structure.
- Fix: shared **sneaker-10-v1** ten-dimension rubric; composites always 0–100
  derived by `round(sum of dimensions)`; no client-written composite;
  forward-only migration; ScoreBadge `score100`; RatingRow `score10`.

### B — Offline / timeout / infinite pending

- Root cause: TanStack mutation `networkMode: 'online'` paused save offline;
  UI treated any pending as “Saving…”; no bounded abort for unreachable host.
- Fix: save mutation `networkMode: 'always'`; NetInfo fail-fast offline;
  `withRequestTimeout` (10s) aborting PostgREST; paused query/mutation
  presentation; form state preserved; no offline write queue.

### C — Zombie restored local session after local Auth wipe

- Root cause: `restoreSession()` used local `getSession()` only. After local
  Supabase reset, AsyncStorage could still hold tokens for a deleted principal;
  the app published signed-in while Account/Rate could not operate against a
  missing Auth user / profile.
- Fix (this patch): when online, validate with Auth `getUser()`; clear
  current-device session only on definitive invalid identity/session Auth
  errors; preserve local session when offline or validation fails transiently;
  keep Task 16 generation / user-scoped cache safety. Profile existence is not
  the identity validity check.

### D — Incomplete Save looked like a no-op

- Root cause: missing dimensions only marked field errors on rows often scrolled
  out of view; the sticky footer error region stayed empty, so Save appeared to
  do nothing.
- Fix: sticky footer summary ("N categories still need a score…") plus per-field
  incomplete copy; no network write until all ten dimensions are set.

## Scope delivered (correction)

1. Forward migration
   `supabase/migrations/20260809151511_task_17_sneaker10_rating_rubric.sql`
2. Regenerated `src/types/database.generated.ts` and deliberate seed fixtures
3. Domain: dimensions, score formula, validation, errors, API, queries, mutations
4. UI: Rate form groups + steppers; Product Detail Eazy vs Community comparison;
   Rated Products `myScore100`
5. Network: `src/lib/network/requestTimeout.ts` (`DEFAULT_REQUEST_TIMEOUT_MS = 10000`)
6. Docs + ADRs: `sneaker-10-v1` rubric; connected request reliability
7. Focused tests for formula, offline settle, timeout, queries, lifecycle
8. Auth restore validation + definitive-invalid classification + focused
   restore regression tests (zombie / offline / transient)
9. Incomplete Save sticky footer + field-error feedback and Rate form unit test

## Companion Task 17 UX packets (same branch / PR #36)

These do not change rating write contracts. Presentation and gesture evidence
remain separately recorded; human device verification is still required:

- Product Detail restoration:
  [`docs/evidence/task-17-product-detail-restoration/RESULT.md`](../task-17-product-detail-restoration/RESULT.md)
- Rate/Edit native slider gesture:
  [`docs/evidence/task-17-rating-slider-gesture/RESULT.md`](../task-17-rating-slider-gesture/RESULT.md)

## Physical-device checklist (human)

Record PASS/FAIL with date and build/Expo channel notes. **All rows remain
PENDING HUMAN** — do not treat earlier automated or simulator packets as
substitute acceptance.

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| A | Online normal save | Spinner ends; back to Detail; My Rating + Community refresh | PENDING |
| B | Known offline before Save | Immediate offline feedback; no endless spinner; form kept; retry after reconnect | PENDING |
| C | Drop connection during request | Settles via timeout/transport; form kept | PENDING |
| D | Device online, local Supabase unreachable | Timeout/unreachable (not “you're offline”); no spinner | PENDING |
| E | Rate offline, no cached owner rating | Explicit offline, not infinite Loading | PENDING |
| F | Offline with cached Detail/owner data | Cached readable; offline/stale clear; reconnect refresh | PENDING |
| G | Zombie local session recovery | After local Supabase wipe with phone session kept, relaunch online → signed-out, no stale user-scoped data, sign-up/sign-in works | PENDING |

### Scenario G procedure (human-only)

1. Sign in on the physical device against local Supabase.
2. Confirm Account is valid.
3. Reset/wipe the local Supabase stack so that user no longer exists.
4. Keep the app's local persisted session intact (do not Sign out first).
5. Relaunch/reload the app while the phone can reach local Supabase.
6. Expected:
   - app does not remain falsely signed in
   - stale principal is removed locally
   - Account shows signed-out state
   - prior user-scoped data is not visible
   - user can sign up/sign in again normally

## Security / privacy notes

- Identity columns never appear in UPDATE payloads.
- Private note is owner-only.
- No service-role credential in Expo.
- Client never writes `rating_aggregates` or `score` / `methodology_version`.
- Previously applied migrations: **unchanged** (forward-only correction only).
- Staging / production databases: **untouched**.
- Auth restore cleanup uses local/current-device session scope only — no global
  revocation, no account deletion, no staging/production contact.

## Automated validation history

### Earlier branch run (correction-era record; not the final tip)

Retained for chronology only. Counts describe the tree when the correction suite
was first recorded on this branch, **before** Product Detail restoration / slider
gesture commit `6863a91` and the final review tip.

| Command | Result (historical) |
| --- | --- |
| `npm test` | PASS — 33 suites, 232 tests (pre-slider packet) |
| `npm run test:db:reset` | PASS — pgTAP 479 tests; concurrency harness 2 scenarios |

### Final automated validation (this packet + tree under final tip)

| Command | Result |
| --- | --- |
| Focused RateAndDetail Jest (incomplete-submit + existing Task 17 form cases) | PASS — 12 tests |
| `npm test` (full unit suite under current tip) | PASS — re-verify at handoff if required |
| `npm run types:check` | Not required — generated types unchanged by this patch |
| `npm run test:db:reset` | Not required for this UI-only patch (no schema change) |
| `git diff --check` | PASS |

Auth-restore gates from the prior tip (`1325198`) remain: typecheck, lint,
check:readonly, and full Jest suite were green; this patch adds incomplete-submit
coverage on the Rate form only.

## Explicit non-claims

- Physical-device matrix A–G: **PENDING HUMAN**
- Authenticated slider gestures / VoiceOver / physical Product Detail:
  **PENDING HUMAN** (see companion UX packets)
- Human acceptance / merge: **NOT CLAIMED / NOT AUTHORIZED**
- Staging / production: **untouched**
- Offline write queue / optimistic rating: **not implemented**
- Task 18: **not started**
