---
id: decision-server-owned-community-score
date: 2026-06-28
updated: 2026-07-26
status: accepted
area: data-supabase
tasks: [11, 12, 13, 14, 16, 17]
pr: null
tags: [aggregates, community-score, integrity, supabase]
supersedes: []
---

# Keep persisted Community Score calculations server-owned

## Context

Community Score and its category averages summarize ratings from many users.
A client-calculated persisted aggregate could be forged, become stale, or
diverge across writers.

## Decision

Supabase owns calculation and persistence of Community Score, rating counts,
and category averages. Clients write an authorized user's rating and read the
trusted aggregate; they do not submit or directly mutate aggregate values.
Each category and overall aggregate is the arithmetic mean rounded to two
decimal places. Community Score is `round(avg(overall) * 10)` from the
unrounded overall mean. A zero-count aggregate keeps its count at `0` and all
averages and Community Score null.

Task 11 selects and implements the durable server mechanism:
`handle_user_rating_change`, a trigger-only `SECURITY DEFINER` entrypoint
invoked on `user_ratings` insert/update/delete, plus zero-count row creation on
`products` insert. The entrypoint uses an empty search path and fully qualified
relations and is not executable by `PUBLIC`, `anon`, or `authenticated`; an
inner refresh helper may remain `SECURITY INVOKER`.
Task 17 verifies and hardens that path; it does not choose among trigger,
RPC, or schedule.

## Consequences

- Rating aggregate tables are not client-writable.
- Empty products have a defined, joinable zero-count/null aggregate state.
- Fixed-value tests must distinguish the unrounded mean used for Community
  Score from the stored two-decimal overall average, including the
  `1, 1, 1, 2` boundary (`overall_avg = 1.25`, Community Score `13`).
- Client roles cannot call the privileged aggregate entrypoint directly.
- Task 11 ships the trigger-owned refresh helpers; Task 17 covers concurrent
  writes, insert/update/delete correctness, authorization/forgery tests, and
  performance evaluation without reopening mechanism selection.
- Changing the mechanism later requires a superseding ADR and a forward
  migration.

## Revisit when

The aggregate moves to another trusted backend with equivalent authorization,
transaction, concurrency, and test guarantees.

## Related

- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
