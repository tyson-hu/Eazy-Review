# Task 18 — Password Recovery And Deep Links

## Status

**Task 18 — implementation complete / acceptance pending.**

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / check:readonly / full gate) | See closeout commit results in this file |
| Web mobile preview | **NOT CLAIMED** for this packet (not required to open the draft PR) |
| Physical iPhone Recovery A–F | **PENDING HUMAN** |
| Human acceptance | **NOT CLAIMED** |
| Staging configuration | **NOT PERFORMED** |
| Production configuration | **NOT PERFORMED** |

Task 19 is **not** started.

## Branch and SHAs

- Branch: `agent/task-18-password-recovery`
- Starting master SHA: `3af5e33f202d382c073d2377ee85966d75ac9002` (PR #36 merge / Task 17 accepted)
- Implementation head: recorded at handoff / PR open (see git)

## What was implemented

1. **Recovery request** — Sign In + signed-out Account **Forgot password?** →
   `/auth/forgot-password` → `requestPasswordReset` →
   non-enumerating success copy.
2. **Deep-link routing** — `/auth/reset-password` registered; app scheme
   `eazyreview`; local Supabase `additional_redirect_urls` include recovery
   path variants; `Linking.createURL('/auth/reset-password')` as `redirectTo`.
3. **Recovery auth handling** — AuthProvider `recoveryPhase` +
   `PASSWORD_RECOVERY` event; cold/warm URL processing via expo-linking
   without logging secrets.
4. **Password update** — new + confirm, `updatePasswordFromRecovery` once,
   success → Account (`dismissTo`), no rate `returnTo` reuse.
5. **Error/offline** — invalid email, offline, backend failure, invalid/expired
   link, reused link states; no mutation replay.

## Automated verification

Run on implementation head (local; full Expo gate):

| Command | Result |
| --- | --- |
| `npm run prepare:routes` | PASS |
| `npm run check:skill-wrappers` | PASS (24 skill-wrapper tests) |
| `npm run decisions:check` | PASS (1 test) |
| `npm run check:secrets` / `test:secrets` | PASS (26 tests; scan clean) |
| `npm run check:agent-infra` / `test:agent-infra` | PASS (56 tests; graph valid) |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 37 suites, **291** tests |
| `npx expo-doctor` | PASS — 20/20 |
| `npx expo install --check` | PASS — dependencies up to date |
| `npm run check:expo` | PASS (full parent gate) |

Exact HEAD SHA: recorded after commit closeout.

## Physical iPhone checklist (human)

Device: ________________  iOS: ________________  Build: Development
Commit SHA: ________________

| Scenario | Result |
| --- | --- |
| A. Cold open (terminated → email link → reset → new password) | PENDING HUMAN |
| B. Warm open (app running → fresh link → single recovery route) | PENDING HUMAN |
| C. Invalid / expired link → actionable error + request new email | PENDING HUMAN |
| D. Reused link after successful reset | PENDING HUMAN |
| E. Offline request/update + manual retry after reconnect | PENDING HUMAN |
| F. Relaunch after success → session + sign out + sign in with new password | PENDING HUMAN |

Do not mark PASS without a human report.

## Security boundary confirmed

- No schema / RLS / grants / migrations for recovery SQL helpers
- No staging contact; no production configuration
- No service-role credentials
- No token / password / full recovery URL logging
- No account enumeration in success copy
- No social auth / magic-link sign-in / passkeys / MFA
- Task 19 not started

## Local redirect matrix

| Environment | URL | Status |
| --- | --- | --- |
| Local + Development build | `Linking.createURL('/auth/reset-password')` / `eazyreview://…` | Documented + local allowlist |
| Preview / staging | deferred | Separate approval |
| Production | deferred | Tasks 25–26 + human |

## Local developer setup notes

1. Ensure local Supabase is running (`supabase start`) after pulling the
   updated `additional_redirect_urls` (restart Auth if needed).
2. Use a Development build on device (`npm run ios:device`), not Expo Go as the
   primary path for recovery-email acceptance.
3. In Local Supabase Auth email logs / Inbucket (or provider inbox), open the
   recovery email and confirm the redirect targets the app scheme path.
4. Never paste recovery tokens or full recovery URLs into tickets or agents.
