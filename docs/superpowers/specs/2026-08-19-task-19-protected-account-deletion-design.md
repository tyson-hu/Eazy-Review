# Task 19 Protected Account Deletion Design

> **Status supersession (2026-08-30):** Task 19 is **Done — human accepted.**
> Canonical current status lives only in `docs/TASKS.md` (and the linked
> evidence dashboard). Historical status text below is frozen planning and
> remediation history.

Status: Baseline approved in chat on 2026-08-19. The targeted auth-arbitration
and principal-bound storage-settlement corrections were reviewed and approved
in chat on 2026-08-20. Local non-destructive implementation and the bounded
current-version C-before-B correction were authorized on 2026-08-21 and are
complete and published in draft PR #43. A bounded review-remediation pass
isolates the online recovery test precondition and aligns the five Expo SDK 57
patch dependencies required by Expo Doctor. Its published `1a515e1` head passed
Database CI but repeated the Expo recovery-test timeout. Published `9576555`
removed that regression's unrelated cold-link/manual-latch orchestration while
retaining the superseded-recovery authority and cache assertions. Diagnostic
head `b843dc8` then proved that ambient public Supabase configuration overrode
the injected client's Auth storage key during provider reconciliation; Database
CI passed and Expo CI remained red. The required integrated review of
`b843dc8` also accepted two distinct auth-preservation blockers: guard arm can
race an earlier refresh before a confirmed pre-revocation rollback, and settled
same-principal recovery can reject S2 then remove valid S1 without an exact
displaced snapshot. This targeted contract revision covers those three
blockers and was approved in chat on 2026-08-22. Diagnostic head `b843dc8`
itself remains unchanged. The bounded local remediation
now resolves all three blockers, removes the temporary diagnostic labels, and
is frozen as product/test Git tree
`3d8bf2be5cfadab6197c95b4f4036006df4caab4`. Affected 6-suite / 205-test and
full 41-suite / 495-test frontend runs, `check:readonly`, `check:expo`, and
25/25 Deno Function tests passed in disposable credential-free validation.
The remediation and initial documentation sync are published at
`28ac20204ef4c2386b0aa041f805ee2aea520780`; exact-head Expo CI run
`32615690386` and Database CI run `32615690393` passed. The status-only
follow-up was published at prior PR head
`f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e`; exact-head Expo CI run
`32615974049` and Database CI run `32615974012` passed. On 2026-08-29 the
agent-owned Function, frontend, local database/gateway, mobile-web, and iOS
Simulator verification passed with documented limits against that head. A5
maintenance PR #44 validated and merged the ten expected SDK 57 patches at
`f3886a5` (`master` merge `33c66ee`); Task 19 is published on that `master` at
`8f2f2a9` with exact-head Expo CI `33277460000` and Database CI `33277459991`
pass. Physical-device review, hosted configuration/deployment, human staging
deletion, human acceptance, readiness, merge, and production remain separate
outstanding gates. Current dashboard and details live under
`docs/evidence/task-19-protected-account-deletion/`.

## Purpose

Task 19 adds complete in-app account deletion through a trusted Supabase Edge
Function while preserving the repository's existing authentication, cache,
schema, aggregate, and human-acceptance boundaries.

The feature is intentionally narrow:

- email/password users can permanently delete their own current account;
- the server derives the deletion target only from a verified live caller;
- all refresh sessions are revoked before hard deletion;
- profile and My Rating data cascade through the existing schema;
- each affected Community Score is recomputed by the accepted trigger path;
- the app removes the deleted or revoked principal's local auth and
  user-scoped Query state while leaving anonymous browsing available; and
- coding agents perform only mocked and non-destructive verification. A human
  alone runs the destructive staging checklist.

## Current Baseline

- Tasks 16–18 are accepted and merged.
- Task 19's canonical status remains **Partial — implementation complete; human
  staging deletion pending.** Draft PR #43 contains the implementation, and the
  three accepted blockers below are corrected in the locally validated
  remediation. Prior PR head `f64cb3d` passed exact-head Expo and Database
  CI. The 2026-08-29 safe Function/frontend/database/gateway/web/simulator
  rerun passed against that head. A5 maintenance PR #44 merged the ten expected
  SDK 57 patches; Task 19 is published on that `master` at `8f2f2a9` with
  exact-head Expo and Database CI pass. Later human and hosted lifecycle gates
  remain outstanding. Task 19 remains parent-owned and not parallel-safe.
- Authentication is email/password only for the MVP.
- The Account screen is the sole in-app location for the Delete Account action;
  there is no generic Settings route or separate deletion route.
- `profiles.id` and `user_ratings.user_id` already cascade from
  `auth.users.id`.
- Existing rating-delete triggers already recompute retained aggregate rows,
  including the last-rater zero-count/null state.
- Local Auth JWT expiry is 3,600 seconds. Staging's effective value must be
  verified by a human and must not exceed one hour for the MVP.
- Task 19 adds one `delete-current-user` Function and a dedicated
  Database-CI-owned `npm run check:functions` Deno lane.
- Diagnostic head `b843dc8` has green Database CI and red Expo CI. The corrected
  product/test tree is `3d8bf2be5cfadab6197c95b4f4036006df4caab4`;
  implementation head `28ac202` and prior status head `f64cb3d` passed their
  exact-head Expo and Database CI runs. A5 maintenance is merged on `master`;
  the live PR head still needs the A5-integrated publish before it is again the
  source of exact-head truth.

## Goals

1. Make Delete Account easy to find on the signed-in Account screen.
2. Require a deliberate final confirmation and fresh password authentication.
3. Bind the destructive request to the exact principal and bearer produced by
   that reauthentication.
4. Verify a live session server-side and derive the target exclusively from
   the verified caller.
5. Revoke all refresh sessions with
   `auth.admin.signOut(callerJwt, 'global')` before hard deletion.
6. Never delete when caller validation, recent-auth validation, or confirmed
   global revocation fails.
7. Represent non-atomic and lost-response outcomes honestly without retrying a
   destructive operation automatically.
8. Remove only the affected principal from local Auth storage and user-scoped
   cache while preserving the latest newer auth winner, that winner's stored
   session/cache, and public catalog cache.
9. Provide deterministic mock-only automated proof and a human-run staging
   acceptance checklist.

## Non-Goals

- No soft deletion, deactivation, anonymized retention copy, retention
  warehouse, or delayed deletion queue.
- No user-upload cleanup before user uploads exist.
- No public deletion-information route; Task 24 owns that web destination.
- No generic Settings route.
- No standalone global-sign-out feature. Global revocation exists only as the
  mandatory internal deletion step.
- No social auth, magic-link sign-in, passkeys, MFA, or Sign in with Apple.
- No schema, RLS, grant, aggregate, or Auth-session-table redesign.
- No new client runtime dependency, custom MCP server, skill, or agent role.
- No production configuration, deployment, database access, or deletion.

## Selected Approach

### Reauthentication

The user enters the current password in the in-app deletion confirmation.
`AuthProvider` reauthenticates with Supabase `signInWithPassword` through an
isolated non-persisting Auth client using the already-authenticated account's
fixed email. The password is sent only to
Supabase Auth. It is never sent to the Edge Function, stored in Query state,
logged, included in evidence, or returned from the provider operation.

The returned session must belong to the principal who started deletion. The
provider retains its access token only in the operation's local scope and sends
that exact bearer in the Edge Function invocation. The isolated client never
writes/emits against shared app Auth state and is disposed after the attempt;
the UI never receives the token or a Supabase session object.

The Edge Function requires the newest detailed `amr` entry whose method is
`password` to be no more than 300 seconds old. JWT `iat` is not accepted as
proof of recent authentication because a token refresh can produce a new
`iat` without a new password check.

The function fails closed when:

- `amr` is missing;
- `amr` uses only string entries without timestamps;
- no `password` entry exists;
- the newest password timestamp is not finite;
- the timestamp is more than 300 seconds old; or
- the timestamp is more than 60 seconds in the future.

The 60-second future allowance covers bounded clock skew without turning a
future timestamp into unlimited freshness.

### Why this approach

Password reauthentication provides an identity check appropriate to the
current provider without reopening Task 18 recovery or adding email OTP rate
limits. The password plus a clearly labeled final destructive button is also a
deliberate confirmation, so typing the email or a separate `DELETE` phrase
would add friction without adding a distinct security property.

## User Experience

The logged-in Account screen adds a visible `Delete Account` action below the
ordinary account content and separate from `Sign out`. It expands an inline
confirmation card rather than navigating to a new route.

The confirmation copy is:

> Your Eazy Review account, your My Rating entries, and private notes will be
> permanently deleted. Public product information will remain. Each affected
> Community Score will be recalculated without your rating. This cannot be
> undone.

The card contains:

- a `Current password` secure input;
- `Cancel`;
- a destructive `Delete my account` button;
- a fixed error region announced as an alert; and
- pending state that disables the password field, Cancel, and both deletion
  entry points so duplicate submission is impossible.

The UI requires at least one password character before submission and passes
the password through unchanged; it does not trim or normalize credentials.

The destructive button uses the existing Negative / Risky design color. The
shared `Button` primitive gains a bounded `destructive` variant; this does not
introduce a new visual system.

Successful copy is:

> Your account was deleted. You can continue browsing Eazy Review without an
> account.

Confirmed revocation with confirmed retained account copy is:

> Your account was not deleted. All sessions were signed out. Sign in again to
> retry.

Ambiguous-outcome copy is:

> We couldn't confirm whether account deletion finished. Sign in again. If
> your account is still available, you can retry deletion.

Failures confirmed to occur before global revocation keep the initiating
principal signed in and use safe retryable copy. Wrong-password, offline, and
temporary failures use fixed messages and never expose SDK or server text.

## Client Architecture

### Public provider interface

`AuthContextValue` gains this provider-owned deletion operation and result
type:

```ts
export type DeleteAccountOutcome =
  | { kind: 'deleted' }
  | { kind: 'not-deleted-signed-out' }
  | { kind: 'unconfirmed-signed-out' }
  | { kind: 'superseded' };

deleteAccount(password: string): Promise<DeleteAccountOutcome>;
```

The UI supplies only the current password. It cannot supply an email, user ID,
access token, session ID, or deletion target.

`DeleteAccountOutcome` distinguishes:

- `deleted` — hard deletion is confirmed;
- `not-deleted-signed-out` — the account is confirmed retained after global
  revocation;
- `unconfirmed-signed-out` — revocation or deletion may have committed but the
  final state cannot be proved; and
- `superseded` — another authoritative auth transition won before the result
  could be applied locally.

Pre-revocation validation and service failures reject with fixed safe errors
and do not produce a successful outcome.

### Principal and bearer binding

At deletion start, `AuthProvider` captures:

- principal A's user ID;
- principal A's fixed email;
- the current authoritative auth generation; and
- the operation generation used by the existing explicit-auth arbitration.

The provider waits for earlier recovery reconciliation and participates in the
existing explicit-auth-operation ordering. It calls password sign-in with A's
fixed email, requires the returned user ID to equal A, and captures the
returned access token locally.

The Edge Function invocation uses an isolated Functions client whose only
access-token provider is that exact token. It must not call the shared
Functions client: pinned Supabase fetch consults its shared-session token
provider even when invocation headers contain `Authorization`. Isolation
prevents shared-lock reentry and guarantees that a concurrent A-to-B transition
cannot make the deletion request target B.

### Auth-session writer arbitration

`AuthProvider` serializes provider-owned operations that can replace the shared
Auth session through one provider-local writer fence. The fence covers explicit
sign-in, sign-up, guarded recovery's application-owned exact predecessor-bound
S1-to-S2 adoption, and superseded-recovery's application-owned exact A-to-B
storage transaction. Deletion-winner restoration performs no shared-session
write. Isolated deletion reauthentication is not a shared-session writer.
Existing bootstrap session restoration still settles before deletion can
start.

Implementation ruling (2026-08-21): the full unabortable
`processAuthCallbackUrl` exchange is not wrapped in that FIFO. Doing so
reproduced the accepted Task 18 recovery/explicit-auth cross-wait deadlock.
The exchange remains governed by Task 18's versioned recovery arbitration;
after its SDK writer releases, guarded session adoption reacquires the shared
Auth-operation/storage boundary, exact-compares stored authority, and returns
token-free `superseded` instead of overwriting B/C. This is a bounded correction
to the originally approved fence shape, not permission to weaken other writer,
guard, or exact-publication rules.

Auth API/provider storage-key resolution has one precedence rule: an explicitly
supplied `storageKey` wins; otherwise an explicitly injected client uses the
injected `sb-injected-auth-token` contract; only the normal singleton derives
the SDK-default key from the public URL. An ambient
`EXPO_PUBLIC_SUPABASE_URL` must never redirect an injected provider's guard,
recovery, or reconciliation reads to a different Auth storage namespace. This
matches the Auth API's existing injection-first rule and does not migrate or
rename the normal singleton's stored session.

When another principal B supersedes recovery, the provider isolate-validates
captured B outside all locks, then enters
the provider writer FIFO and `Auth operation -> storage`. One application-owned
transaction may replace raw storage only when it still exactly matches the
guard-allowed displaced A principal/access/refresh/session-ID snapshot and B is
also guard-allowed. Raw C, newer same-principal A2, empty, malformed, or blocked
authority is never overwritten. A confirmed or uncertain write emits only the
payload-free change signal; reconciliation then exact-rechecks raw authority
before publication. Deletion-winner restoration never calls SDK `setSession`:
it reconciles, isolate-validates, and exact-rechecks the already-stored B/C.
Unavailable authority uses a non-A quarantined signed-out shell without broadly
purging newer/public cache, and definitive invalidity exact-removes only the
unchanged snapshot.

The fence prevents two writers owned by this provider instance from passing a
winner-version check and then overwriting one another. Participating current-
version contexts serialize through the shared Auth/storage locks, and the exact
raw comparison prevents a stale local restoration from overwriting a completed
newer write whose Auth event is still delayed. The design does not claim a CAS
against older or uncontrolled code that writes the backend directly. Auth
events from another context remain authoritative inputs to the deletion
attempt's versioned winner state.

The Supabase Auth client and Task 19 also share one platform Auth-operation
lock. Native uses a process-wide lock; web uses a non-stealing Web Lock. The
client uses an infinite/no-steal acquisition policy. Deletion uses that lock in
two bounded critical sections. First, after storage capability preflight has
released the storage lock, deletion acquires the Auth-operation lock and then
the storage lock to arm/read back `preparing`. This drains any earlier SDK
refresh/getUser/removal work and lets a rotated A2 persist before the guard is
armed. The Auth-operation lock is released after arm; guarded isolated
reauthentication then runs without shared-state risk. Second, deletion
reacquires the same lock from the final post-reauthentication check through
pending transition, server result, guard settlement/disarm, and primary local
cleanup. Auth-operation and storage locks have distinct names and fixed order
`Auth operation -> storage`; no path waits for the Auth-operation lock while
holding storage. SDK methods that do not acquire the Auth-operation lock are
still constrained by the storage guard below.

### Principal-bound Auth-storage settlement

Deletion settlement never calls shared-client `auth.signOut()`. In pinned
Auth JS, local sign-out reads whichever session currently occupies shared
storage, sends that session's bearer to the logout endpoint, and then removes
the slot. A newer principal can replace A after the provider's final winner
check but before those SDK steps, so a conditional shared-client sign-out
cannot prove that it will revoke or remove A rather than B.

The application-owned Auth storage adapter instead provides a persistent
deletion guard plus principal-bound transactions. Every adapter `getItem`,
`setItem`, and `removeItem`, plus every guard/compare/remove sequence,
participates in the same storage lock:

- React Native uses one process-wide serialized lock because its AsyncStorage
  is owned by the single app process;
- web uses the browser Web Locks API with one stable name derived from the
  Supabase Auth storage key so participating tabs serialize writes; and
- web without Web Locks support fails deletion with fixed safe pre-revocation
  copy before the Edge Function can run.

The normal Supabase singleton receives an explicit Auth storage key equal to
the SDK's existing default derivation, so this adds no storage migration and
does not sign existing users out. An explicitly injected provider uses its
injected storage-key contract instead, regardless of ambient public
configuration. Before isolated reauthentication or Edge Function invocation,
the provider must successfully acquire/release the real storage lock as a
capability preflight; a synchronous API-presence check is insufficient. It then
acquires `Auth operation -> storage` and atomically arms a deletion guard for A.
Arming reads the latest stored session after earlier Auth work has drained,
requires it to be A, writes a leased `preparing` guard, reads it back, and only
then returns `armed`. After isolated reauthentication and a final winner check,
the exact revision transitions/readbacks to `pending`; only that state permits
the Edge call. If storage already contains B, it returns B as a preserved winner
and the server is not invoked. Lock, read, write, parse, or readback failure is a
fixed pre-revocation failure and the server is not invoked. A failure before
marker write is `unavailable`; a write/readback result that cannot prove whether
the marker committed is `quarantine-unconfirmed`. The latter clears the
in-memory healthy-A presentation and waits for the next guarded storage read;
it never claims that revocation/deletion began.

The guard store is versioned, maintains one store-wide monotonic revision
counter, and holds one record per guarded principal; later B deletion must not
overwrite an older A guard. Each record contains its allocated revision,
`preparing`/`pending`/`settled` state, a local lease deadline, the Auth subject
ID, an optional allowed Auth `session_id`, and (only while preparing/pending)
the preceding settled record state needed for rollback. It stores no access
token, refresh token, email, password, profile, rating, note, or provider
response. Expired `preparing` proves dispatch was never authorized and restores
its predecessor. Every guarded adapter read/write and adoption normalizes that
expired state under the storage lock, allocating a new revision for restored
predecessor state or removing the record when none existed. A `pending` record remains an unresolved destructive attempt
after lease expiry, not permission to republish that principal. While A's current revision has no
allowed session ID, the adapter:

- returns `null` instead of a stored A session, including during offline
  bootstrap;
- ignores any attempted A session write that reaches the adapter after guard
  arm, including an SDK method that does not participate in the shared
  Auth-operation lock; and
- continues to read/write any non-A session normally.

`AuthProvider` also ignores Auth events whose session matches the blocked A but
not the guard's allowed session ID, so an SDK `TOKEN_REFRESHED`/`SIGNED_IN`
notification cannot republish a write the adapter quarantined. This closes the
post-arm SDK write/event window. A participating refresh that already owns the
Auth-operation lock instead drains and persists before arm.

Guard/storage transactions do not emit Supabase Auth events, so the app owns a
separate payload-free guard-change signal. Web uses a BroadcastChannel derived
from the Auth storage key; React Native uses a process-wide emitter. The signal
contains only a fixed version/change label—no principal, session, token, or
outcome. Web deletion preflight requires both Web Locks and BroadcastChannel;
otherwise it fails before guard arm.

Every successful or unconfirmed guard arm/state transition/disarm/adoption,
expired-preparing normalization, and guarded primary cleanup emits the signal
best-effort. Each `AuthProvider` reconciles on mount, on signal, and when the app
returns to foreground: reread guard/raw storage under lock; isolate-validate and
exact-recheck an allowed session before publication; or, when its displayed
principal is blocked/removed, clear only that principal's in-memory/recovery and
Query state and publish the signed-out shell. A disarm that restores an allowed
predecessor can therefore restore that exact principal in other open contexts;
a pending guard, or a settled guard whose allowed lineage does not match stored
A, cannot leave another provider signed in as blocked A. An exact guard-allowed
settled S1 may be published only after isolated validation and exact recheck.

Supabase awaits Auth callbacks while it may hold the shared Auth-operation lock.
The callback therefore only enqueues the raw event/session on one provider-local
promise tail and returns; it never awaits guard storage, isolated validation, or
exact cleanup. Guard signals, mount, and foreground enqueue onto the same tail.
Deferred reconciliation acquires `Auth operation -> storage` only after the SDK
callback releases, preserving event order without lock reentry.

The initiating provider is exempt from quarantine only while its active
attempt's principal and exact guard revision match the current
`preparing`/`pending` record; it retains pending UI until the result settles.
Every other provider/revision clears blocked A. Native process notifications are
delivered asynchronously after transaction callers record their returned guard
revision, and foreground reconciliation applies the same exemption.

If pending transition/disarm returns stale or unconfirmed, the initiating
provider clears its matching active-attempt exemption first and then enqueues a
mandatory post-finalization guard reconciliation on the shared tail. It cannot
remain visually signed in as A merely because web notification does not echo or
native self-reconciliation previously honored the exemption.

While any guard record exists, direct SDK `removeItem` calls for the primary
session or companion user slot are denied; only application-owned exact-session
transactions may remove them. This prevents a stale A `getUser`/refresh failure
from loading A, observing an Auth error, and later deleting B through the SDK's
identity-unbound `_removeSession`. A sessionless `SIGNED_OUT` event is therefore
reconciled against guarded storage before publication: an allowed stored B/C is
validated on the isolated client before it is recorded as the winner, a blocked
residual remains quarantined/signed-out, and only an empty primary slot or
definitively invalid exact session is authoritative signed-out. Transient
isolated validation makes no authority change. After any isolated validation
await, the provider reacquires the storage lock and requires the same principal,
access token, refresh token, allowed session ID, and guard revision. A changed
snapshot restarts reconciliation from the newest stored authority; stale B is
never synthetically republished over C.

Ordinary local sign-out, recovery failure cleanup, and bootstrap invalid-session
cleanup no longer call shared-client `auth.signOut`. They capture one exact
session, use an isolated non-persisting Auth client to validate/revoke that
captured bearer, and remove local storage only when principal plus access/refresh
snapshot still match. A B/C replacement is preserved and returned to provider
arbitration. The isolated client can clear only its memory storage; it cannot
remove the application's shared slot. Each exact validate/revoke/remove sequence
runs under the same Auth-operation lock, so a main-client refresh cannot commit
after exact cleanup; external sign-in remains safe because the final storage
comparison preserves its different snapshot.

For ordinary local sign-out/recovery cleanup, remote revoke failure never
authorizes touching a replacement session. The captured exact local snapshot is
still removed on user-intent/known-invalid cleanup, matching current local
sign-out semantics; a changed snapshot is preserved. Diagnostics remain fixed
and never expose the remote error.

A fixed pre-revocation server failure disarms the owned guard only when the
same A still occupies storage, no newer winner exists, and the stored guard
revision equals the arming result owned by this attempt. Disarm restores the
saved predecessor record; it removes the record only when no predecessor
existed. A later same-principal arm advances the revision, so an older tab's
settle/disarm becomes a no-op. If B occupies storage, the A guard remains to
block stale A; B is authoritative only when B's own guard record allows its
session ID. A failed disarm is a safe local quarantine, never a reason to invoke
the server again or call shared sign-out. A destructive/ambiguous server outcome
transitions only the matching revision to `settled`; if that update fails,
`pending` remains equally blocking and evidence records the state transition as
unconfirmed.

Because guard arm runs only after earlier Auth-operation work drains, a refresh
that already held the Auth lock persists rotated A2 before the arm reads A.
Confirmed pre-revocation rollback changes only the exact owned guard revision;
it never rewinds or rewrites raw Auth storage. While A remains authoritative
and no newer winner replaces it, disarm therefore leaves that exact A2 session
in place while restoring the preceding guard state. Refreshes that begin after
arm remain subject to the guard's blocked-write/event rules.

Arming a principal that has an unexpired `preparing`/`pending` record returns
`guard-busy` without reauthentication or server invocation. Arming a prior `settled` record
advances its revision and saves the settled state/allowed lineage as the
predecessor. Settle, cleanup, and disarm all compare the exact arming revision;
a stale tab cannot mutate a newer attempt.

If a confirmed-retained or ambiguous account later signs in explicitly, the
Auth API receives the fresh session privately, extracts a non-empty
`session_id` and matching `sub` only for local storage classification, and
atomically adopts that exact session ID in the guard before persisting the
session. The public `SignInSuccess`, Auth context, and UI remain token/session-
free. Future refreshes with that same Auth session ID are allowed; stale A
session lineages remain blocked. The guard remains local safety metadata until
app storage is cleared or a separately reviewed cleanup rule can prove it is no
longer needed.

Verified Task 18 recovery has an additional exact-predecessor rule. Here S1 is
the exact guard-allowed pre-exchange session and S2 is the returned fresh same-
principal recovery session. S2 must have a non-empty session ID, but the SDK is
not assumed to give it a session ID distinct from S1. Before the unabortable
exchange, the provider captures under the storage lock one operation-local
predecessor classification:

- `settled-allowed` — exact S1 principal/access/refresh/session-ID plus the
  settled guard revision and allowed lineage; or
- `expired-pending` — the exact lease-expired pending guard revision plus the
  exact current raw state, which may be a same-principal session or empty.

Malformed or unavailable raw state cannot be captured as a predecessor. After
the SDK callback releases its Auth lock and produces same-principal S2,
adoption enters the provider writer FIFO and `Auth operation -> storage`.
Recovery-owned S2 events remain maintenance inputs and cannot publish S2 before
the applicable exact transaction succeeds.

For `settled-allowed`, the guard must still exactly match the captured revision
and allowed S1 lineage. Raw storage may be either exact captured S1, in which
case the transaction writes exact returned S2, or already exact returned S2,
in which case it performs no redundant primary write. It then allocates a new
store-wide revision, records settled S2 as the allowed lineage, and reads back
both guard and primary storage before reporting `adopted`. Newer same-principal
A2—including rotated tokens with S1's session ID—another-principal C, empty,
malformed, newly blocked, changed-guard, or unavailable authority matches
neither exact success state and is preserved without guard/session removal or
replacement.

For `expired-pending`, the guard must still be the exact captured expired
revision and raw storage must still be the exact captured session/empty state
or already exact returned S2. The transaction may then persist S2 when needed,
advance to a new non-active `settled` revision that allows S2, and exact-read
back guard plus primary storage. This retains the previously approved fresh-
session recovery path without relabeling the unresolved server outcome. Any
guard/raw change after capture is preserved and returns non-success. The exact
captured expired-pending predecessor is the only exception to the general rule
that blocked or empty authority cannot be replaced by settled-S1 recovery.

A `settled` guard or lease-expired `pending` guard may also adopt a later
explicit sign-in session under its existing exact classification. An unexpired
`preparing`/`pending` guard returns `guard-busy` and persists no new session, so
a second tab cannot overwrite a live attempt. Adoption never proves a pending
server outcome; a delayed server completion may still revoke/delete the newly
established account. Every successful adoption allocates a new revision, making
older attempt owners stale. The captured predecessor is discarded after the
operation; it is never persisted in guard metadata, Query state, UI/context,
logs, or evidence.

Expired `preparing` normalization runs before adoption classification. It
restores/removes the non-dispatched record first, so offline bootstrap,
ordinary sign-in, and recovery can proceed without requiring the Delete UI.

Forced recovery reconciliation never uses principal equality by itself as
removal authority. Exact removal requires a non-null displaced snapshot from
that recovery attempt and an unchanged principal/access/refresh/session-ID/
guard-revision match. When the displaced snapshot is missing or incomplete,
the provider preserves raw storage and reconciles it as current authority: a
guard-allowed exact S1 is isolate-validated and exact-rechecked before
publication; blocked or unavailable authority yields the token-free
quarantined shell without deleting S1. Companion storage and user-scoped cache
are not removed merely because the current principal matches.

Deletion reauthentication accepts expected principal A at its isolated API
boundary and compares the returned user to A before returning the operation-
local bearer. A mismatched B session is discarded without shared storage,
event, or guard mutation.

After a destructive/ambiguous server outcome, settlement reads the stored
session only inside the lock and returns one provider-private result:

```ts
type PrincipalBoundSessionCleanup =
  | {
      kind: 'removed-a' | 'already-empty';
      companionCleanup: 'removed' | 'unconfirmed';
    }
  | { kind: 'quarantined-unavailable' }
  | { kind: 'stale-attempt' }
  | { kind: 'preserved-guarded'; principalId: string }
  | {
      kind: 'preserved-winner';
      principalId: string;
      session: Session;
    };
```

If the stored session's validated `user.id` is A, the transaction removes the
authority-bearing primary session slot. The companion user slot is then removed
best-effort and its success is represented separately; failure after primary
removal cannot be mislabeled as a wholly uncommitted operation. If storage is
empty, it makes no primary write and still attempts companion cleanup. If a
valid non-A principal occupies the slot, its own guard record is checked first.
Only an unguarded or explicitly allowed session is returned as
`preserved-winner`; a blocked B remains stored and returns `preserved-guarded`
without a publishable session. Malformed storage or a
storage/lock failure returns `quarantined-unavailable`: the already-armed guard
continues to hide/block A, no non-A session is removed, and no shared-client
sign-out fallback is permitted.

Definitive-invalid bootstrap cleanup is routed through a separate exact-session
transaction using the restored principal plus exact access/refresh snapshot.
It removes the primary slot only if all three still match; a changed B or newer
same-principal session is preserved. Bootstrap never calls shared-client
`auth.signOut()` for cleanup. A guarded residual A is filtered before offline
publication, so the Task 16 rule that preserves an ordinary offline local
session does not resurrect a Task 19 quarantine.

All participating current-version app contexts use the same adapter lock. The
design does not claim an atomic guarantee against an uncontrolled process that
writes the storage backend directly or an older app version that does not use
the reviewed adapter. It does guarantee that Task 19 never supplies an
unselected current-session bearer to local logout and never knowingly removes
a stored non-A session.

### Local settlement

The destructive call is never automatically retried.

The active attempt stores a monotonic version and the latest winner observed
after A:

```ts
type DeletionWinner =
  | {
      kind: 'session';
      version: number;
      principalId: string;
      session: Session;
    }
  | { kind: 'signed-out'; version: number };
```

An undefined winner means A remains authoritative. Every observed non-A
session or `SIGNED_OUT` event replaces the winner and advances its version.
Other A events are maintenance for the
account already subject to deletion and cannot replace a recorded non-A
winner. Therefore B -> signed-out leaves signed-out authoritative and B -> C
leaves C authoritative. A captured B is never sticky across a newer event.

Deletion restoration emits no synthetic Auth event because it performs no SDK
or application-owned session write. Its captured winner version is checked
around raw reconciliation and isolated validation; raw authority that differs
from the captured winner replaces it before publication. Principal-bound
storage removal likewise emits no synthetic `SIGNED_OUT` event.

On any result, the provider rechecks the winner and current authority:

- Before reauthentication, the provider performs an asynchronous no-op
  acquire/release of the real storage lock. An unsupported web runtime or
  rejected lock request fails safely before the fresh bearer exists. It then
  acquires `Auth operation -> storage` to arm/read back A's `preparing` guard,
  so earlier SDK Auth work drains and persists before arm. Auth-lock or arm
  failure prevents a server call and preserves/quarantines according to whether
  the guard write was confirmed. Any preserved-winner or quarantine result is
  reconciled only after the short Auth-operation critical section releases, so
  provider reconciliation cannot reenter the held lock.
- The provider releases the Auth-operation lock after a confirmed arm and
  performs isolated reauthentication only on `armed`. It then reacquires the
  Auth-operation lock for the final winner/revision check and transitions/
  readbacks the same revision to `pending` immediately before the Edge call. A
  stored B/guarded B, stale revision, or failed transition prevents dispatch.
- If A is still authoritative and the outcome is `deleted`,
  `not-deleted-signed-out`, or `unconfirmed-signed-out`, the provider runs the
  principal-bound storage transaction. `removed-a` and `already-empty` clear
  recovery state, remove only A's user-scoped Query entries, advance local Auth
  authority, and publish signed-out state without an SDK sign-out call;
  companion cleanup is recorded separately.
- If that transaction finds a stored non-A session before its corresponding
  Auth event is observed, the provider records the returned snapshot as a new
  versioned winner, removes only A's Query entries, reconciles that winner, and
  returns `superseded`.
- If the stored non-A session is blocked by its own guard, the provider preserves
  the bytes but publishes no principal, removes only A's Query entries, and
  returns `superseded` with the signed-out/quarantined shell.
- If a newer session or signed-out winner exists, no local sign-out and no
  broad user-root purge may touch that winner. The provider removes only A's
  Query entries and returns `superseded`; the bearer-pinned server call still
  concerned only A.
- Isolated A reauthentication never overwrites shared storage. Any B/C winner
  observed before dispatch or settlement is reconciled after the Auth-operation
  lock releases and only when its own guard allows publication.
- If another external transition changes stored authority during restoration,
  the stale snapshot is discarded and reconciliation restarts from the newest
  raw winner, even when that winner's Auth event is delayed. With finitely many
  external transitions, reconciliation continues until one fenced pass
  completes without a version or exact-storage change. Unbounded external auth
  churn has no completion guarantee; safety takes priority over publishing an
  obsolete principal.
- Immediately before any restored or storage-preserved B/C is manually
  published, deferred reconciliation reacquires `Auth operation -> storage` and
  requires the exact principal/access/refresh snapshot plus allowed session ID
  and guard revision. Newly guarded or changed B/C restarts from current
  authority. Deletion restoration never calls `setSession`; superseded recovery
  may write B only through the exact displaced-A transaction, and settled same-
  principal recovery may write S2 only through the exact predecessor-bound
  S1-to-S2 transaction. Neither path falls back to principal-only removal.
- Public catalog Query keys and Query entries for newer principals are retained
  in every settlement.

An unexpected storage failure after destructive dispatch never falls back to
shared-client sign-out. The already-armed guard remains authoritative: adapter
reads hide residual A, adapter writes reject unapproved A session lineages, and
the provider listener ignores matching A events. The provider clears only its
in-memory A/recovery state and A's Query entries, publishes the signed-out
shell, preserves the server outcome's honest deletion semantics, and records
physical primary/companion cleanup as unconfirmed. Offline or online bootstrap
cannot republish guarded A; a stored B remains visible and authoritative.

Principal-specific cache removal recognizes only the documented account and
rating key shapes containing A's user ID. Existing complete user-root cleanup
remains available for ordinary full sign-out and known-invalid-session paths;
deletion settlement never uses it and never calls shared-client sign-out.

Local cleanup after confirmed revocation or an unresolved destructive outcome
does not claim that the account was deleted. It prevents a revoked or possibly
deleted principal from remaining presented as a healthy signed-in session.

## Edge Function Architecture

### Endpoint

- Function name: `delete-current-user`.
- Method: `POST`.
- Request body: semantically empty. The client sends zero bytes; an omitted or
  whitespace-only body is accepted, and any non-whitespace byte is rejected.
- Authentication: `verify_jwt = true` plus in-handler server-backed caller
  validation.
- Browser support: unauthenticated `OPTIONS` preflight and the Supabase CORS
  header set on every response.
- Success: JSON `{ "ok": true, "outcome": "deleted" }`.
- Errors: JSON `{ "ok": false, "code": "<fixed-code>" }` with no raw
  provider detail.

The HTTP contract is fixed:

| HTTP status | Response code or outcome |
| --- | --- |
| `200` | `deleted`, or CORS preflight success |
| `400` | `invalid-request` |
| `401` | `unauthorized` |
| `403` | `reauthentication-required` |
| `405` | `method-not-allowed` |
| `409` | `revoked-not-deleted` |
| `500` | `configuration-failure` |
| `502` | `revocation-failed` |
| `503` | `validation-unavailable`, `revocation-unconfirmed`, or `revoked-delete-unconfirmed` |

An unknown HTTP status, malformed JSON response, or unknown response code is
never success. The client treats it as an unconfirmed destructive outcome,
except that a gateway-generated HTTP `401` remains a pre-revocation
`unauthorized` failure even when the gateway body is not the function's JSON
shape. With `verify_jwt = true`, that response occurs before the handler and
therefore cannot imply that revocation or deletion began.

The implementation separates:

1. a thin Deno entrypoint that loads server environment and constructs the
   Supabase client;
2. a Supabase Auth Admin adapter that owns exact SDK calls; and
3. a dependency-injected request/orchestration handler tested without live
   Auth or destructive calls.

The server-only secret is read only inside the Edge runtime. It never enters
Expo source, public environment validation, logs, tests, screenshots, or
evidence.

### Validation sequence

For the exact bearer supplied by the client, the handler:

1. accepts CORS preflight or rejects non-POST methods;
2. rejects any request body content;
3. extracts one Bearer token without logging it;
4. calls server-backed `auth.getUser(jwt)` so Auth verifies the token, user,
   and live `session_id` without direct application access to
   `auth.sessions`;
5. obtains verified claims for the same JWT;
6. requires `claims.sub === verifiedUser.id`, an authenticated role, a
   non-empty session ID, and a password AMR timestamp within the freshness
   window;
7. calls `auth.admin.signOut(jwt, 'global')` with the same bearer;
8. proceeds only when global revocation is positively confirmed;
9. calls `auth.admin.deleteUser(verifiedUser.id, false)`; and
10. resolves any deletion error with one non-destructive
    `getUserById(verifiedUser.id)` check, never a second deletion call.

No request parameter, body field, metadata value, or claim other than the
verified subject may select the deletion target.

### Server outcome semantics

The Auth Admin boundary is non-transactional. The design therefore
distinguishes returned failures from transport loss and verifies goal state
after an uncertain delete response.

| Server observation | Fixed outcome | Delete call allowed? | Client settlement for A |
| --- | --- | --- | --- |
| Missing/invalid request, dead session, claim mismatch, or stale AMR | `unauthorized`, `invalid-request`, or `reauthentication-required` | No | Preserve A unless independent auth state says otherwise |
| Live-session or verified-claims lookup is temporarily unavailable | `validation-unavailable` | No | Preserve A and allow manual retry |
| Admin global sign-out returns a confirmed non-session error | `revocation-failed` | No | Preserve A and allow manual retry |
| Admin global sign-out reports that the bearer/session is already absent | `revocation-unconfirmed` | No | Sign A out locally; global revocation cannot be proved |
| Admin global sign-out throws or loses its response | `revocation-unconfirmed` | No | Sign A out locally; final state remains ambiguous |
| Global revocation confirmed; delete succeeds | `deleted` | Once | Sign A out locally and show success |
| Delete reports already absent, or the one follow-up lookup confirms absence | `deleted` | No retry | Sign A out locally and show success |
| Delete errors; follow-up lookup confirms user still exists | `revoked-not-deleted` | No retry | Sign A out locally and use sign-in-to-retry copy |
| Delete errors; follow-up lookup also cannot resolve | `revoked-delete-unconfirmed` | No retry | Sign A out locally and use ambiguous copy |
| Client loses the Edge Function response | Client-side `unconfirmed-signed-out` | No retry | Sign A out locally and use ambiguous copy |

A successful lookup after client response loss cannot prove that the still
running function will not revoke or delete immediately afterward. The client
therefore performs no shared-session `getUser` probe and makes no deletion
claim from such a probe.

Concurrent duplicate server requests remain caller-bound. A not-found result
after another request has already deleted the caller is goal-state success,
not an instruction to recreate state or retry deletion.

## Data Lifecycle and Token Semantics

Hard deletion removes:

- the current `auth.users` row;
- the matching `profiles` row;
- all matching `user_ratings` rows; and
- every deleted rating's `private_note`.

It retains:

- public product rows;
- Eazy assessments;
- product images and offers; and
- `rating_aggregates` rows, recomputed without the deleted user's ratings.

No MVP retention or anonymization copy is created.

The local deletion guard is operational client safety metadata, not a server
retention copy. It contains only its format version/counter, the blocked Auth
subject ID, monotonic revision/state, optional explicitly adopted Auth session ID, and
local lease deadline plus the pending predecessor's state/session ID. It contains no token, email,
password, profile field, rating, note, or provider/deletion response. It remains local so a
late refresh, offline bootstrap, or another participating tab cannot resurrect
the blocked session lineage; clearing app storage removes it. An explicitly
authenticated later session for the same retained principal is adopted by
session ID only after the applicable exact predecessor/guard checks, without
unblocking older lineages. Evidence reports the guard's presence and data
minimization without recording either identifier.

Global sign-out destroys refresh-session capability, but already-issued access
tokens can remain cryptographically valid until `exp`. The local and staging
JWT lifetime must be documented as no more than 3,600 seconds. The app and its
evidence must not claim immediate access-token invalidation.

The deletion endpoint itself uses server-backed live-session validation. This
task does not add a general application session-introspection system or modify
other endpoints.

## Error and Logging Rules

- All user copy is fixed and safe.
- All server codes are fixed enums.
- No retry middleware wraps reauthentication or deletion.
- No token, password, email, user ID, session object, request body, service
  secret, or raw Auth Admin error is logged.
- Logs may contain only a fixed operation label and fixed outcome code.
- The fixed `AuthRecoveryStage` labels added at diagnostic head `b843dc8` are
  temporary evidence instrumentation and are removed after focused regression
  coverage proves the corrected path; the remediation adds no replacement
  session-bearing diagnostics.
- Missing server environment returns a fixed configuration failure without
  naming or printing secret values.
- A malformed response is treated as unconfirmed, never success.

## Automated Verification

Automated verification is entirely non-destructive.

### Edge Function tests

Dedicated Deno tests use injected mocks to prove:

- CORS preflight and POST-only behavior;
- rejection of every non-empty body, including target-ID attempts;
- missing, malformed, expired, and dead-session bearer rejection;
- verified caller ID is the only delete target;
- claims and verified user must match;
- password AMR freshness, missing AMR, string-only AMR, stale timestamp, and
  future-clock bounds;
- exact `signOut(jwt, 'global')` call and its ordering before deletion;
- no deletion on validation, recent-auth, or revocation failure;
- exact `deleteUser(derivedId, false)` call;
- no automatic delete retry;
- delete-error follow-up lookup and all three resulting states;
- already-absent goal-state success;
- fixed safe responses and fixed-label logs; and
- no server secret in test fixtures or output.

The Supabase adapter receives its own focused mock test so orchestration mocks
cannot conceal an incorrect SDK scope or delete target.

### Client and provider tests

Jest tests prove:

- the UI cannot provide a target ID or bearer;
- reauthentication uses A's fixed email;
- wrong password and offline state prevent invocation;
- returned reauth principal must equal A;
- deletion reauthentication uses isolated non-persisting Auth state and emits
  no shared session/event;
- the exact returned bearer is pinned to the function request;
- isolated Functions invocation never consults shared Auth/session state;
- duplicate deletion attempts are blocked;
- no automatic destructive retry occurs;
- confirmed pre-revocation failure preserves A and A's cache;
- deleted, revoked-not-deleted, and unconfirmed outcomes settle A correctly;
- A-to-B transitions during reauth, invocation, and cleanup preserve B;
- destructive settlement never calls shared-client `auth.signOut`;
- stored A is removed only by the principal-bound storage transaction;
- the asynchronous lock preflight and guard write/readback must succeed before
  destructive dispatch;
- with valid public Supabase environment configured, an explicitly injected
  provider/API still reads, validates, reconciles, and publishes only the
  injected Auth storage slot while the environment-derived slot stays
  untouched;
- `preparing` must read back before isolated reauthentication and the same
  revision must read back `pending` before server invocation;
- expired `preparing` rolls back while expired `pending` remains quarantined
  and only then permits explicit fresh-session adoption;
- expired `preparing` also normalizes during offline read/sign-in/recovery when
  no Delete preflight is reachable;
- an unconfirmed marker write/readback performs no server call and does not
  continue presenting A as a verified healthy local session;
- a refresh paused after its final storage read cannot write or republish A
  after the guard is armed and A is removed;
- guard arm waits behind a refresh that already holds the Auth-operation lock,
  and confirmed pre-revocation rollback preserves the rotated A2 that the
  refresh persisted before arm;
- arm-result winner/quarantine reconciliation begins only after the short
  Auth-operation lock releases;
- a stale A getUser/refresh failure paused before SDK removal cannot remove B
  or publish a false `SIGNED_OUT`;
- false `SIGNED_OUT` validates the exact stored replacement in isolation before
  preserving it or exact-removing a definitively invalid snapshot;
- B-to-C during isolated `SIGNED_OUT` validation restarts from C and never
  republishes stale B;
- a payload-free guard change clears A state/only A cache in another tab and a
  disarm restores the exact allowed predecessor there;
- mount and foreground reconciliation recover a missed guard notification;
- Auth callbacks return before deferred guard reconciliation reacquires the Auth
  lock, and the single tail preserves event/signal/foreground order;
- initiating native A remains pending for its exact revision on self-arm and
  foreground while every non-owner provider clears blocked A;
- stale/unconfirmed disarm clears the owner exemption before mandatory
  post-finalization reconciliation, so initiating A cannot remain signed-in;
- the shared non-stealing Auth-operation lock drains SDK work and uses fixed
  `Auth operation -> storage` ordering;
- guarded A with a missing/malformed `session_id` fails closed rather than
  bypassing the lineage check;
- guarded residual A is hidden during offline bootstrap and never reaches the
  ordinary shared-sign-out invalid-session cleanup path;
- definitive-invalid bootstrap cleanup removes only the exact restored session
  and preserves B arriving after validation;
- explicit later sign-in or verified recovery for retained A adopts only the
  returned non-empty `session_id`, while stale A session lineages remain
  blocked;
- settled allowed S1 and its guard revision are captured under storage before
  recovery exchange, then passed with S2 to the serialized adoption boundary;
- verified recovery from guard-allowed settled S1 atomically adopts
  same-principal S2 only when the exact pre-exchange guard remains current and
  raw storage is exact S1 or already exact S2; same-session-ID recovery is
  accepted, and blocked recovery-owned S2 is never transiently published before
  the transaction succeeds;
- settled S1-to-S2 recovery preserves newer A2, C, empty, malformed, blocked,
  changed, and unavailable authority without writing or removing a session,
  including A2 token rotation that retains S1's session ID;
- forced recovery reconciliation with no exact displaced snapshot never removes
  valid same-principal S1 or its principal cache, republishes only after
  isolated validation plus exact recheck, and never falls back to principal-
  only cleanup;
- reauthentication checks expected A before returning its isolated bearer;
- concurrent same-principal arms use monotonic revisions, and stale settle/
  disarm cannot mutate the newer attempt;
- pre-revocation rollback restores the preceding settled/allowed record rather
  than unblocking older A lineages;
- expired-pending recovery captures the exact guard plus raw session/empty
  predecessor, adopts S2 only while both remain exact (or raw is already exact
  S2), and allocates a new revision so the old attempt cannot settle/disarm/
  remove it;
- changed, malformed, unavailable, or newly blocked expired-pending authority
  is preserved without guard/session mutation;
- a stored B blocked by its own guard is preserved but never published;
- B becoming guarded after capture but before manual publication restarts from
  guarded storage and never republishes B;
- B written before its Auth event is delivered is returned as the newest
  winner without revoking or removing B;
- a B write racing between A comparison and removal is serialized by the same
  storage lock, so either A is removed before B is written or B is preserved;
- web without cross-context storage locking rejects before reauthentication or
  Edge Function invocation;
- B-to-signed-out and B-to-C transitions during restoration preserve the
  newest winner and never resurrect B, including when C is stored before its
  Auth event is delivered;
- a newer same-principal B2 snapshot in raw storage replaces captured B1;
- deletion restoration performs no synthetic session write or Auth event;
- superseded recovery replaces only exact displaced A with validated B and
  preserves raw C, A2, empty, malformed, blocked, and uncertain authority;
- provider-owned Auth writers cannot interleave with the exact recovery CAS;
- every participating Auth-storage writer uses the same platform-appropriate
  storage lock, and malformed/storage-failure paths make no removal;
- failure after primary A removal but before companion cleanup is represented
  as primary removed plus companion unconfirmed, never as no change;
- late A work removes only A's cache and cannot remove or repopulate B's or C's
  cache;
- public catalog cache survives every A cleanup;
- recovery reconciliation and explicit auth ordering remain authoritative; and
- no token, password, or raw provider error reaches UI state.

### Account UI tests

React Native Testing Library tests prove:

- Delete Account is visible only when signed in;
- permanent-data and aggregate copy is complete;
- opening, canceling, password entry, and final confirmation work;
- pending state prevents duplicate taps and editing;
- safe wrong-password, retryable, partial, ambiguous, and success copy;
- signed-out Account remains browsable after local settlement; and
- no new route or Settings surface is introduced.

### Database proof

Database tests add read-only catalog assertions that both Auth foreign keys use
`ON DELETE CASCADE`. Existing aggregate-delete regression tests remain green.
Automated tests do not delete an Auth account; the human staging matrix owns
destructive cascade proof.

### Validation ownership

Task 19 adds a dedicated Deno format, lint, type-check, and unit-test command
owned by Database CI. Deno function sources are excluded from Expo TypeScript
and ESLint only after that replacement validation is present.

The final implementation also runs the repository's targeted Jest suites,
`npm run typecheck`, `npm run lint`, `npm run check:secrets`, database tests,
`npm run check:readonly`, and the parent-owned `npm run check:expo` gate.
Exact-head CI remains separate evidence.

## Human-Run Destructive Acceptance

A human prepares one staging account with:

- ratings on multiple products;
- a private note;
- one product also rated by another user; and
- one product for which the deletion account is the last rater.

The human records safe pre-state counts and scores without recording tokens,
passwords, emails, or secret values. A second pre-existing session for the same
account is established before deletion.

The human then performs the in-app deletion and records:

1. the Account confirmation and completion outcome;
2. local session and user-scoped cache removal;
3. force-close/offline relaunch not restoring the guarded deleted principal;
4. continued anonymous Browse and Product Detail access;
5. profile, rating, and private-note removal with no orphan rows;
6. correct shared-product aggregate recomputation;
7. last-rater aggregate count `0` with null average/score fields;
8. deleted credentials failing to sign in;
9. the second session failing to refresh after global revocation;
10. already-issued access-token behavior through the configured expiry bound;
   and
11. staging's effective JWT expiry, which must be no more than one hour.

The evidence report distinguishes automated pass, simulator/web pass, physical
`tested-pass`, staging human result, `not-run`, and `not-tested` exactly as the
repository evidence policy requires.

A coding agent never executes this checklist through the app, browser, MCP,
SQL, Auth Admin API, or any other tool on local, staging, or production.

## Documentation Impact

Implementation reviews and updates these canonical surfaces in the same
branch:

- `docs/TASKS.md`;
- `docs/ROADMAP.md`;
- `docs/API_CONTRACTS.md`;
- `docs/USER_FLOWS.md`;
- `docs/DESIGN.md`;
- `docs/DATA_MODEL.md`;
- `docs/SECURITY.md` and its required mirror for guard minimization, guarded
  bootstrap, exact cleanup, and no shared-session sign-out;
- `docs/RELEASE_CHECKLIST.md`;
- the accepted caller-derived self-deletion ADR and generated
  `docs/DECISIONS.md` index; and
- `docs/evidence/task-19-protected-account-deletion/RESULT.md` dashboard and
  `docs/evidence/task-19-protected-account-deletion/VERIFICATION.md` details.

The API contract and ADR must explicitly distinguish account deletion from
local cleanup after confirmed revocation or an unresolved destructive outcome.
`docs/API_CONTRACTS.md` must also add `deletion.api.ts` to the Auth structure
map and replace its locked broad account-switch cleanup clause: ordinary full
sign-out/known-invalid-session cleanup may remove complete user roots, while
A-to-B switching and superseded deletion remove only the displaced principal's
documented account/rating keys. It also records isolated exact-bearer Auth
validation/sign-out, revision-bound guard state, guard-aware explicit sign-in,
exact predecessor-bound same-principal recovery adoption, the prohibition on
unknown-snapshot principal-only cleanup, and sessionless-event reconciliation.
Task 18/Flow 5 mechanism text changes
from shared automatic sign-out to exact isolated cleanup without reopening the
already accepted Task 18 status/evidence.
After local code is complete but before human destructive proof, canonical
status is exactly **Partial — implementation complete; human staging deletion
pending.** That interim gate wording is historical; live status after H1/H2/H3
is **Done — human accepted** in `docs/TASKS.md` (see Current Baseline
supersession note).

## Lifecycle Gates

1. **Written-spec review:** the human reviews and approves this document,
   including any targeted revision that changes its auth-arbitration contract.
2. **Implementation plan:** a separate detailed plan is written and reviewed.
3. **Implementation authorization:** required before code, configuration, or
   CI edits.
4. **Non-destructive implementation and validation:** no account deletion and
   no remote environment mutation.
5. **Commit and push authorization:** separate from implementation.
6. **PR review and exact-head CI:** separate from local green checks.
7. **Staging function deployment and server-secret configuration:** separate
   explicit authorization and environment identity check.
8. **Human staging deletion:** human-only, recorded against the reviewed SHA.
9. **Human acceptance and documentation closeout:** separate from green CI.
10. **PR readiness and merge:** separate explicit lifecycle actions.
11. **Production:** outside Task 19 agent execution; no coding agent performs a
    production database action or account deletion.

## Stop Conditions

Stop and request a separately scoped decision or task if implementation finds:

- a required schema, migration, RLS, grant, or aggregate-trigger change;
- a required new route;
- a provider other than the accepted email/password MVP flow;
- an Auth SDK behavior that cannot pin the exact fresh bearer;
- an inability to serialize all participating app Auth-storage writers on a
  supported platform or to remove stored A without risking a stored B;
- an inability to share a non-stealing Auth-operation lock with pinned Auth JS,
  deny stale SDK primary removals while guards exist, or reconcile sessionless
  events against storage;
- an inability to notify participating contexts of guard changes without
  identity/session payloads or reconcile missed changes on foreground;
- an inability to persist/read back the minimized preparing/pending guard before
  dispatch or block late A writes/events;
- an inability to drain earlier Auth work before guard arm, adopt guarded
  recovery S2 only from an exact classified predecessor (settled S1 or the
  captured lease-expired pending state) while preserving every nonmatching A2/
  C/empty/malformed/blocked authority, forbid raw cleanup when the displaced
  snapshot is unknown, or keep the operation-local predecessor out of
  persisted/public state;
- an inability to distinguish and safely represent non-atomic outcomes;
- staging JWT expiry greater than one hour;
- a need to place a server-only credential in Expo; or
- any request for an agent or tool to execute account deletion.

## Acceptance Summary

Task 19 is acceptable only when agent-verifiable, non-destructive proof is
green, the exact-head implementation is reviewed, and a human records the
staging destructive matrix. Green CI alone does not establish deletion,
cascade, multi-session, residual-token, or human product acceptance.
