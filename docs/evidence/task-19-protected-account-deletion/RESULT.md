# Task 19 — Protected Account Deletion

## Status

**Partial — implementation and H1/H2 complete; human acceptance (H3) pending.**

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
or touched production. H2 deletion was human-executed on staging only.

H1 physical-device e2e is **tested-pass** on reviewed SHA
`4c8ab7ab0fbf56d9b87c8a6d98b4fc88c48a6c75` after the Account keyboard
remediation. H2 human staging destructive matrix is **tested-pass** on that
same reviewed SHA (2026-08-30): cascade, Community Score recomputation,
last-rater null aggregates, primary-device local cleanup / anonymous Browse,
offline relaunch, deleted-credential sign-in rejection, and second-session
refresh rejection all passed. Residual access-token observation: the second
client still displayed account A in the UI but had no rating access through
JWT `exp` (global revoke invalidates refresh; residual access-token lifetime
is expected and not immediate invalidation). Staging JWT expiry ≤ 3,600s was
previously human-confirmed. Earlier H1 **tested-fail** on `5171d03` (keyboard
occlusion) is retained as historical proof:
`screenshots/ios-physical-01-delete-keyboard-obscures.png`.

## Verification board

| Blocked / needs disposition | Backlog | In progress | Ready for human | Done |
| --- | --- | --- | --- | --- |
| — | — | — | **H3** Final human review and acceptance. | **A1** Function + frontend tests.<br><br>**A2** Local database + unauthenticated gateway.<br><br>**A3** 393×852 mobile web.<br><br>**A4** iOS Simulator 26.5.<br><br>**A5** SDK 57 patch maintenance integrated (PR #44 / `8f2f2a9`).<br><br>**A6** Published exact-head CI on `4c8ab7a` (Expo `33279912599`, Database `33279912602`).<br><br>**H1** Physical-device non-destructive walk — **tested-pass** on `4c8ab7a`.<br><br>**H2** Hosted staging deletion — **tested-pass** on `4c8ab7a` (residual second-client UI until JWT `exp` noted). |

Card evidence, command results, limitations, findings, and the human-only
checklists live in
[`VERIFICATION.md`](VERIFICATION.md). This dashboard is the canonical current
progress board; the repository status documents point here rather than
repeating the detailed matrix.

## Two-part ownership

| Part | Owner | Scope | Current result |
| --- | --- | --- | --- |
| 1 — safe verification | Agent | All non-destructive tests, local gateway checks, mobile web, and iOS Simulator | **Completed; A5 integrated and exact-head CI green on `4c8ab7a`** |
| 2 — acceptance | Human | Physical device, hosted staging destructive matrix, and final review/acceptance | **H1/H2 tested-pass on `4c8ab7a`; H3 pending.** |

## Current proof set

- `screenshots/web-01-signed-out-account.png`
- `screenshots/web-02-delete-confirmation.png`
- `screenshots/ios-01-signed-out-account.png`
- `screenshots/ios-02-delete-confirmation.png`
- `screenshots/ios-physical-01-delete-keyboard-obscures.png` (historical H1 fail on `5171d03`; superseded by tested-pass on `4c8ab7a`)

All five captures are identity-free. Raw interactive state and disposable
local credentials are not retained.

## Remaining gate

H1 and H2 are **tested-pass** on `4c8ab7a`. Canonical status docs and draft
PR #43 description are synchronized to that evidence. **H3** (final human
accept/reject) remains. Do not treat readiness, merge, or production as
authorized by H2 alone. Agents must never submit account deletion.
