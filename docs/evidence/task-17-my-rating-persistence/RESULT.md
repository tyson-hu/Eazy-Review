# Task 17 — My Rating Persistence (rubric + offline reliability)

## Status

**Task 17 — defect corrections implemented for human review. Not accepted. Not merged.**

Physical-device acceptance exposed two blockers after the first Task 17 commit
(`8c3e648`). Both are corrected on this branch under Task 17 (no Task 17.5).

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / check:readonly) | See latest agent run in this document |
| Local database (`npm run test:db` / `test:db:reset`) | PASS after sneaker-10-v1 migration (pgTAP plan counts updated) |
| Simulator / web mobile preview | Not required for this correction pass unless re-run |
| Physical iPhone matrix A–F | **PENDING HUMAN** |
| Human acceptance | **NOT CLAIMED** |
| Merge | **NOT AUTHORIZED** |

## Branch and SHAs

- Branch: `agent/task-17-my-rating-persistence`
- Prior delivered commit (kept intact): `8c3e648` — Implement Task 17 My Rating
  persistence and Rated Products
- Correction work: uncommitted / pending commit sequence (model → offline → UI
  → docs) until human review

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

## Later Task 17 UX packets (same branch / PR #36)

These do not change rating write contracts. They are presentation and gesture
corrections awaiting human verification:

- Product Detail restoration:
  [`docs/evidence/task-17-product-detail-restoration/RESULT.md`](../task-17-product-detail-restoration/RESULT.md)
- Rate/Edit native slider gesture:
  [`docs/evidence/task-17-rating-slider-gesture/RESULT.md`](../task-17-rating-slider-gesture/RESULT.md)

## Physical-device checklist (human)

Record PASS/FAIL with date and build/Expo channel notes.

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| A | Online normal save | Spinner ends; back to Detail; My Rating + Community refresh | PENDING |
| B | Known offline before Save | Immediate offline feedback; no endless spinner; form kept; retry after reconnect | PENDING |
| C | Drop connection during request | Settles via timeout/transport; form kept | PENDING |
| D | Device online, local Supabase unreachable | Timeout/unreachable (not “you're offline”); no spinner | PENDING |
| E | Rate offline, no cached owner rating | Explicit offline, not infinite Loading | PENDING |
| F | Offline with cached Detail/owner data | Cached readable; offline/stale clear; reconnect refresh | PENDING |

## Security / privacy notes

- Identity columns never appear in UPDATE payloads.
- Private note is owner-only.
- No service-role credential in Expo.
- Client never writes `rating_aggregates` or `score` / `methodology_version`.
- Previously applied migrations: **unchanged** (forward-only correction only).
- Staging / production databases: **untouched**.

## Automated commands (re-run before handoff)

Update table when this correction suite is re-executed.

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 33 suites, 232 tests |
| `npm run types:check` | PASS — generated types match local schema |
| `npm run check:readonly` | PASS (via `npm run check`) |
| `npm run check` | PASS — full Expo handoff gate incl. expo-doctor 20/20 |
| `npm run test:db:reset` | PASS — pgTAP 479 tests; concurrency harness 2 scenarios |
| `git diff --check` | PASS |

## Explicit non-claims

- Physical-device matrix A–F: **PENDING HUMAN**
- Human acceptance / merge: **NOT CLAIMED / NOT AUTHORIZED**
- Staging / production: **untouched**
- Offline write queue / optimistic rating: **not implemented**
