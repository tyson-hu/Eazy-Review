---
id: decision-profile-row-on-auth-user-insert
date: 2026-07-25
status: accepted
area: auth-security
tasks: [11, 12, 15]
pr: 14
tags: [auth, profiles, supabase, triggers]
supersedes: []
---

# Create a profile row when an auth user is inserted

## Context

The Account flow needs one `public.profiles` row for every `auth.users` row.
Clients have no profile INSERT permission, so a successful signup otherwise
has nothing for owner-only profile UPDATE or Account reads to target.

## Decision

Use a protected `AFTER INSERT ON auth.users` trigger to insert
`public.profiles (id)` for the new user. Revoke client execution paths; clients
may read their permitted profile data and update only their own mutable
columns.

## Consequences

- Every new account receives exactly one corresponding profile row.
- Signup and authorization tests verify profile creation and reject client
  profile INSERT.
- Onboarding fields that are not safe defaults remain later owner updates.

## Revisit when

Profile creation requires mandatory onboarding data that cannot be initialized
safely and transactionally by the database trigger.

## Related

- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `docs/ROADMAP.md`
