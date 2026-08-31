---
id: decision-caller-derived-session-aware-self-deletion
date: 2026-07-26
updated: 2026-08-22
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

The email/password client reauthenticates the fixed signed-in email and pins
the exact isolated bearer to a zero-body request. The endpoint requires a live
caller, matching claims/session, and a detailed password AMR no older than 300
seconds with at most 60 seconds future skew. JWT `iat` is not reauthentication
evidence.

Revocation and deletion are never automatically retried. One non-destructive
`getUserById` lookup may classify an uncertain delete response. Confirmed
retained-account and unresolved outcomes remain distinct from deletion; local
settlement prevents A appearing healthy but makes no server-state claim.

Provider settlement removes only A-owned account/rating cache when a newer
session or signed-out winner exists. One non-stealing shared Auth-operation
lock and one distinct storage lock enforce `Auth operation -> storage` order.
A minimized, revision-bound preparing/pending/settled principal guard blocks
late A reads/writes/removals/events and offline resurrection. Exact snapshots,
monotonic revisions, payload-free signals, and mount/foreground reconciliation
preserve newer B/C authority.

Auth storage identity resolves explicit key, then injected client, then the
singleton public environment. After capability preflight releases, deletion
arms under a short `Auth operation -> storage` section so earlier Auth work can
persist before the guard reads raw authority; isolated reauthentication runs
after release. Confirmed rollback changes only the owned guard revision and
therefore preserves a rotated A2 already persisted before arm.

Provider-owned Auth writers use a FIFO fence, with one bounded Task 18
implementation exception: wrapping the full unabortable
`processAuthCallbackUrl` exchange reproduced the accepted recovery/explicit-
Auth deadlock. The exchange stays on versioned recovery reconciliation; after
its SDK writer releases, guarded adoption reacquires the shared Auth/storage
boundary, exact-compares stored authority, and returns token-free `superseded`
instead of overwriting B/C. Superseded recovery then isolate-validates B and may
replace only the exact guard-allowed displaced A snapshot through one provider-
FIFO, `Auth operation -> storage` CAS. Raw C, newer A2, empty, malformed,
blocked, or uncertain authority remains untouched. Deletion-winner restoration
performs no shared-session write and publishes only an isolate-validated,
exact-rechecked raw winner.

For guarded same-principal recovery, the provider captures one operation-local
exact settled or lease-expired-pending predecessor before the unabortable
exchange. Recovery-owned S2 events remain maintenance-only until a serialized
transaction confirms the same predecessor (or already-exact S2), adopts S2,
advances the guard revision, and reads back guard plus storage. Same-session-ID
S2 is valid. A2/C/empty/malformed/blocked/changed/unavailable authority is
preserved. Forced recovery with unknown displacement never removes primary or
companion storage or same-principal cache; only an exact displaced snapshot can
grant cleanup authority.

MVP keeps no retention copy: the profile and My Rating rows cascade, while
products and their aggregate rows remain and affected aggregates are
recomputed.

## Consequences

- A client cannot request deletion of another account by supplying its id.
- Malformed/unknown or lost destructive responses cannot become success, and
  no automatic retry can submit a second deletion.
- Newer B/C or signed-out authority cannot be replaced, signed out, republished
  stale, or have its cache removed by late A work.
- Recovery S2 cannot publish transiently before exact predecessor-bound
  adoption, and missing displacement never falls back to principal-only cleanup.
- Storage/lock/readback uncertainty remains a fail-closed quarantine and never
  becomes a signed-out/deletion claim. Guard metadata contains no token,
  password, email, profile, rating, note, or server outcome.
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
