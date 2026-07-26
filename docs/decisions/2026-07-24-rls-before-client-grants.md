---
id: decision-rls-before-client-grants
date: 2026-07-24
updated: 2026-07-25
status: accepted
area: auth-security
tasks: [11, 12]
pr: 14
tags: [grants, rls, supabase]
supersedes: []
---

# Apply RLS policies before client Data API grants

## Context

Granting `anon` or `authenticated` table privileges in the schema task while a
later task owns policies can leave an exposed table between milestones or make
an incomplete security boundary appear finished.

## Decision

Task 11 enables RLS on every exposed table at creation and gives no client
table privileges. Task 12 defines complete policies, applies the narrow
Data API grants only after those policies, and verifies authorization before
the boundary is accepted.

## Consequences

- New exposed tables begin deny-by-default.
- Policies and client grants are reviewed as one authorization boundary in a
  Task 12 migration separate from Task 11's schema migration (never by editing
  an applied Task 11 migration).
- Column-level grants further restrict mutable profile and rating fields.

## Revisit when

Supabase provides a deployment mechanism that can prove policies and grants are
applied atomically with equivalent deny-by-default behavior.

## Related

- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `skills/supabase-schema-change/SKILL.md`
