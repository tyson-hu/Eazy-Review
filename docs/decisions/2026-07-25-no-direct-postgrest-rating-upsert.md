---
id: decision-no-direct-postgrest-rating-upsert
date: 2026-07-25
updated: 2026-07-26
status: accepted
area: data-supabase
tasks: [12, 16]
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

`saveUserRating` uses an authorized insert for a missing rating and a
score/private-note-only update for an existing rating, or calls a
`SECURITY DEFINER` server function that enforces the same restrictions
inside the function body. The client does not issue a direct PostgREST
`.upsert()` of rating identity columns.

Raw `user_ratings` reads remain owner-only. Public community surfaces read
server-owned `rating_aggregates`; they never expose another user's
`private_note`.

When the preferred definer helper is used, it must:

- derive the owner solely from `auth.uid()` (no trusted client `user_id`);
- reject unauthenticated callers and unpublished products;
- on insert, write validated `product_id` and server-derived `auth.uid()` with
  scores and `private_note`; on conflict, update only scores and
  `private_note` (never identity or audit columns);
- use `SECURITY DEFINER SET search_path = ''` with fully qualified names;
- `REVOKE EXECUTE` from `PUBLIC` / `anon` and `GRANT EXECUTE` only to
  `authenticated`.

When using the split insert/update path, an insert that fails with PostgreSQL
unique-violation `23505` on `(product_id, user_id)` must immediately retry the
permitted score/private-note-only update for that user and product. Prefer the
atomic definer helper when available; either path must preserve the
no-identity-upsert rule.

## Consequences

- Client writes remain compatible with narrow column grants.
- Ownership, product publication, and immutable identity rules stay enforced.
- A user's private note cannot leak through public Community Score reads.
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
