---
id: decision-rls-before-client-grants
date: 2026-07-24
updated: 2026-07-26
status: accepted
area: auth-security
tasks: [11, 12]
pr: 14
tags: [grants, rls, service-role, supabase]
supersedes: []
---

# Apply RLS policies before client Data API grants

## Context

Granting `anon` or `authenticated` table privileges in the schema task while a
later task owns policies can leave an exposed table between milestones or make
an incomplete security boundary appear finished.

## Decision

Task 11 enables RLS on every exposed table at creation, explicitly revokes
table privileges from `PUBLIC`, `anon`, and `authenticated`, and gives no
positive client grants. Task 12 defines complete policies, revokes inherited
broad privileges again before rebuilding the allowlist, applies narrow Data
API grants only after those policies, and verifies authorization before the
boundary is accepted.

Privilege tests assert effective access with `has_table_privilege` and
`has_column_privilege`, including access inherited through `PUBLIC`; inspecting
direct grant rows is insufficient. The trusted `service_role` is server-only
and must positively match its exact table-privilege allowlist. Its secret never
enters Expo.

## Consequences

- New exposed tables begin deny-by-default.
- Policies and client grants are reviewed as one authorization boundary in a
  Task 12 migration separate from Task 11's schema migration (never by editing
  an applied Task 11 migration).
- Column-level grants further restrict mutable profile and rating fields.
- A passing RLS test cannot conceal a missing required grant, and a passing
  policy cannot conceal broader access inherited through `PUBLIC`.
- The server-only allowlist is tested positively instead of assuming
  `service_role` bypass behavior is sufficient.

## Revisit when

Supabase provides a deployment mechanism that can prove policies and grants are
applied atomically with equivalent deny-by-default behavior.

## Related

- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `skills/supabase-schema-change/SKILL.md`
