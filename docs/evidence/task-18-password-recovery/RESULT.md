# Task 18 — Password Recovery And Deep Links

## Status

**Task 18 — implementation complete / acceptance pending.**

| Surface | Status |
| --- | --- |
| Automated (local `npm run check:expo`) | **pass** — see Validation below |
| GitHub CI `validate` on PR head | **pass** (see PR #37 checks; re-check after each push) |
| GitHub CI `database` on PR head | **pending / not yet green on write** — re-check PR checks; no schema change claimed |
| Web mobile preview | **not-run** |
| iOS Simulator interactive recovery walk | **not-run** |
| Physical device (recovery A–F) | **not-tested** |
| Human acceptance | **not claimed** |
| Staging Auth redirect configuration | **not performed** |
| Production Auth redirect configuration | **not performed** |

Task 19 is **not** started.

Environment status labels follow `docs/evidence/README.md`
(`pass` / `fail` / `blocked` / `not-run` for simulator/web; `tested-pass` /
`tested-fail` / `not-tested` for physical device).

## Branch and SHAs

- Branch: `agent/task-18-password-recovery`
- Starting master SHA: `3af5e33f202d382c073d2377ee85966d75ac9002` (PR #36 merge / Task 17 accepted)
- Implementation commit (product code): `e43cfead8e39cd72267d03d45eed5f1632c9b6d6`
- PR tip / this evidence revision: run `git rev-parse HEAD` on the branch or open PR #37 head OID (do not treat a stale prose SHA as authoritative after later docs-only commits)

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

Local parent gate (implementation tree; codes path equivalent to
`e43cfead8e39cd72267d03d45eed5f1632c9b6d6` and later docs-only commits):

| Command | Result |
| --- | --- |
| `npm run prepare:routes` | pass |
| `npm run check:skill-wrappers` | pass (24 skill-wrapper tests) |
| `npm run decisions:check` | pass (1 test) |
| `npm run check:secrets` / `test:secrets` | pass (26 tests; scan clean) |
| `npm run check:agent-infra` / `test:agent-infra` | pass (56 tests; graph valid) |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm test` | pass — 37 suites, **291** tests |
| `npx expo-doctor` | pass — 20/20 |
| `npx expo install --check` | pass — dependencies up to date |
| `npm run check:expo` | pass (full parent gate) |

Database: **no recovery SQL/RLS/migration**. Automated green results are not a
claim that Task 11–13 database gates were re-run for new schema behavior.

## Physical iPhone checklist (human)

Build type: Development (`npm run ios:device` / CNG path).  
Backend: local Supabase (LAN) for implementation acceptance.

Device: ________________  iOS: ________________  
Tested commit SHA: ________________

| Scenario | Result |
| --- | --- |
| A. Cold open (terminated → email link → reset → new password) | not-tested |
| B. Warm open (app running → fresh link → single recovery route) | not-tested |
| C. Invalid / expired link → actionable error + request new email | not-tested |
| D. Reused link after successful reset | not-tested |
| E. Offline request/update + manual retry after reconnect | not-tested |
| F. Relaunch after success → session + sign out + sign in with new password | not-tested |

Do not mark `tested-pass` without a human report. Physical deep-link proof is
required for formal Task 18 acceptance (`docs/TASKS.md`).

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
