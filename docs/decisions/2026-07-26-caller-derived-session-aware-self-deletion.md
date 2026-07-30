---
id: decision-caller-derived-session-aware-self-deletion
date: 2026-07-26
updated: 2026-07-30
status: accepted
area: auth-security
tasks: [19]
pr: 19
tags: [account-deletion, auth, sessions, supabase]
supersedes: []
---

# Make self-deletion caller-derived and session-aware

## Context

The Delete Account client cannot be trusted to choose a target user id.
Deleting an auth user without first revoking all refresh sessions can also
leave another device able to mint access tokens, while direct writes to
Supabase-managed session tables would couple the app to unsupported internals.

## Decision

`deleteCurrentUser()` accepts no user id. A protected server endpoint verifies
the caller's bearer token, derives the target exclusively from that caller, and
uses Auth Admin `signOut(callerJwt, 'global')` to revoke all refresh sessions.
If revocation fails, deletion aborts. Only after successful revocation does the
server use its server-only credential to hard-delete that same auth user; it
never writes directly to `auth.sessions`.

MVP keeps no retention copy: the profile and My Rating rows cascade, while
products and their aggregate rows remain and affected aggregates are
recomputed.

## Consequences

- A client cannot request deletion of another account by supplying its id.
- Human-run acceptance verifies a second session, cascade and aggregate
  behavior, and deleted-credential sign-in failure; coding agents do not
  execute the destructive check.
- Already-issued access tokens can remain valid for the configured JWT
  lifetime, capped at one hour for MVP. Endpoints requiring immediate
  revocation also validate the JWT `session_id` against a live Auth session.
- The service-role secret and Auth Admin operations remain outside Expo.

## Revisit when

The product adopts a reviewed retention or soft-deletion requirement, or the
Auth provider offers a stronger supported transaction that combines global
session revocation and caller-bound deletion.

## Related

- `docs/API_CONTRACTS.md`
- `docs/DATA_MODEL.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `docs/USER_FLOWS.md`
- `docs/decisions/2026-07-24-forbid-agent-production-database-access.md`
