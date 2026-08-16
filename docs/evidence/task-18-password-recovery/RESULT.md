# Task 18 — Password Recovery And Deep Links

## Status

**Task 18 — Human accepted — merge pending.**

| Surface | Status |
| --- | --- |
| Automated (local `npm run check:expo`) | **pass** — see Validation below |
| GitHub CI `validate` on PR head | **pass** (see PR #37 checks; re-check after each push) |
| GitHub CI `database` on PR head | **pass** (see PR #37 checks; re-check after each push; no schema change claimed) |
| Web mobile preview | **not-run** |
| iOS Simulator interactive recovery walk | **not-run** |
| Local Auth runtime (LAN verify origin + app-scheme allowlist) | **pass** — effective container configuration + LAN health verified 2026-08-13 |
| Physical device (recovery A–F) | **tested-pass** — full matrix completed 2026-08-15 on `acac64d2fa77641839b96892da8e3b12b9ee05b3` |
| Old-password rejection after reset | **tested-pass** — human reported the prior password was rejected on 2026-08-15 |
| Human acceptance | **Done — human accepted on 2026-08-15; PR #37 merge pending** |
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
   non-enumerating submitted state, including known account-existence provider
   rejections; transport/service failures remain visible.
2. **Deep-link routing** — `/auth/reset-password` registered; app scheme
   `eazyreview`; local Supabase `additional_redirect_urls` include recovery
   path variants; `Linking.createURL('/auth/reset-password')` as `redirectTo`.
3. **Recovery auth handling** — AuthProvider `recoveryPhase` +
   `PASSWORD_RECOVERY` event; cold/warm URL processing via expo-linking
   without logging secrets; verified PKCE exchanges use the SDK recovery
   redirect type; completed ordinary PKCE/token sessions settle unavailable
   without exposing the form, while transient verification failures remain
   retryable by reopening the same link. Recovery results superseded by sign-out
   or a different current principal cannot reopen the password form, including
   when the superseded exchange later emits an SDK recovery event. The provider
   gates authenticated UI while restoring the superseding SDK session whether
   the stale exchange emits `PASSWORD_RECOVERY` or ordinary `SIGNED_IN`, and
   uses current-device sign-out if reconciliation fails. A failed or throwing
   fallback still settles provider state signed-out. Recovery callback
   exchanges are serialized across duplicate and different links so only one
   single-use code can be consumed at a time. Explicit auth and recovery
   reconciliation respect start order; reconciliation stops when an explicit
   operation already in flight establishes a newer auth state.
4. **Password update** — new + confirm, `updatePasswordFromRecovery` once,
   success → Account (`dismissTo`), no rate `returnTo` reuse.
5. **Error/offline** — invalid email, offline, backend failure, invalid/expired
   link, reused link states; temporary callback failures remain distinct from
   invalid links; missing or mismatched PKCE verifier state is definitive and
   offers a new recovery request; a definitive missing/expired recovery session
   clears the verified password form; no mutation replay.

## Automated verification

Initial local parent gate (implementation tree at
`e43cfead8e39cd72267d03d45eed5f1632c9b6d6` and the later pre-review PR head):

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

Review-remediation worktree verification (2026-08-13):

| Command | Result |
| --- | --- |
| Focused recovery suites | pass — 4 suites, **59** tests |
| `npm run check:readonly` | pass |
| `npm test` | pass — 37 suites, **296** tests |
| `git diff --check` | pass |

Second review-remediation worktree verification (2026-08-13):

| Command | Result |
| --- | --- |
| Focused recovery suites | pass — 3 suites, **37** tests |
| `npm run check:readonly` | pass |
| `npm test` | pass — 37 suites, **299** tests |
| `git diff --check` | pass |

Third review-remediation worktree verification (2026-08-13):

| Command | Result |
| --- | --- |
| Focused `AuthProvider` suite | pass — **26** tests |
| `npm run check:readonly` | pass |
| `npm test` | pass — 37 suites, **300** tests |
| `git diff --check` | pass |

Fourth review-remediation worktree verification (2026-08-13):

| Command | Result |
| --- | --- |
| Focused `AuthProvider` suite | pass — **26** tests |
| `npm run check:readonly` | pass |
| `npm test` | pass — 37 suites, **300** tests |
| `git diff --check` | pass |

Fifth review-remediation worktree verification (2026-08-13):

| Command | Result |
| --- | --- |
| Focused `AuthProvider` suite | pass — **26** tests |
| `npm run check:readonly` | pass |
| `npm test` | pass — 37 suites, **300** tests |
| `git diff --check` | pass |

Sixth review-remediation worktree verification (2026-08-14):

| Command | Result |
| --- | --- |
| Focused `AuthProvider` suite | pass — **28** tests |
| `npm run check:readonly` | pass |
| `npm test` | pass — 37 suites, **302** tests |
| `git diff --check` | pass |

Seventh review-remediation worktree verification (2026-08-14):

| Command | Result |
| --- | --- |
| Focused `AuthProvider` suite | pass — **29** tests |
| `npm run check:readonly` | pass |
| `npm test` | pass — 37 suites, **303** tests |
| `git diff --check` | pass |

Eighth review-remediation worktree verification (2026-08-14):

| Command | Result |
| --- | --- |
| Focused `AuthProvider` suite | pass — **31** tests |
| `npm run check:expo` | pass — 37 suites, **305** tests; Expo Doctor **21/21**; dependencies up to date |
| `git diff --check` | pass |

Ninth review-remediation worktree verification (2026-08-14):

| Command | Result |
| --- | --- |
| Focused auth suites | pass — **56** tests |
| `npm run check:readonly` | pass |
| `npm test -- --runInBand --forceExit` | pass — 37 suites, **308** tests |
| `git diff --check` | pass |

Tenth review-remediation worktree verification (2026-08-14):

| Command | Result |
| --- | --- |
| Focused auth/UI suites | pass — **47** tests |
| `npm run check:readonly` | pass |
| `npm test -- --runInBand --forceExit` | pass — 37 suites, **308** tests |
| `git diff --check` | pass |

Final documentation/evidence review tree (2026-08-15):

| Command | Result |
| --- | --- |
| `npm run check:readonly` | pass |
| `npm test -- --runInBand --forceExit` | pass — 37 suites, **323** tests |
| Independent integrated review | no new code defect; old-password rejection evidence remains the acceptance blocker |

The Jest run still prints the branch's existing React `act()` / worker teardown
warnings while exiting successfully; these review fixes do not claim those
warnings are resolved.

Database: **no recovery SQL/RLS/migration**. Automated green results are not a
claim that Task 11–13 database gates were re-run for new schema behavior.

## Physical iPhone checklist (human)

Build type: Development (`npm run ios:device` / CNG path).
Backend: local Supabase (LAN) for implementation acceptance.

Device: iPhone 17 Pro Max; iOS: 27.0
Tested commit SHA: `acac64d2fa77641839b96892da8e3b12b9ee05b3`

| Scenario | Result |
| --- | --- |
| A. Cold open (terminated → email link → reset → new password) | tested-pass |
| B. Warm open (app running → fresh link → single recovery route) | tested-pass |
| C. Invalid / expired link → actionable error + request new email | tested-pass |
| D. Reused link after successful reset | tested-pass |
| E. Offline request/update + manual retry after reconnect | tested-pass |
| F. Relaunch after success → session + sign out + sign in with new password | tested-pass |

The full matrix was completed through iPhone Mirroring with human handoffs for
password entry, force-quit, and the Wi-Fi-off portions that disconnect
Mirroring. The human subsequently reported that the replaced old password was
rejected and explicitly accepted Task 18 for merge.

## Full physical A–F recovery walk (2026-08-15)

- **Mode:** physical-device recovery walk through iPhone Mirroring, with human
  handoffs where credential entry or the Wi-Fi-off state could not remain
  mirrored
- **Journey:** signed-out recovery request → warm and cold recovery links →
  password update → expired/reused handling → offline failures and retries →
  restored session → sign out → new-password sign in
- **Device:** physical iPhone 17 Pro Max, iOS 27.0
- **Build:** Development build served by Metro at the Mac LAN URL
- **Backend:** local Supabase over the Mac LAN; no staging or production contact
- **Tested SHA:** `acac64d2fa77641839b96892da8e3b12b9ee05b3`
- **Environment matrix:** iOS Simulator `not-run`; mobile web `not-run`;
  physical device `tested-pass`
- **Overall result:** `tested-pass` for recovery scenarios A–F plus the
  old-password rejection; human accepted on 2026-08-15; merge pending

### Step-by-step result

| Scenario | Result | Observed proof |
| --- | --- | --- |
| A — cold open | **PASS** | With Eazy Review force-quit, the newest local recovery email opened the app into one gated Reset Password form; the human entered and submitted a new password; the app settled on **Password updated**. |
| B — warm open | **PASS** | With the app running, a fresh link opened one Reset Password route; password update succeeded and **Go to Account** showed the authenticated local account. |
| C — expired link | **PASS** | A real two-day-old local recovery email settled on **Link not valid** with **Request a new password-reset email** and **Back to sign in**. |
| D — reused link | **PASS** | Reopening the freshly consumed link settled on the same actionable invalid-link state and did not expose the password form. |
| E — offline request/update | **PASS** | With Wi-Fi off, request settled with **Could not send a password-reset email. Please try again.** After reconnect, manual retry reached **Check your email**. A fresh verified form submitted offline settled with **Could not update your password. Please try again.**, preserved both masked fields, and enabled retry; reconnect + manual retry reached **Password updated**. |
| F — relaunch/sign-in | **PASS** | Force-quit and relaunch restored the authenticated Account state; sign-out returned to the signed-out Account surface; the human reported that the replaced old password was rejected, and sign-in with the latest password returned to the same authenticated account. |

### Evidence files and GitHub disposition

Selected representative non-sensitive GitHub proof:

- `screenshots/physical-01-warm-reset-form.png` — gated recovery form
- `screenshots/physical-02-password-updated.png` — successful update state
- `screenshots/physical-04-reused-link.png` — consumed-link restart state
- `screenshots/physical-06-offline-request-error.png` — request failure
- `screenshots/physical-07-offline-update-error.png` — preserved retry form
- `screenshots/physical-09-relaunch-session-restored.png` — restored session

Local-only raw capture IDs (ignored; not repository-hosted):

- `physical-03-authenticated-account.png`
- `physical-05-expired-link.png`
- `physical-08-online-update-retry-success.png`
- `physical-10-new-password-sign-in.png`
- `physical-11-cold-open-password-updated.png`

The omitted captures duplicate the selected success, invalid-link, or Account
states. The report retains the distinct observed sequence and limitations.

### Findings and limitations

- **Findings:** none. No P0–P3 product finding was observed during A–F.
- The human reported the replaced old password was rejected. No password or
  credential value was captured; this completes the remaining acceptance
  criterion.
- iPhone Mirroring disconnects when device Wi-Fi is disabled. The human
  performed the Wi-Fi-off request/update taps, restored Wi-Fi, and locked the
  phone; the agent then captured the preserved error states before retry.
- Credential entry and password-update submission were human-performed. No
  password, recovery token, or full recovery URL was captured or recorded.
- The cold-open Reset Password form was human-observed during the disconnected
  force-quit handoff; the resulting **Password updated** state is captured.
- Simulator and web recovery walks were not part of this run.
- Automated checks were not re-run; the separately recorded exact-branch
  automated results above remain the applicable automation evidence.

### GitHub disposition and next decision

- The six representative files above are selected for PR #37; the other five
  remain local-only under the task-specific `.gitignore` rules.
- Human acceptance is complete and PR #37 is authorized for guarded merge.
  Task 19 remains not started until the merge is verified on `origin/master`.

## Targeted physical A/B — recovery callback fallback (2026-08-13)

This was a narrow physical-device diagnostic, **not** the full recovery A–F
matrix above. At the time of this diagnostic, the A–F matrix was `not-tested`
and Task 18 human acceptance was not claimed. The later 2026-08-15 full matrix
is recorded separately above.

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
- **Full physical A–F result at the time:** `not-tested`

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
remains gated without `PASSWORD_RECOVERY`. At the time, the full physical A–F
matrix was still required; it was subsequently completed on 2026-08-15 above.

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
| Local + Development build | device-reachable Auth `/verify` → `Linking.createURL('/auth/reset-password')` / `eazyreview://…` | Running local Auth verified 2026-08-13; targeted callback A/B pass; full physical A–F `tested-pass` on 2026-08-15 |
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
