# Task 19 Verification Details

## Provenance and boundary

- Date: 2026-08-29
- Branch: `codex/task-19-guarded-account-deletion`
- Prior published reviewed head: `f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e`
  (safe verification and historical exact-head CI)
- Local A5-integrated head (not yet published):
  `1647f5800a9fe4ffa0f15b832bef839e3de23eb4` on `master`
  `33c66ee56b825aa53df5c488e374886591275d25`
- A5 maintenance candidate: `f3886a5160b00f3326281741dd002f17b5d8a6a3`
  (PR #44, merged)
- Pull request: #43, draft/open; remote head still pre-rebase until publish
- Safe run environments: local Supabase, 393×852 Expo web, and
  `Eazy-Review-iPhone-15` on iOS Simulator 26.5
- Destructive boundary: no agent/tool account deletion on local, staging, or
  production; no real deletion bearer; no hosted configuration/deployment

## Environment matrix and evidence disposition

| Environment | Status | Boundary |
| --- | --- | --- |
| Mobile web, 393×852 | `pass` | Non-destructive confirmation/cancel walk |
| iOS Simulator 26.5 | `pass` | Non-destructive confirmation/cancel walk; software keyboard limit below |
| Physical device | `not-tested` | Clean Debug build, installation, launch, Metro bundle, and mirrored anonymous Browse passed; computer-controlled pointer input failed before Account, so H1 is incomplete |

| Remaining lifecycle surface | Status | Boundary |
| --- | --- | --- |
| Staging Function deployment/configuration | `not-run` | Separate authorization and environment identity required |
| Human staging deletion | `not-tested` | H2 is human-only |
| Second-session refresh rejection | `not-tested` | H2 is human-only |
| Residual access-token observation through `exp` | `not-tested` | H2 is human-only |
| Human acceptance | `not-run` | H3 has not occurred |
| Production | `not-run` | Production untouched and forbidden to coding agents |

The four identity-free PNGs named in `RESULT.md` are the selected candidate
GitHub proof set because they establish distinct signed-out and confirmation
states on both platforms. No duplicate, credential-bearing, or diagnostic raw
capture is retained. The selected files remain local/untracked until a later
commit/push authorization.

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

Classification: **maintenance validation pass; Task 19 integration pending
publish**.

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
`master` as `33c66ee56b825aa53df5c488e374886591275d25`. Task 19 was then
rebased locally onto that `master` at
`1647f5800a9fe4ffa0f15b832bef839e3de23eb4`. Publishing that integrated head and
refreshing Task 19 exact-head CI remain pending; A5 is not closed for Task 19
until that publish completes.

### A6 — Published exact-head CI

Historical GitHub state for prior published head `f64cb3d` (2026-08-29):

- PR #43 head equaled `f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e`;
- Expo CI `validate`, run `32615974049`: **pass**;
- Database CI `database`, run `32615974012`: **pass**.

Those runs prove only that SHA under its then-current dependency metadata.
After the A5 rebase, remote PR #43 still points at the pre-integration head.
Exact-head CI for local integrated head
`1647f5800a9fe4ffa0f15b832bef839e3de23eb4` is **pending publish**.

## Part 2 — Human-owned gates

### H1 — Physical-device non-destructive walk

H1 remains **not-tested**. A valid physical-device result requires the complete non-destructive Browse → Account → confirmation → real software keyboard → transient input → Cancel walkthrough against the reviewed head. No sign-in, password, bearer, account identity, or delete action is claimed in this record.

#### 2026-08-29 clean-build, access, and control attempt

- Mode: physical-device preflight via local Xcode/Expo development build and
  iPhone Mirroring; this was not a completed H1 walkthrough.
- Target: paired physical iPhone 17 Pro Max; no device identifier is retained.
- `xcodebuild -workspace ios/EazyReview.xcworkspace -scheme EazyReview
  -configuration Debug -destination 'generic/platform=iOS' clean`:
  **pass** — `CLEAN SUCCEEDED`.
- The first `npx expo run:ios --device <paired iPhone> --port 8082` attempt
  compiled successfully but exited 1 because the phone was locked before launch.
  After the phone was unlocked, the retry again reported `Build Succeeded`, 0
  errors, and one non-failing Expo Dev Launcher ambiguous-script-dependency
  warning. It loaded the redacted local public environment; the installed app
  was then confirmed through Xcode device information and launched through the
  Xcode device launcher.
- Metro observed `iOS Bundled 607ms node_modules/expo-router/entry.js (1848
  modules)`. After the phone was locked again, iPhone Mirroring displayed the
  physical app's anonymous Browse screen with the seeded catalog.
- Pointer control was **blocked by the local Computer Use bridge**, not by an
  app finding. Multiple `sky.click` attempts—first by display name and then
  after refreshing state with bundle identifier `com.apple.ScreenContinuity`—
  returned `Sky Computer Use native pipe closed before response`. A refreshed
  keyboard `Tab` command was accepted, but it did not navigate the screen.
  The real Account-tab path therefore remained unreachable. The complete
  reproducibility record is
  `docs/notes/blocker-task-19-iphone-mirroring-control.md`.
- A fresh continuation session initialized a new bridge, refreshed the full
  mirroring state, and again observed anonymous Browse. Its first safe Account
  tap returned the same native-pipe error before reaching the phone, so the
  retry stopped at the required tooling-unavailable boundary.
- Observed H1 steps: clean build → installed app → launched app → Metro bundle
  → mirrored anonymous Browse. No Account screen, sign-in, credential entry,
  confirmation card, keyboard in the app, transient input, Cancel action, or
  destructive action occurred. No physical screenshot was saved in the
  evidence folder or selected for GitHub proof.

This preserves the physical-device status as `not-tested`; native compilation,
installation, launch, and Browse do not establish the required Account-card
interaction result. Repair or replace the local pointer-control path first,
then resume the real tab journey without substituting a deep link.

Record the exact reviewed SHA and device/runtime. Then:

- [ ] Open Account signed out and confirm anonymous browsing remains available.
- [ ] Sign in with a human-managed disposable non-production account.
- [ ] Open Delete Account and verify the full permanence/recalculation copy.
- [ ] Focus Current password and verify the real software keyboard, safe area,
      scrolling, and reachability of Cancel / Delete my account.
- [ ] Enter a transient value, confirm the destructive button enables, and
      **do not submit deletion** in this card.
- [ ] Tap Cancel, reopen, and confirm the field cleared and submit is disabled.
- [ ] Record `tested-pass` or `tested-fail` with the exact SHA.

### H2 — Human staging destructive matrix

Prerequisites (separate authority): staging environment identity, Function
deployment, server-secret configuration, reviewed SHA, effective JWT expiry no
greater than 3,600 seconds, and a staging account with multiple ratings, a
private note, a shared-product rating, a last-rater product, and a second
pre-existing session.

Human-only checks:

- [ ] record safe pre-state counts/scores without identity or secret data;
- [ ] perform the in-app deletion on the physical device;
- [ ] verify profile / My Rating / private-note cascade;
- [ ] verify shared-product Community Score recomputation;
- [ ] verify last-rater count `0` and null averages/score;
- [ ] verify local auth/user-cache cleanup and anonymous Browse;
- [ ] verify force-close/offline relaunch does not restore the deleted principal;
- [ ] verify deleted credentials cannot sign in;
- [ ] verify the second session cannot refresh;
- [ ] observe already-issued access-token behavior through `exp`; and
- [ ] record staging JWT expiry and the final human result.

No agent/tool may execute any H2 deletion step.

### H3 — Final review and acceptance

The final human gate requires:

- [ ] A5 integration published on Task 19 with refreshed exact-head CI, or
      explicitly dispositioned by the human;
- [ ] H1 physical-device result recorded against the final integrated SHA;
- [ ] H2 staging destructive result recorded against the same reviewed SHA;
- [ ] current exact-head CI, mergeability, and review-thread state refreshed;
- [ ] canonical status docs and PR description synchronized after the evidence
      actually exists; and
- [ ] explicit human accept/reject decision.

Human acceptance does not itself authorize PR readiness, merge, deployment, or
production.

## Overall result and next decision

A5 maintenance validation **passed** at `f3886a5` / PR #44 and is merged to
`master`; Task 19 is rebased locally at `1647f58`, but published integration
and fresh exact-head CI remain pending. Prior agent-owned lanes remain green on
historical `f64cb3d`. H1 is **not-tested**; H2 is **not-run** / human-only;
H3 waits on the final integrated SHA plus H1 and H2. Do not run H1/H2 against
`f64cb3d`. Next authorized step: publish the rebased Task 19 head and obtain
fresh exact-head Expo and Database CI; never submit deletion.
