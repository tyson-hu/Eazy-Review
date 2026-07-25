---
id: decision-no-direct-postgrest-rating-upsert
date: 2026-07-25
status: accepted
area: data-supabase
tasks: [16]
pr: 14
tags: [postgrest, ratings, supabase, writes]
supersedes: []
---

# Do not use direct PostgREST upsert for My Rating

## Context

The rating table uses column-level grants so clients can change scores and a
private note but cannot rewrite identity or audit columns. A natural PostgREST
upsert includes conflict and identity fields that do not fit that restricted
UPDATE contract.

## Decision

`saveUserRating` uses an authorized insert for a missing rating and a
score/private-note-only update for an existing rating, or calls a controlled
server function with equivalent restrictions. The client does not issue a
direct PostgREST `.upsert()` of rating identity columns.

## Consequences

- Client writes remain compatible with narrow column grants.
- Ownership, product publication, and immutable identity rules stay enforced.
- Insert/update race behavior and errors require explicit Task 16 tests.

## Revisit when

The API supports a single atomic mutation that preserves the same column,
ownership, publication, and audit-field restrictions.

## Related

- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
