---
id: decision-no-direct-postgrest-rating-upsert
date: 2026-07-25
updated: 2026-07-25
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
UPDATE contract. Concurrent first saves for the same user and product can both
observe a missing row and race on insert.

## Decision

`saveUserRating` uses an authorized insert for a missing rating and a
score/private-note-only update for an existing rating, or calls a controlled
server function with equivalent restrictions. The client does not issue a
direct PostgREST `.upsert()` of rating identity columns.

When using the split insert/update path, an insert that fails with PostgreSQL
unique-violation `23505` on `(product_id, user_id)` must immediately retry the
permitted score/private-note-only update for that user and product. Prefer a
controlled atomic security-definer function when available; either path must
preserve the no-identity-upsert rule.

## Consequences

- Client writes remain compatible with narrow column grants.
- Ownership, product publication, and immutable identity rules stay enforced.
- Concurrent first-save races do not drop the later submission: conflict
  recovery or an atomic helper leaves one complete rating row.
- Task 16 must test concurrent first saves and prove neither request ends as an
  unhandled unique-constraint failure.

## Revisit when

The API supports a single atomic mutation that preserves the same column,
ownership, publication, and audit-field restrictions.

## Related

- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
