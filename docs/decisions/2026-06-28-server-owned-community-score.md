---
id: decision-server-owned-community-score
date: 2026-06-28
updated: 2026-07-25
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
Task 11 selects and implements the durable server mechanism: a
`SECURITY DEFINER` refresh function invoked by triggers on `user_ratings`
insert/update/delete (plus zero-count row creation on `products` insert).
Task 17 verifies and hardens that path; it does not choose among trigger,
RPC, or schedule.

## Consequences

- Rating aggregate tables are not client-writable.
- Empty products have a defined zero-count aggregate state.
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
