# Resolved blocker — newer recovery callback queue — 2026-08-17

## Problem

PR #37 remediation must keep the newest distinct recovery callback instead of
silently discarding it while an older callback is active. The original
drop-on-busy guard violated that invariant for a distinct newer link.

## Corrected diagnosis

The initial authoritative-B regression delivered A and B back-to-back before
proving that A had entered `exchangeCodeForSession`. A yielded while waiting
for bootstrap settlement, B correctly superseded it before exchange, and B
became the sole exchange. The test then resolved that B promise as though it
belonged to A and incorrectly waited for a second call. The one-call result was
test-ordering evidence, not production callback loss.

The corrected regression now:

- delivers A and waits for its first exchange to start;
- delivers distinct B while A is active;
- resolves A and verifies that B starts as the second serialized exchange; and
- resolves B and verifies both rendered identity and the SDK session are B in
  the verified recovery phase.

## Bounded regression audit

Attempt 2 moved the newer-callback marker ahead of the existing superseding-auth
decision so it skipped both A verification and stale-session reconciliation.
Removing that ordering override left the corrected authoritative-B regression
and the neighboring auth-transition/reconciliation race set green. Attempt 1's
event/result gates already preserve the newer callback invariant, so Attempt 2
was removed.

Attempt 3 routed the drain through a latest-mounted-handler ref to test a stale
effect-closure hypothesis. Removing that indirection also left the same queue
and race set green. The owning effect's `handleUrl` safely drains the pending
callback directly, so Attempt 3 was removed.

## Resolved implementation

The retained Attempt 1 implementation replaces the boolean busy guard with:

- one active recovery URL;
- one replaceable latest pending recovery URL;
- duplicate active/pending delivery suppression;
- an explicit marker preventing the older attempt from committing recovery
  state after a newer link arrives; and
- a drain that starts the pending winner only after the active exchange and any
  reconciliation it initiated have settled.

This preserves serialized single-use exchanges while making the latest
distinct deliberate recovery callback authoritative.

## Evidence

- PR #41 prerequisite merged as
  `da4692a30d8b039e7f671d9b9a882830cc9a3708` and was integrated locally before
  final validation. Its SDK 57 `package.json` and `package-lock.json` alignment
  remained inherited without Task 18 dependency changes.
- Corrected authoritative-B regression: passed.
- Attempt 2 removal audit: six selected queue, auth-transition, and
  reconciliation tests passed.
- Attempt 3 removal audit: the same six selected tests passed.
- Focused AuthProvider + recovery-screen run: two suites, 63/63 tests passed.
- Existing non-fatal React `act()` warnings remained unchanged.
- `npm run typecheck`: passed.
- `npm run check:readonly`: passed.
- `git diff --check`: passed.
- `npm run check:expo`: passed on the final merged tree, including 37/37 suites
  (326/326 tests), authoritative host Expo Doctor 21/21, and Expo dependency
  alignment (`Dependencies are up to date`).

## Disposition

Resolved within the frozen PR #37 remediation epoch for root cause
`PRRT_kwDOTGcw_c6ZklUs`. No third production correction, broader Auth redesign,
Supabase flow change, schema/RLS work, Task 19 work, environment change, or
physical-evidence change was needed. Attempt 1 is retained; Attempts 2 and 3
remain removed after the bounded audit. The root cause is resolved locally and
the required Expo validation gate is green after integrating the PR #41
prerequisite.
