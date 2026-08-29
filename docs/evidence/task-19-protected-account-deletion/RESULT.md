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
`master` at current PR head `8f2f2a9e1f35f9b6cf70742e9d27092beb222367`;
exact-head Expo CI run `33277460000` and Database CI run `33277459991`
passed.

No agent or tool submitted account deletion, used a real deletion bearer,
deployed/configured a hosted Function, marked the PR ready, accepted, merged,
or touched production.

H1 physical-device e2e remains **not-tested**. On 2026-08-29, the fresh
Debug native build passed an Xcode clean, installed and launched on the paired
physical iPhone, and served Browse through iPhone Mirroring. The local
computer-control bridge then rejected every pointer action before it reached
the phone, so the real Account-tab path could not be exercised. No
physical-device Task 19 outcome is claimed until the full non-destructive
Browse → Account → confirmation → software keyboard → Cancel walkthrough is
completed against the reviewed head. No sign-in, password, bearer, or delete
action was used.

## Verification board

| Blocked / needs disposition | Backlog | In progress | Ready for human | Done |
| --- | --- | --- | --- | --- |
| **H1** Physical-device non-destructive walk — **not-tested**: clean build, install, launch, and mirrored Browse passed, but the local pointer-control bridge failed before Account; see `docs/notes/blocker-task-19-iphone-mirroring-control.md`.<br><br>**H2** Hosted staging deletion — deployment/configuration not authorized or verified. | **H3** Final human review and acceptance after all prior cards are closed. | — | — | **A1** Function + frontend tests.<br><br>**A2** Local database + unauthenticated gateway.<br><br>**A3** 393×852 mobile web.<br><br>**A4** iOS Simulator 26.5.<br><br>**A5** SDK 57 patch maintenance integrated (PR #44 / `8f2f2a9`).<br><br>**A6** Published exact-head CI on `8f2f2a9`. |

Card evidence, command results, limitations, findings, and the human-only
checklists live in
[`VERIFICATION.md`](VERIFICATION.md). This dashboard is the canonical current
progress board; the repository status documents point here rather than
repeating the detailed matrix.

## Two-part ownership

| Part | Owner | Scope | Current result |
| --- | --- | --- | --- |
| 1 — safe verification | Agent | All non-destructive tests, local gateway checks, mobile web, and iOS Simulator | **Completed; A5 integrated and exact-head CI green on `8f2f2a9`** |
| 2 — acceptance | Human | Physical device, hosted staging destructive matrix, and final review/acceptance | **H1 not-tested with a local input-control blocker; H2/H3 pending on `8f2f2a9`.** |

## Current proof set

- `screenshots/web-01-signed-out-account.png`
- `screenshots/web-02-delete-confirmation.png`
- `screenshots/ios-01-signed-out-account.png`
- `screenshots/ios-02-delete-confirmation.png`

All four captures are identity-free. Raw interactive state and disposable
local credentials are not retained. The screenshots are local candidate proof
until a later commit/push gate explicitly publishes them.

No physical screenshot is included in this evidence folder or selected for
GitHub proof.

## Remaining gate

H1 remains a separate, non-destructive physical-device verification and is **not-tested**. The current local pointer-control blocker is recorded in `docs/notes/blocker-task-19-iphone-mirroring-control.md`; do not substitute a deep link for the real Browse → Account path. The full confirmation → software keyboard → transient input → Cancel walkthrough must still be completed against reviewed SHA `8f2f2a9` without submitting deletion. **H2** remains blocked until staging deployment/configuration and environment identity are separately authorized and verified. **H3** waits on H1 and H2 against that same SHA. Do not run H1/H2 against pre-integration `f64cb3d`. Green tests, simulator/web results, or CI do not establish destructive or human acceptance.
