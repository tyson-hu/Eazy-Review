# Task 19 Verification Details

## Provenance and boundary

- Date: 2026-08-29
- Branch: `codex/task-19-guarded-account-deletion`
- Prior published head: `f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e`
  (pre-A5 safe verification and historical exact-head CI)
- A5-integrated published head:
  `8f2f2a9e1f35f9b6cf70742e9d27092beb222367` on `master`
  `33c66ee56b825aa53df5c488e374886591275d25`
- H1–H2 reviewed published head (keyboard remediation):
  `4c8ab7ab0fbf56d9b87c8a6d98b4fc88c48a6c75`
- Human acceptance + confirmation-clarity head:
  `e7e3f2876ed8b5c90adc87d8710a1a1af485b0e0`
  (Expo CI failed: Task 19 Revised Sequence status mismatched Status metadata)
- Closeout tip: `5674bd0e3ab46aef8c1f5de0f665ef23aafda160`
  (ledger alignment + README sync; exact-head Expo CI `33347696741` and
  Database CI `33347696723` pass)
- Post-acceptance code closeout: `39c3927` (signup confirmation exact
  two-slash app URL; no deletion-behavior change; focused 5-suite / 96-test
  and full 42-suite / 496-test frontend gates plus 25/25 Function tests pass
  locally; included in final reviewed head `d0465fb`, with exact-head CI below)
- A5 maintenance candidate: `f3886a5160b00f3326281741dd002f17b5d8a6a3`
  (PR #44, merged)
- Pull request: #43, merged on 2026-08-30 as `ce2f6ec`; reviewed head
  `d0465fb` passed Expo CI `33351392639` and Database CI `33351392818`
- Safe run environments: local Supabase, 393×852 Expo web, and
  `Eazy-Review-iPhone-15` on iOS Simulator 26.5
- Destructive boundary: no agent/tool account deletion on local, staging, or
  production; no real deletion bearer; no hosted configuration/deployment

## Environment matrix and evidence disposition

| Environment | Status | Boundary |
| --- | --- | --- |
| Mobile web, 393×852 | `pass` | Non-destructive confirmation/cancel walk |
| iOS Simulator 26.5 | `pass` | Non-destructive confirmation/cancel walk; software keyboard limit below |
| Physical device | `tested-pass` | Human H1 on `4c8ab7a`: confirmation / Current password / Cancel–Delete remain visible above software keyboard; Cancel path completed. Historical fail on `5171d03`: `screenshots/ios-physical-01-delete-keyboard-obscures.png` |

| Remaining lifecycle surface | Status | Boundary |
| --- | --- | --- |
| Staging Function deployment/configuration | `pass` | Staging `eazy-review-staging` `ACTIVE_HEALTHY`. `delete-current-user` v1 deployed ACTIVE with `verify_jwt=true` (human-approved 2026-08-29). Unauthenticated OPTIONS → 200; unauthenticated POST → gateway 401 before handler. No JWT/bearer obtained; no deletion. Platform injects `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Hosted JWT expiry ≤ 3,600s **human-confirmed**. Disposable fixture account **human-prepared**. |
| Human staging deletion | `tested-pass` | Human H2 on `4c8ab7a` / `eazy-review-staging` (2026-08-30); agent did not submit deletion |
| Second-session refresh rejection | `tested-pass` | Human H2: second session could not refresh after deletion |
| Residual access-token observation through `exp` | `tested-pass` | Second client still showed account A UI but had no rating access through JWT `exp` (expected residual-token / non-immediate access invalidation) |
| Human acceptance | `accepted` | H3 human-accepted on 2026-08-30; confirmation-clarity fix included; PR readiness/merge later completed under separate authorization; production remains separate |
| Production | `not-run` | Production untouched and forbidden to coding agents |

The five identity-free PNGs named in `RESULT.md` are the selected candidate
GitHub proof set (signed-out and confirmation on both platforms, plus
historical physical keyboard-fail capture). No duplicate, credential-bearing,
or diagnostic raw capture is retained.

## Part 1 — Agent-owned safe verification

### A1 — Automated Function and frontend tests

| Command | Result |
| --- | --- |
| `npm run check:functions` with isolated Deno 2.1.14 | **pass** — format, lint, frozen type-check, 25/25 injected-mock tests |
| Focused Task 19 Jest matrix | **pass** — 11 suites / 270 tests |
| `npm test -- --runInBand` | **pass tests** — 41 suites / 495 tests; the process retained the known open handle after completion |
| `npm test -- --runInBand --forceExit` | **pass** — 41 suites / 495 tests, exit 0 |
| `npm run typecheck` | **pass** |
| `npm run lint` | **pass** |
| `npm run check:secrets` | **pass** — 26 scanner tests and clean repository scan |
| `npm run check:readonly` | **pass** — wrappers, decisions, secrets, agent infrastructure, typecheck, lint |
| Post-acceptance redirect regression | **pass** — failed before the fix (`eazyreview:///auth/sign-in`), then 5 suites / 96 tests passed with exact `eazyreview://auth/sign-in` |
| Post-acceptance `npm run check` | **pass** — 42 suites / 496 tests, Expo Doctor 21/21, dependencies aligned; known React `act` and worker-teardown warnings remain |

Known non-failing Jest output remains: React `act(...)` warnings and the
open-worker/open-handle teardown warning. This run does not claim those are
fixed.

### A2 — Local database and gateway boundary

| Check | Result |
| --- | --- |
| `npm run test:db:reset` | **pass** — reset/reapply, 8 pgTAP files / 483 assertions, same-product insert race, multi-product delete race |
| `npm run types:check` | **pass** — generated types match the local schema |
| Unauthenticated `OPTIONS /functions/v1/delete-current-user` | **pass** — HTTP 200 with CORS |
| Unauthenticated `POST /functions/v1/delete-current-user` | **pass** — HTTP 401 at the gateway before the handler |

No JWT was obtained or passed. The local Function was never invoked with an
authenticated caller and no account deletion occurred.

### A3 — Mobile-web preview

- Mode: `web-preview`
- Driver: Playwright MCP
- Viewport: 393×852
- Environment status: **pass**
- Exact-head source: temporary `git archive` snapshot with the repository's
  known-good local `.env`; ignored `.env.local` was not copied or modified
- Journey: signed-out Account → disposable local account → Delete Account
  confirmation → transient secure input → Cancel → reopen cleared → sign out
  → anonymous Browse

Observed pass criteria:

- signed-out Account copy/actions and tab state;
- Delete Account remains on `/account` and opens an inline card;
- permanence, retained public product, Community Score recalculation, and
  cannot-be-undone copy are present;
- secure password field is visible;
- empty destructive submit is disabled;
- transient input enables submit, but submit was never pressed;
- Cancel closes the card; reopening shows an empty field and disabled submit;
- destructive control is scroll-reachable with no horizontal overflow; and
- sign-out returns to anonymous Browse with the seeded product visible.

Evidence:

- `screenshots/web-01-signed-out-account.png`
- `screenshots/web-02-delete-confirmation.png`

Non-blocking findings:

- **P3 — route focus warning:** Chromium reports an `aria-hidden` ancestor
  retaining a focused descendant while leaving the Create Account route.
- **P3 — isolated Auth client warning:** Supabase reports multiple
  `GoTrueClient` instances under the same derived storage-key label during the
  disposable setup. The flow passed and Task 19's isolated client uses
  non-persisting memory storage, but the warning remains visible.

The clean signed-out Account page produced zero errors/warnings. The focused
flow produced no application error; a later anonymous performance-observer
error appeared only after repeated preview tabs and did not reproduce in a
fresh tab, so it is classified as driver noise rather than product evidence.

### A4 — iOS Simulator preview

- Mode: `simulator-walk`
- Driver: XcodeBuildMCP plus `xcrun simctl` capture
- Device/runtime: `Eazy-Review-iPhone-15`, iOS Simulator 26.5
- Environment status: **pass**
- Exact-head source: same temporary `git archive` snapshot used for web
- Journey: connected Browse → signed-out Account → disposable local account →
  Delete Account confirmation → transient secure input → Cancel → reopen
  cleared → sign out → anonymous Browse

Observed pass criteria:

- connected Browse loaded the deterministic seeded product;
- signed-out Account rendered without the earlier oversized-logo defect;
- Delete Account opened the inline card with the required copy and disabled
  empty destructive button;
- a transient secure value enabled the destructive button, which was never
  pressed;
- Cancel closed the card; reopening showed an empty secure field and disabled
  submit;
- sign-out restored the signed-out Account state; and
- anonymous Browse still loaded the seeded product.

Evidence:

- `screenshots/ios-01-signed-out-account.png`
- `screenshots/ios-02-delete-confirmation.png`

Limitations:

- The simulator used hardware-keyboard mode, so software-keyboard occlusion is
  **not proved**. H1 owns that physical-device check.
- The iOS password-save sheet appeared after disposable account creation. Expo
  Go was relaunched without saving; the persisted local session restored and
  the Task 19 walk then completed.
- This is simulator proof, not physical-device or destructive acceptance.

### A5 — Fresh Expo compatibility gate

Classification: **pass — maintenance merged and integrated into published
Task 19 head `8f2f2a9`**.

On the pre-integration head `f64cb3d`, `npm ci` restored the committed lockfile
and `npm run check` passed through tests before Expo Doctor reported ten
expected SDK 57 patch updates:

| Package | Pre-integration committed | Required |
| --- | --- | --- |
| `expo` | 57.0.15 | ~57.0.18 |
| `expo-constants` | 57.0.13 | ~57.0.16 |
| `expo-dev-client` | 57.0.14 | ~57.0.16 |
| `expo-font` | 57.0.1 | ~57.0.2 |
| `expo-linking` | 57.0.7 | ~57.0.8 |
| `expo-router` | 57.0.15 | ~57.0.17 |
| `expo-splash-screen` | 57.0.7 | ~57.0.8 |
| `react-native` | 0.86.2 | 0.86.3 |
| `eslint-config-expo` | 57.0.1 | ~57.0.2 |
| `jest-expo` | 57.0.4 | ~57.0.5 |

Separate maintenance PR #44 aligned those packages (plus an exact
`react-test-renderer@19.2.3` pin for React peer compatibility), passed local
`npm run check`, and obtained exact-head Expo CI `33276840502` and Database CI
`33276840522` on `f3886a5160b00f3326281741dd002f17b5d8a6a3`. It merged to
`master` as `33c66ee56b825aa53df5c488e374886591275d25`. Task 19 was rebased
onto that `master` and published at
`8f2f2a9e1f35f9b6cf70742e9d27092beb222367`.

### A6 — Published exact-head CI

Historical GitHub state for prior published head `f64cb3d`:

- PR #43 head equaled `f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e`;
- Expo CI `validate`, run `32615974049`: **pass**;
- Database CI `database`, run `32615974012`: **pass**.

H1/H2 reviewed head `4c8ab7a` (2026-08-29, keyboard remediation):

- PR #43 head equaled `4c8ab7ab0fbf56d9b87c8a6d98b4fc88c48a6c75`;
- Expo CI `validate`, run `33279912599`: **pass**;
- Database CI `database`, run `33279912602`: **pass**;
- PR was draft/open and mergeable at that review point.

Post-acceptance code closeout `39c3927`:

- signup confirmation now generates exact `eazyreview://auth/sign-in` rather
  than the three-slash variant;
- focused 5-suite / 96-test and full 42-suite / 496-test frontend gates pass;
- `npm run check:functions` passes 25/25; and
- the final reviewed head `d0465fb` passed Expo CI `33351392639` and Database
  CI `33351392818` before merge.

Prior A5-integrated published head `8f2f2a9` (2026-08-29):

- PR #43 head equaled `8f2f2a9e1f35f9b6cf70742e9d27092beb222367`;
- Expo CI `validate`, run `33277460000`: **pass**;
- Database CI `database`, run `33277459991`: **pass**.
## Part 2 — Human-owned gates

### H1 — Physical-device non-destructive walk

H1 is **tested-pass** on reviewed SHA
`4c8ab7ab0fbf56d9b87c8a6d98b4fc88c48a6c75` after the Account keyboard
remediation (`Screen` `automaticallyAdjustKeyboardInsets` plus deletion-form
scroll-into-view on focus / `keyboardDidShow`). Human-driven walk on physical
iPhone completed Browse → Account → disposable sign-in → Delete Account →
software keyboard → Cancel. Confirmation copy, Current password, and Cancel /
Delete my account remained visible and reachable above the keyboard. No
deletion was submitted; no agent held credentials.

Earlier **tested-fail** on
`5171d0373f5414ad3f2bcda87653b9dd1577946c` (keyboard occlusion) is retained as
historical proof:
`screenshots/ios-physical-01-delete-keyboard-obscures.png`.

Checklist (pass on `4c8ab7a`):

- [x] Open Account signed out and confirm anonymous browsing remains available.
- [x] Sign in with a human-managed disposable non-production account.
- [x] Open Delete Account and verify the full permanence/recalculation copy.
- [x] Focus Current password and verify the real software keyboard, safe area,
      scrolling, and reachability of Cancel / Delete my account.
- [x] Enter a transient value; do not submit deletion.
- [x] Tap Cancel, reopen, and confirm the field cleared and submit is disabled.
- [x] Record `tested-pass` with exact SHA `4c8ab7a`; retain historical fail
      evidence for `5171d03`.

#### Agent preflight notes (not the H1 result)

Earlier agent clean/build/install on `5171d03` and historical mirroring
preflight on `f64cb3d` are superseded by the human H1 results (fail then pass
after keyboard fix). See
`docs/notes/blocker-task-19-iphone-mirroring-control.md` only for the prior
agent pointer-control limitation.

### H2 — Human staging destructive matrix

Prerequisites (separate authority): staging environment identity, Function
deployment, server-secret configuration, reviewed SHA, effective JWT expiry no
greater than 3,600 seconds, and a staging account with multiple ratings, a
private note, a shared-product rating, a last-rater product, and a second
pre-existing session.

H2 is **tested-pass** on reviewed SHA
`4c8ab7ab0fbf56d9b87c8a6d98b4fc88c48a6c75` against `eazy-review-staging`
(2026-08-30). Deletion was human-initiated in-app on a physical device; no
agent/tool submitted deletion.

Human-only checks:

- [x] record safe pre-state counts/scores without identity or secret data;
- [x] perform the in-app deletion on the physical device;
- [x] verify profile / My Rating / private-note cascade;
- [x] verify shared-product Community Score recomputation;
- [x] verify last-rater count `0` and null averages/score;
- [x] verify local auth/user-cache cleanup and anonymous Browse;
- [x] verify force-close/offline relaunch does not restore the deleted principal;
- [x] verify deleted credentials cannot sign in;
- [x] verify the second session cannot refresh;
- [x] observe already-issued access-token behavior through `exp` — second
      client still displayed account A but had no rating access until JWT
      expiry (global revoke does not immediately invalidate already-issued
      access tokens; residual lifetime through `exp` is expected); and
- [x] record staging JWT expiry (≤ 3,600s, previously human-confirmed) and
      the final human result (`tested-pass`).

No agent/tool may execute any H2 deletion step.

### H3 — Final review and acceptance

The final human gate requires:

- [x] A5 closed on the published A5-integrated Task 19 head (done at
      `8f2f2a9`; live reviewed head `4c8ab7a`) or explicitly re-dispositioned
      by the human;
- [x] H1 physical-device result recorded (**tested-pass** on `4c8ab7a`);
- [x] H2 staging destructive result recorded against reviewed SHA `4c8ab7a`
      (**tested-pass**; residual second-client UI / no rating access through
      JWT `exp` noted);
- [x] H1/H2 exact-head CI, mergeability, and review-thread state refreshed
      (Expo `33279912599`, Database `33279912602` on `4c8ab7a`);
- [x] canonical status docs and PR description synchronized after the evidence
      actually exists; and
- [x] explicit human accept decision (2026-08-30), including the confirmation-
      clarity instruction / `Current password` placeholder fix.

Human acceptance does not itself authorize PR readiness, merge, deployment, or
production.

## Overall result and next decision

**Done — human accepted on 2026-08-30.** A5/A6 remain green on H1/H2 reviewed
implementation head `4c8ab7a` (Expo `33279912599`, Database `33279912602`). H1
and H2 are **tested-pass** on that SHA. Residual second-client observation (UI
still showed A; no rating access through JWT `exp`) matches the Task 19
non-immediate access-token invalidation rule. Confirmation UX now states to
enter the current password, then tap Delete my account. Acceptance tip
`e7e3f28` failed Expo CI on a Task 19 ledger status mismatch; closeout tip
`5674bd0` aligned Revised Sequence with Status metadata and refreshed
exact-head Expo CI `33347696741` / Database CI `33347696723`. Post-acceptance
code closeout `39c3927` fixes the signup confirmation URL without changing
deletion behavior or H1/H2 provenance. Reviewed head `d0465fb` passed Expo CI
`33351392639` and Database CI `33351392818`; PR #43 merged on 2026-08-30 as
`ce2f6ec`. Never have an agent submit deletion.
