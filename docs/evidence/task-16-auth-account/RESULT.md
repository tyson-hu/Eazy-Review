# Task 16 — Core Authentication And Account State

## Status

**Task 16 — correction implementation complete.**
**Automated and web verification pass.**
**Corrected physical-device re-verification and final human acceptance pending.**

Evidence:

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / export / check / db) | **PASS** (see Validation) |
| Web mobile preview (393×852) | **PASS** — stack/navigation evidence only; see [`WEB_RESULT.md`](WEB_RESULT.md) |
| Physical iPhone | **PENDING HUMAN CONFIRMATION** — a prior physical run that found the duplicate-Product bug is **not** proof that the corrected `dismissTo` build passes |

Do not say Task 16 Done or human accepted until the human explicitly reports the corrected-build physical checklist passed.
Do not start Task 17 until Task 16 is formally accepted.

## Branch and SHAs

- Branch: `agent/task-16-core-auth-account-state`
- Starting SHA: `f7cb8856ccdebece51e007df301e4ce578892c1a` (Task 15 merge / PR #32)
- Previously reviewed head (pre this race fix): `30688c056aa2bab735422bc6ad4fbc330e02de97`
- Correction HEAD: update after the auth-generation race commit lands on the branch

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

- corrected physical-device re-verification after `dismissTo` + auth-generation race fix;
- formal Task 16 Done / human acceptance / merge.

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

Implementation: `dismissAuthToReturnPath` → `router.dismissTo(sanitizedReturnTo)`.

| Surface | Status for corrected navigation |
| --- | --- |
| Web 393×852 | **PASS** (one Back after Product-origin sign-in → Browse) |
| Physical iPhone | **PENDING HUMAN CONFIRMATION** on the corrected build |

Web detail report: [`WEB_RESULT.md`](WEB_RESULT.md).

## Auth-generation race correction (this pass)

Problem: event-driven `applySession` (and optimistic sign-in/up/out) awaited
user-scoped cache cleanup, then committed `setUser` / `setStatus` without
re-checking the auth generation. A newer `SIGNED_OUT` (or newer principal)
could become current while an older transition was still awaiting cleanup; the
stale transition could then overwrite the newer auth state.

Fix: capture the owning generation before async cleanup; after await, commit
state only when `authGenerationRef.current` still matches. Stale transitions
exit without modifying auth state. Bootstrap generation checks are preserved.

Regression tests: stale in-flight `SIGNED_IN` vs newer `SIGNED_OUT`; stale
principal B vs newer principal C; existing delayed-restore bootstrap races.

## Scope after correction pass

### Auth architecture

- `src/features/auth/` — types, normalized errors, API (email/password only),
  return-path sanitizer + dismiss-to helper, `AuthProvider`, hooks.
- Status: `initializing | signed-out | signed-in`.
- Context exposes user identity and sign-in/up/out actions only — never tokens.
- Uses existing `getSupabase()` singleton; no second client.
- Session restore on mount; single `onAuthStateChange` subscription; cleanup on
  unmount.
- Auth generation counter: delayed restore and stale in-flight apply/optimistic
  transitions cannot overwrite a newer auth event.
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
  event generation race; overlapping applySession cleanup races (SIGNED_IN vs
  newer SIGNED_OUT; principal B vs C); A→B purge.

## Device and network

- Automated: **PASS**.
- Web mobile preview: **PASS** for web stack/navigation evidence only (does not
  prove native iOS animation, iOS headers, native session persistence, or
  physical-device network transitions). See [`WEB_RESULT.md`](WEB_RESULT.md).
- Physical iPhone: **PENDING HUMAN CONFIRMATION** on the corrected build
  (navigation, session restore, sign-out, A→B, temporary network loss).
- Temporary network-loss / reconnect: **not re-run on web**; must be verified
  on physical device at final human acceptance.
- Staging/production: untouched.

## Boundary confirmation

- Task 17: **not implemented**.
- Staging: **untouched**.
- Production: **untouched**.
- Schema / RLS / grants / migrations / Community Score triggers: **unchanged**.
- No service-role key in Expo, tests, or evidence.
- Dependabot PR #30: **not touched**.
- AsyncStorage remains; SecureStore not added.
- PR #35 remains draft / unmerged.
- Final Task 16 human acceptance: **not claimed**.
