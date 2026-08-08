# Task 16 — Core Authentication And Account State

## Status

**Correction implementation complete — physical-device re-verification and final
human acceptance pending.**

Do not treat this file as final human acceptance of Task 16.

## Branch and SHAs

- Branch: `agent/task-16-core-auth-account-state`
- Starting SHA: `f7cb8856ccdebece51e007df301e4ce578892c1a` (Task 15 merge / PR #32)
- Previously reviewed head: `16ecbd5fbdf26c663539ff4956b88d435f734335`
- Correction pass: (see latest commit on branch after this evidence update)

## Human decisions recorded during review

Accepted:

- email/password-only MVP;
- anonymous catalog remains public;
- Rate action requires authentication;
- rating persistence deferred to Task 17;
- minimal non-editable Account (email, optional display name, member-since,
  sign out);
- current-device sign-out (not global multi-device revocation);
- AsyncStorage accepted for MVP with documented unencrypted-at-rest risk;
- SecureStore lifecycle experiment explicitly waived for Task 16;
- deferred auth/account capabilities remain later work (not forgotten).

Not yet accepted:

- final Task 16 completion;
- corrected return-navigation behavior until physical-device retest;
- final physical-device / account-switch / network-loss acceptance.

## Human-observed navigation bug

Before correction:

```text
Browse → Product A → Sign in to rate → successful sign in → Product A
→ Back → Product A again → Back → Browse
```

Root cause: successful authentication used `router.replace(returnTo)`, which
created another Product route instead of dismissing auth screens back to the
existing Product.

Expected:

```text
Browse → Product A → Sign in to rate → successful sign in → Product A
→ Back → Browse
```

After code correction:

```text
implementation corrected — physical-device re-verification pending
```

Implementation: `dismissAuthToReturnPath` → `router.dismissTo(sanitizedReturnTo)`.

## Scope after correction pass

### Auth architecture

- `src/features/auth/` — types, normalized errors, API (email/password only),
  return-path sanitizer + dismiss-to helper, `AuthProvider`, hooks.
- Status: `initializing | signed-out | signed-in`.
- Context exposes user identity and sign-in/up/out actions only — never tokens.
- Uses existing `getSupabase()` singleton; no second client.
- Session restore on mount; single `onAuthStateChange` subscription; cleanup on
  unmount.
- Auth generation counter: delayed `restoreSession` cannot overwrite a newer
  auth event.
- Auth bootstrap failure does not block anonymous Browse.
- Task 14 owns AppState auto-refresh; AuthProvider does not duplicate it.

### Account behavior

- Signed-out: access your account + Sign in / Create account; truthful copy that
  saved ratings arrive in the next milestone.
- Signed-in: email, optional display name, member-since, Sign out.
- Sign-out: pending/disabled button, explicit `signOut({ scope: 'local' })`,
  safe error `"Could not sign out. Please try again."` without raw SDK text;
  session remains signed in on failure.
- Owner profile via `profiles` select + existing RLS (no service role);
  request uses `.abortSignal(signal)`.
- Profile query failure keeps the session signed in and shows retry.

### Rate gate

- Signed-out Product Detail: Sign in to rate with safe `returnTo` product path.
- After sign-in: unwind to existing product; rating honestly unavailable.
- `/product/[id]/rate` redirects signed-out users to Sign in with product
  (not `/rate`) return path; signed-in shows unavailable empty state.
- No rating mutations; no mock save restore.

### Cache isolation

- `removeUserScopedQueries` is async: cancel user-scoped queries, await that
  cancel, then remove.
- Triggered on sign-out and user A → user B (not same-user token refresh).
- Public `catalog` keys remain.
- Tests prove late A completion cannot repopulate after purge.

### Token storage

- **HUMAN ACCEPTED** AsyncStorage MVP tradeoff (unencrypted at rest).
- SecureStore experiment **waived** for Task 16 — was not executed; not a
  “rejected because of 2048-byte limit” claim.
- May reconsider secure native storage in later security/release hardening.
- No second competing session store; no SecureStore package added.

## Later ownership (excluded from Task 16)

| Owner | Scope |
| --- | --- |
| Task 17 | My Rating persistence + Rated Products |
| Task 18 | Password recovery + deep links |
| Task 19 | Protected account deletion |
| Later / unassigned unless roadmap promotes | Social login, passkeys/MFA, editable/public profile, global session revocation, secure native session-storage reconsideration |

## Tests

Focused suites cover:

- Navigation intent: product/account/`returnTo` use `dismissTo`; invalid
  destinations fall back safely; rate redirect returns product (not `/rate`).
  Mocked router does **not** claim native stack proof.
- Sign-out local scope assertion; Account pending/disable/error/retry.
- Profile `abortSignal`; cancel-before-remove; late A isolation; public catalog
  preservation.
- Auth restore/listener/cleanup; same-user token refresh retain; bootstrap vs
  event generation race; A→B purge.

## Device and network

- Physical iPhone re-verification checklist is **required** after this
  correction and is **not** claimed complete by the agent.
- Automated proof only: unit tests, cache isolation, web static export,
  `test:db:reset` (when run in gate).
- Staging/production: untouched.

## Boundary confirmation

- Task 17: **not implemented**.
- Staging: **untouched**.
- Production: **untouched**.
- Schema / RLS / grants / migrations / Community Score triggers: **unchanged**.
- No service-role key in Expo, tests, or evidence.
- Dependabot PR #30: **not touched**.
- PR #35 remains draft.
- Final human acceptance: **not claimed**.
