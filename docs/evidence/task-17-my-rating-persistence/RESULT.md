# Task 17 — My Rating Persistence (rubric + offline reliability)

## Status

**Task 17 — defect corrections and UX packets are committed on PR #36 for
human physical-device review. Not accepted. Not merged.**

Physical-device acceptance exposed two blockers after the first Task 17 commit
(`8c3e648`). Both are corrected on this branch under Task 17 (no Task 17.5).
Later Product Detail restoration and Rate/Edit slider presentation work also
landed on the same branch without changing rating write contracts.

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / check:readonly) | PASS on final tree (see Final automated validation) |
| Local database (`npm run test:db` / `test:db:reset`) | PASS on final tree (pgTAP + concurrency harness) |
| Simulator / web mobile preview | See companion UX packets; not re-run in this reliability packet |
| Physical iPhone matrix A–F | **PENDING HUMAN** |
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
- Final pre-physical-acceptance review correction: **this commit** (mismatch
  caption honesty, Slider VoiceOver absolute-scale text, removal of temporary
  `docs/superpowers` planning artifacts, evidence SHA sync)

Record the pushed tip from `git rev-parse HEAD` after this commit lands; physical
testing must use that exact tip SHA, not an intermediate commit.

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

## Security / privacy notes

- Identity columns never appear in UPDATE payloads.
- Private note is owner-only.
- No service-role credential in Expo.
- Client never writes `rating_aggregates` or `score` / `methodology_version`.
- Previously applied migrations: **unchanged** (forward-only correction only).
- Staging / production databases: **untouched**.

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
| Focused Product Detail / Rate/Edit / slider Jest | PASS — 3 suites, 30 tests |
| `npm run typecheck` | PASS (via `npm run check`) |
| `npm run lint` | PASS (via `npm run check`) |
| `npm test` | PASS — 34 suites, 243 tests |
| `npm run types:check` | Not re-run this pass; generated types unchanged by the final tip |
| `npm run check:readonly` | PASS (via `npm run check`) |
| `npm run check` | PASS — full Expo handoff gate incl. expo-doctor 20/20 and dependency alignment |
| `npm run test:db:reset` | PASS — pgTAP 481 tests; concurrency harness 2 scenarios |
| `git diff --check` | PASS |

Jest retained pre-existing asynchronous teardown warnings (overlapping `act()`
and a worker forced to exit) while returning exit code 0.

## Explicit non-claims

- Physical-device matrix A–F: **PENDING HUMAN**
- Authenticated slider gestures / VoiceOver / physical Product Detail:
  **PENDING HUMAN** (see companion UX packets)
- Human acceptance / merge: **NOT CLAIMED / NOT AUTHORIZED**
- Staging / production: **untouched**
- Offline write queue / optimistic rating: **not implemented**
- Task 18: **not started**
