---
id: decision-profile-row-on-auth-user-insert
date: 2026-07-25
updated: 2026-07-30
status: accepted
area: auth-security
tasks: [11, 12, 16]
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
`public.profiles (id)` for the new user. Its `handle_new_user` entrypoint is
trigger-only `SECURITY DEFINER`, uses an empty search path and fully qualified
relations, and has `EXECUTE` revoked from `PUBLIC`, `anon`, and
`authenticated`.

Profiles are owner-only client data. Anonymous clients receive no profile
privilege or policy. Authenticated clients may select only their own row and
update only their own `display_name`, `username`, and `avatar_url`; they never
receive profile `INSERT` or `DELETE`.

## Consequences

- Every new account receives exactly one corresponding profile row.
- Signup and authorization tests verify profile creation, owner-only reads,
  approved-column updates, and rejection of anonymous reads and client profile
  INSERT / DELETE.
- Client roles cannot invoke the privileged profile-creation function as an
  RPC.
- Onboarding fields that are not safe defaults remain later owner updates.

## Revisit when

Profile creation requires mandatory onboarding data that cannot be initialized
safely and transactionally by the database trigger.

## Related

- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `docs/ROADMAP.md`
