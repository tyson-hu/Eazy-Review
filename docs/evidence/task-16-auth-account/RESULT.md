# Task 16 — Core Authentication And Account State

## Status

Implementation complete — human acceptance pending.
Do not treat this file as human acceptance of Task 16 or of the token-storage
recommendation.

## Branch and starting SHA

- Branch: `agent/task-16-core-auth-account-state`
- Starting SHA: `f7cb8856ccdebece51e007df301e4ce578892c1a` (Task 15 merge / PR #32)

## Scope

### Post-merge correction
- `docs/TASKS.md` and `docs/ROADMAP.md`: Task 15 Done/merged; Task 16 current;
  Task 17 Pending.

### Auth architecture
- `src/features/auth/` — types, normalized errors, API (email/password only),
  return-path sanitizer, `AuthProvider`, hooks.
- Status: `initializing | signed-out | signed-in`.
- Context exposes user identity and sign-in/up/out actions only — never tokens.
- Uses existing `getSupabase()` singleton; no second client.
- Session restore on mount; single `onAuthStateChange` subscription; cleanup on
  unmount.
- Auth bootstrap failure does not block anonymous Browse.
- Task 14 owns AppState auto-refresh; AuthProvider does not duplicate it.

### Account behavior
- Signed-out: Your Eazy Review account + Sign in / Create account.
- Signed-in: email, optional display name, member-since, Sign out.
- Owner profile via `profiles` select + existing RLS (no service role).
- Profile query failure keeps the session signed in and shows retry.

### Rate gate
- Signed-out Product Detail: Sign in to rate with safe `returnTo` product path.
- After sign-in: return to product; rating honestly unavailable.
- `/product/[id]/rate` redirects signed-out users to Sign in; signed-in shows
  unavailable empty state. No rating mutations; no mock save restore.

### Cache isolation
- `removeUserScopedQueries` cancels then removes `account` + `rating` keys.
- Triggered on sign-out and user A → user B (not same-user token refresh).
- Public `catalog` keys remain.

### Token storage
- Threat model documented in `docs/SECURITY.md` and `authStorage.ts`.
- SecureStore experiment: **not retained**. Session JSON can exceed iOS
  SecureStore ~2048-byte limit; chunking would violate Task 16 decision rules.
- Recommended (pending human acceptance): keep AsyncStorage for MVP risk level.
- No second competing session store.

## Tests

Focused suites under `src/features/auth/` and `src/features/account/` cover:
- AuthProvider restore/listener/cleanup, A→B purge, same-user refresh retain,
  catalog preservation.
- Auth API: sign-in/up session outcomes, confirmation-required, invalid
  credentials, offline, error normalization without raw SDK text.
- Account signed-out/in, profile failure while signed in, A/B isolation.
- Rate gate return path and unavailable signed-in states.
- Return-path allowlist / external URL reject.
- Auth storage adapter regression (existing Task 14 suite retained).

At implementation-complete gate (local): `157` Jest tests passed.

## Device and network

- Device: physical iPhone LAN journey is required for human acceptance and
  was not executed in the automated agent environment for this handoff.
  Automated proof covers auth unit tests, cache isolation, web static export
  (includes `/auth/sign-in` and `/auth/sign-up`), and local `test:db:reset`
  (profile trigger + owner RLS path). Human device checklist remains in Packet
  10 of the Task 16 prompt / PR body.
- Local DB: `npm run test:db:reset` PASS (456 pgTAP + concurrency).
- Staging/production: untouched.

## Known limitations

- No password recovery, deletion, social auth, MFA, or profile editing.
- Current-device sign-out only (not global multi-device revocation).
- AsyncStorage is not encrypted at rest (documented MVP tradeoff).
- Rating persistence is explicitly Task 17 — not implemented here.

## Boundary confirmation

- Task 17: **not implemented**.
- Staging: **untouched**.
- Production: **untouched**.
- Schema / RLS / grants / migrations / Community Score triggers: **unchanged**.
- No service-role key in Expo, tests, or evidence.
- Dependabot PR #30: **not touched**.
