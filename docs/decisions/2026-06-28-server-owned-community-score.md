---
id: decision-server-owned-community-score
date: 2026-06-28
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

## Consequences

- Rating aggregate tables are not client-writable.
- Empty products have a defined zero-count aggregate state.
- Task 17 must select and test the exact server mechanism, including concurrent
  writes, without weakening this ownership boundary.

## Revisit when

The aggregate moves to another trusted backend with equivalent authorization,
transaction, concurrency, and test guarantees.

## Related

- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
