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
| Local Auth runtime (LAN verify origin + app-scheme allowlist) | **pass** — effective container configuration + LAN health verified 2026-08-13 |
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
| `npm test` | pass — 37 suites, **292** tests |
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

## Targeted physical A/B — recovery callback fallback (2026-08-13)

This was a narrow physical-device diagnostic, **not** the full recovery A–F
matrix above. The A–F matrix remains `not-tested`, and Task 18 human acceptance
is still not claimed.

- **Mode:** targeted physical A/B callback walk (interactive preview evidence)
- **Journey:** local recovery email → terminated app → Safari confirmation →
  Development build launcher → Reset Password
- **Device:** physical iPhone 17 Pro Max, iOS 27.0 (`24A5408d`)
- **Backend:** local Supabase over the Mac LAN; no staging or production contact
- **Baseline A:** committed SHA `79fb7242fae4f6675a1059f2ae4853ce22c14338`
  served from an isolated temporary snapshot; this revision still contained
  the now-removed 750 ms PKCE fallback but had no diagnostic logger
- **Candidate B:** the uncommitted 2026-08-13 worktree candidate instrumenting
  that same fallback with fixed-label recovery diagnostics
- **Targeted physical result:** `tested-pass` for both A and B reaching the
  gated Reset Password form
- **Full physical A–F result:** `not-tested`

### Observed A/B steps

| Variant | Link provenance | Cold-open result | Diagnostic result |
| --- | --- | --- | --- |
| A — committed baseline | Requested by the physical app for a disposable local account | **PASS** — Reset Password exposed the active empty recovery form; submit remained disabled until input | Baseline had no temporary diagnostic logger |
| B — fallback candidate | Fresh local Auth-issued link for a disposable local account; sanitized metadata matched A (`type=recovery`, LAN verify host, `eazyreview:` callback, no PKCE challenge) | **PASS** — same gated recovery form | `callback=tokens-recovery` → `auth-event=SIGNED_IN` → `verified-by=explicit-recovery-token` |

Candidate B did **not** emit `verified-by=750ms-fallback` or
`verified-by=PASSWORD_RECOVERY`. The physical local flow was an implicit
`tokens-recovery` callback, so `processAuthCallbackUrl` verified it explicitly
and returned before the committed PKCE fallback could run. The A/B evidence
therefore did not exercise or justify that fallback.

Evidence captures:

- `screenshots/physical-ab-01-baseline-reset-form.jpg`
- `screenshots/physical-ab-02-candidate-reset-form.jpg`

Known limits:

- Development-build cold links first opened the Expo development launcher;
  the local server row was tapped before the preserved recovery URL reached
  the JavaScript app.
- Candidate B's callback link was issued through the same local Auth service
  rather than through a second successful in-app request. Its sanitized link
  shape matched A, so this proves callback handling, not a second request-UI
  pass.
- No password was entered, changed, or submitted. New-password/old-password
  verification and scenarios B–F remain outside this targeted run.
- Automated checks were not part of this physical A/B run.

**Decision applied:** retained the observed explicit `tokens-recovery` path,
removed the committed 750 ms fallback, and removed the temporary diagnostics.
Automated regression coverage now proves an ordinary PKCE `SIGNED_IN` session
remains gated without `PASSWORD_RECOVERY`. The full physical A–F matrix remains
required for formal Task 18 acceptance.

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
| Local + Development build | device-reachable Auth `/verify` → `Linking.createURL('/auth/reset-password')` / `eazyreview://…` | Running local Auth verified 2026-08-13; targeted callback A/B pass; full physical A–F pending |
| Preview / staging | deferred | Separate approval |
| Production | deferred | Tasks 25–26 + human |

## Local developer setup notes

1. In the gitignored root `.env`, set
   `SUPABASE_AUTH_EXTERNAL_URL=http://<Mac-LAN-IP>:54321/auth/v1`. The host must
   be reachable from the phone and the `/auth/v1` suffix is required.
2. Restart local Supabase after changing that value or
   `additional_redirect_urls`; a running Auth container does not reload either
   setting. Request a fresh recovery email after the restart because old links
   retain their original host and redirect.
3. Use a Development build on device (`npm run ios:device`), not Expo Go as the
   primary path for recovery-email acceptance.
4. In Local Supabase Auth email logs / Inbucket (or provider inbox), confirm
   the fresh link uses the Mac LAN Auth host and an encoded `eazyreview`
   reset-password redirect, then open it on the device.
5. Never paste recovery tokens or full recovery URLs into tickets or agents.
