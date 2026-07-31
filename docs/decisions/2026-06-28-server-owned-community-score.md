---
id: decision-server-owned-community-score
date: 2026-06-28
updated: 2026-07-30
status: accepted
area: data-supabase
tasks: [11, 12, 13, 15, 17]
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
invoked by statement-level `user_ratings` insert/update/delete triggers, plus
zero-count row creation on `products` insert. Transition tables provide the
complete affected row set; the entrypoint derives a 64-bit advisory-lock key
for every distinct product and processes the actual keys in stable order so
multi-product statements cannot invert transaction advisory locks. The
entrypoint uses an empty search path and fully qualified relations and is not
executable by `PUBLIC`, `anon`, or `authenticated`; an inner refresh helper may
remain `SECURITY INVOKER`. Tasks 11–12 already verify and harden this path.
Task 17 proves through real app mutations that the accepted path remains in
effect; it does not choose among trigger, RPC, or schedule.

## Consequences

- Rating aggregate tables are not client-writable.
- Empty products have a defined, joinable zero-count/null aggregate state.
- Fixed-value tests must distinguish the unrounded mean used for Community
  Score from the stored two-decimal overall average, including the
  `1, 1, 1, 2` boundary (`overall_avg = 1.25`, Community Score `13`).
- Client roles cannot call the privileged aggregate entrypoint directly.
- Multi-product rating statements acquire aggregate locks in stable 64-bit key
  order; concurrency tests cover both a same-product insert race and
  overlapping fixture-only rating deletes across two products without deleting
  auth accounts.
- Tasks 11–12 ship and verify the trigger-owned refresh helpers, concurrency,
  insert/update/delete correctness, and authorization/forgery boundaries.
  Task 17 keeps those suites passing and adds app-level save/edit verification
  without reopening mechanism selection.
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
