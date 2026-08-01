---
id: decision-no-direct-postgrest-rating-upsert
date: 2026-07-25
updated: 2026-08-01
status: accepted
area: data-supabase
tasks: [12, 17]
pr: 14
tags: [postgrest, privacy, ratings, supabase, writes]
supersedes: []
---

# Do not use direct PostgREST upsert for My Rating

## Context

The rating table uses column-level grants so clients can change scores and a
private note but cannot rewrite identity or audit columns. A natural PostgREST
upsert includes conflict and identity fields that do not fit that restricted
UPDATE contract. Concurrent first saves for the same user and product can both
observe a missing row and race on insert. The same row contains
`private_note`, which belongs to My Rating and is not public review content.

## Decision

The Task 17 MVP `saveUserRating` path is the direct RLS-protected split path:

1. Read the caller's existing rating.
2. Insert identity, scores, and optional `private_note` when absent.
3. Update only scores and `private_note` when present.
4. On PostgreSQL unique violation `23505` for `(product_id, user_id)`, retry
   the permitted score/private-note-only update.

Do not add a `SECURITY DEFINER` save function unless this accepted path proves
insufficient through a reproducible correctness or performance defect and a
separately authorized schema/security change. The client does not issue a
direct PostgREST `.upsert()` of rating identity columns.

Raw `user_ratings` reads remain owner-only. Public community surfaces read
server-owned `rating_aggregates`; they never expose another user's
`private_note`.

## Consequences

- Client writes remain compatible with narrow column grants.
- Ownership, product publication, and immutable identity rules stay enforced.
- A user's private note cannot leak through public Community Score reads.
- Concurrent first-save races do not drop the later submission: conflict
  recovery leaves one complete rating row.
- Task 17 must test concurrent first saves and prove neither request ends as an
  unhandled unique-constraint failure.
- A new save function requires both defect evidence and separate authorization
  for the schema/security change.

## Revisit when

A reproducible correctness or performance defect shows the accepted direct
path is insufficient and a separately authorized schema/security change can
preserve the same column, ownership, publication, and audit-field restrictions.

## Related

- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
