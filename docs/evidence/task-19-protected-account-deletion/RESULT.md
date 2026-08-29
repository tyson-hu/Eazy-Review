# Task 19 — Protected Account Deletion

## Status

**Partial — implementation complete; human staging deletion pending.**

The prior published draft PR #43 head
`f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e` passed exact-head Expo CI run
`32615974049` and Database CI run `32615974012`. A fresh safe local
verification run on 2026-08-29 passed the Task 19 Function, frontend,
database, gateway, web, and iOS Simulator lanes against that head. A5
maintenance PR #44 validated and merged the ten expected SDK 57 patches at
`f3886a5160b00f3326281741dd002f17b5d8a6a3` (merge commit
`33c66ee56b825aa53df5c488e374886591275d25`). Task 19 is published on that
`master` at current PR head
`4c8ab7ab0fbf56d9b87c8a6d98b4fc88c48a6c75` (Account keyboard remediation);
exact-head Expo CI run `33279912599` and Database CI run `33279912602`
passed.

No agent or tool submitted account deletion, used a real deletion bearer,
deployed/configured a hosted Function, marked the PR ready, accepted, merged,
or touched production.

H1 physical-device e2e is **tested-pass** on reviewed SHA
`4c8ab7ab0fbf56d9b87c8a6d98b4fc88c48a6c75` after the Account keyboard
remediation (`Screen` scroll keyboard insets + deletion-form scroll-into-view).
Human walk completed Browse → Account → sign-in → Delete Account → software
keyboard → Cancel; confirmation copy, Current password, and Cancel / Delete
actions remained visible and reachable above the keyboard. No deletion was
submitted. Earlier **tested-fail** on `5171d03` (keyboard occlusion) is retained
as historical proof:
`screenshots/ios-physical-01-delete-keyboard-obscures.png`.

## Verification board

| Blocked / needs disposition | Backlog | In progress | Ready for human | Done |
| --- | --- | --- | --- | --- |
| **H2** Hosted staging deletion — deployment/configuration not authorized or verified. | **H3** Final human review and acceptance after all prior cards are closed. | — | — | **A1** Function + frontend tests.<br><br>**A2** Local database + unauthenticated gateway.<br><br>**A3** 393×852 mobile web.<br><br>**A4** iOS Simulator 26.5.<br><br>**A5** SDK 57 patch maintenance integrated (PR #44 / `8f2f2a9`).<br><br>**A6** Published exact-head CI on `4c8ab7a` (Expo `33279912599`, Database `33279912602`).<br><br>**H1** Physical-device non-destructive walk — **tested-pass** on `4c8ab7a` (prior fail on `5171d03`). |

Card evidence, command results, limitations, findings, and the human-only
checklists live in
[`VERIFICATION.md`](VERIFICATION.md). This dashboard is the canonical current
progress board; the repository status documents point here rather than
repeating the detailed matrix.

## Two-part ownership

| Part | Owner | Scope | Current result |
| --- | --- | --- | --- |
| 1 — safe verification | Agent | All non-destructive tests, local gateway checks, mobile web, and iOS Simulator | **Completed; A5 integrated and exact-head CI green on `4c8ab7a`** |
| 2 — acceptance | Human | Physical device, hosted staging destructive matrix, and final review/acceptance | **H1 tested-pass on `4c8ab7a`; H2/H3 pending.** |

## Current proof set

- `screenshots/web-01-signed-out-account.png`
- `screenshots/web-02-delete-confirmation.png`
- `screenshots/ios-01-signed-out-account.png`
- `screenshots/ios-02-delete-confirmation.png`
- `screenshots/ios-physical-01-delete-keyboard-obscures.png` (historical H1 fail on `5171d03`; superseded by tested-pass on `4c8ab7a`)

All five captures are identity-free. Raw interactive state and disposable
local credentials are not retained.

## Remaining gate

H1 is **tested-pass** on `4c8ab7a` with refreshed exact-head CI green.
**H2** remains blocked until staging deployment/configuration and environment
identity are separately authorized and verified. **H3** waits on H2 against
reviewed SHA `4c8ab7a`. Do not run H2 against pre-integration `f64cb3d`. Green
tests, simulator/web results, or CI do not establish destructive or human
acceptance.
