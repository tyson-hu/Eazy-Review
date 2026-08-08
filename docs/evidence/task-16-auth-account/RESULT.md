# Task 16 — Core Authentication And Account State

## Status

**Task 16 — human accepted / Done.**

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / export / check / db) | **PASS** |
| Web mobile preview (393×852) | **PASS** — web stack/navigation evidence; see [`WEB_RESULT.md`](WEB_RESULT.md) |
| Physical iPhone | **PASS** (human-reported on corrected build, 2026-08-08) |

Task 17 is **Next — pending authorization** and is **not** implemented.

## Branch and SHAs

- Branch: `agent/task-16-core-auth-account-state`
- Starting SHA: `f7cb8856ccdebece51e007df301e4ce578892c1a` (Task 15 merge / PR #32)
- Race-fix commit: `97df31b0d84d7592778d52ab5b4a351ac8fa4ccd`
- Head at acceptance-prep: see PR #35 head OID (updated on closeout commit)

## Human decisions recorded during review

Accepted:

- email/password-only MVP;
- anonymous catalog remains public;
- Rate action requires authentication;
- rating persistence deferred to Task 17;
- Minimal non-editable Account: email, optional avatar/display name/username,
  member-since, sign out;
- current-device sign-out (not global multi-device revocation);
- AsyncStorage accepted for MVP with documented unencrypted-at-rest risk;
- SecureStore lifecycle experiment explicitly waived for Task 16;
- deferred auth/account capabilities remain later work (not forgotten);
- **corrected physical-device checklist PASS** on the build with `dismissTo` +
  auth-generation race guards;
- **formal Task 16 human acceptance / Done.**

## Human-observed navigation bug (resolved)

Before correction:

```text
Browse → Product A → Sign in to rate → successful sign in → Product A
→ Back → Product A again → Back → Browse
```

Root cause: successful authentication used `router.replace(returnTo)`, which
created another Product route instead of dismissing auth screens back to the
existing Product.

Expected / after correction:

```text
Browse → Product A → Sign in to rate → successful sign in → Product A
→ Back → Browse
```

Implementation: `dismissAuthToReturnPath` → `router.dismissTo(sanitizedReturnTo)`.

| Surface | Status for corrected navigation |
| --- | --- |
| Web 393×852 | **PASS** |
| Physical iPhone | **PASS** (human, corrected build) |

Web detail report: [`WEB_RESULT.md`](WEB_RESULT.md).

## Auth-generation race correction

Problem: event-driven `applySession` (and optimistic sign-in/up/out) awaited
user-scoped cache cleanup, then committed `setUser` / `setStatus` without
re-checking the auth generation. A newer transition could be overwritten by a
stale in-flight cleanup.

Fix: capture owning generation before async cleanup; after await, commit only
when generation is still current. Bootstrap generation checks preserved.

Regression tests cover stale `SIGNED_IN` vs newer `SIGNED_OUT`, principal B vs
C, and delayed-restore bootstrap races.

## Scope delivered

### Auth architecture

- `src/features/auth/` — types, normalized errors, API (email/password only),
  return-path sanitizer + dismiss-to helper, `AuthProvider`, hooks.
- Status: `initializing | signed-out | signed-in`.
- Context exposes user identity and sign-in/up/out actions only — never tokens.
- Uses existing `getSupabase()` singleton; no second client.
- Session restore on mount; single `onAuthStateChange` subscription; cleanup on
  unmount.
- Auth generation counter for bootstrap and overlapping async transitions.
- Auth bootstrap failure does not block anonymous Browse.
- Task 14 owns AppState auto-refresh; AuthProvider does not duplicate it.

### Account behavior

- Signed-out: access your account + Sign in / Create account; truthful copy that
  saved ratings arrive in the next milestone.
- Signed-in: email, optional avatar/display name/username, member-since,
  Sign out.
- Sign-out: pending/disabled button, explicit `signOut({ scope: 'local' })`,
  safe error without raw SDK text; session remains signed in on failure.
- Owner profile via `profiles` select + existing RLS; `.abortSignal(signal)`.
- Profile query failure keeps the session signed in and shows retry.

### Rate gate

- Signed-out Product Detail: Sign in to rate with safe `returnTo` product path.
- After sign-in: unwind to existing product; rating honestly unavailable.
- `/product/[id]/rate` redirects signed-out users to Sign in with product
  (not `/rate`) return path; signed-in shows unavailable empty state.
- No rating mutations; no mock save restore.

### Cache isolation

- `removeUserScopedQueries`: cancel, await, then remove user-scoped roots.
- Triggered on sign-out and A → B (not same-user token refresh).
- Public catalog keys remain; late A responses cannot repopulate after purge.

### Token storage

- **HUMAN ACCEPTED** AsyncStorage MVP tradeoff (unencrypted at rest).
- SecureStore experiment **waived** for Task 16.
- No SecureStore package added.

## Later ownership (excluded from Task 16)

| Owner | Scope |
| --- | --- |
| Task 17 | My Rating persistence + Rated Products (**next — pending authorization**) |
| Task 18 | Password recovery + deep links |
| Task 19 | Protected account deletion |
| Later / unassigned unless roadmap promotes | Social login, passkeys/MFA, editable/public profile, global session revocation, secure native session-storage reconsideration |

## Tests

- Navigation intent (`dismissTo`); local sign-out; Account pending/error UX;
  profile abortSignal; cancel-before-remove; A→B isolation; bootstrap races;
  overlapping applySession cleanup races; 174 frontend unit tests at acceptance.

## Device and network

- Automated: **PASS**.
- Web mobile preview: **PASS** (web stack/navigation only).
- Physical iPhone: **PASS** (human, corrected build) — navigation, session
  restore, sign-out, A→B, and temporary network-loss checklist as reported.
- Staging/production: untouched.

## Boundary confirmation

- Task 17: **not implemented**.
- Staging: **untouched**.
- Production: **untouched**.
- Schema / RLS / grants / migrations / Community Score triggers: **unchanged**.
- No service-role key in Expo, tests, or evidence.
- Dependabot PR #30: **not touched**.
- AsyncStorage remains; SecureStore not added.
- PR #35: prepared for merge (draft removed when accepted); merge remains a
  separate human action unless/until authorized.
- Task 16 human acceptance: **recorded**.
