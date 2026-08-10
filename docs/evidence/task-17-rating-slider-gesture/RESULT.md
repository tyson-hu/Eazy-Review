# Task 17 Rating Slider Gesture Evidence

Date: 2026-08-09 (packet captured); evidence status synchronized 2026-08-09
for the committed/pushed PR #36 tip.

## Scope

Local evidence for the Task 17 Rate/Edit gesture correction: replace the
custom responder-driven score track with the supported native community
slider, keep non-drag alternatives, and prevent iOS full-screen Back from
competing with slider adjustment on the Rate/Edit route.

## Build And Device

- Branch / checkout: `agent/task-17-my-rating-persistence` (PR #36 draft),
  committed and pushed. Gesture implementation lands in `6863a91`; human
  physical testing must use the **final pushed tip SHA** after the
  pre-physical-acceptance review correction commit (not intermediate local
  worktrees, not uncommitted files).
- Simulator: `Eazy-Review-iPhone-15`, iOS 26.5.
- Logical viewport: 393 x 852 points.
- Runtime: Expo Go with the local Expo SDK 57 Metro bundle.
- Product route: Nike Air Force 1 Low White,
  `a1000000-0000-4000-8000-000000000001`.
- Dependency: `@react-native-community/slider@5.2.0` (Expo SDK 57-aligned).

## Automated Validation

Status: **pass** on the final tip (see counts below).

### Earlier gesture-packet run (at implementation commit era)

Retained as historical record of the first post-implementation gate run:

- Focused slider, Rate/Edit, and authentication tests: 3 suites, 17 tests
  passed (narrower selector used during implementation).
- Full repository Jest run: 34 suites, 243 tests passed.
- `npm run typecheck` / `lint` / `check:readonly` / full `npm run check`
  outside the agent sandbox: passed, including Expo Doctor 20/20 and Expo
  dependency alignment.
- `git diff --check`: passed.

### Final-tree automated run (pre-physical-acceptance review tip)

Revalidated after the mismatch-caption and VoiceOver-value text fixes:

- Focused slider, Product Detail, and Rate/Edit suites: 3 suites, 30 tests
  passed (`DimensionStepperRow`, `ProductDetailScreen`, `RateAndDetail`).
- Full repository Jest run (via `npm run check`): 34 suites, 243 tests passed.
- `npm run check` outside the agent sandbox: passed (route prepare, readonly
  gates, Jest, Expo Doctor 20/20, dependency alignment).
- `npm run test:db:reset`: passed (pgTAP 481; concurrency 2 scenarios).
- `git diff --check`: passed.

The Jest run retained pre-existing asynchronous teardown warnings (overlapping
`act()` calls and a worker forced to exit), but returned exit code 0.

## Simulator Gesture Matrix

Status: **blocked**

The live Rate/Edit deep link correctly enforced authentication and stopped at
Sign in. This session had no authorized test-account credential and did not
create an account or write to a remote Supabase environment. The authenticated
form therefore could not be opened for honest curved-drag, vertical-scroll,
post-activation drift, or leading-edge Back testing.

The following acceptance rows remain unclaimed:

- Approximately 60 points horizontal / 20 points vertical: **blocked**.
- Approximately 10 points horizontal / 60 points vertical: **blocked**.
- At least 40 points vertical drift after horizontal activation: **blocked**.
- Slider drag cannot dismiss Rate/Edit: **blocked**.
- Leading-edge Back outside the slider still works: **blocked**.
- Fresh unanswered row stays `—` until the user touches the slider or ±:
  **blocked** (native slider / Clear contract; unit tests mock the module).
- Set a value → Clear → value returns to `—` and stays there without an
  accidental answered `0`: **blocked**.
- One-handed thumb feel: **blocked**.

## Accessibility And Dynamic Type

- Unit-level adjustable role, accessible value (including absolute-scale
  `text` such as `7 of 10` / `not rated`), label, and half-step actions:
  **pass**.
- VoiceOver announcement and adjustment on the native control:
  **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** (not tested on physical
  device; owned by Task 27 — not a Task 17 merge blocker after the 2026-08-10
  scope decision).
- XXL Dynamic Type on the authenticated Rate/Edit form: physical **FAIL** on
  SHA `1325198`; second FAIL after attempt `a635251`; attempt reverted;
  **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** → Task 27.
- Minus, plus, and Clear keep ≥44-point control heights (`min-h-11`) in
  component tests: **pass**.

## Physical Device

Status: **PASS** for slider gestures on 2026-08-10 (Release build, SHA
`1325198`, iPhone 17 Pro Max, iOS 27 Beta 5). Human verified horizontal
adjustment, vertical scroll arbitration, curved-thumb use, Rate/Edit not
dismissed by slider drags, and normal Back outside the slider.

VoiceOver is **not** claimed by this PASS.

Canonical matrix and Dynamic Type FAIL notes:
[`docs/evidence/task-17-my-rating-persistence/RESULT.md`](../task-17-my-rating-persistence/RESULT.md).

## Accepted Screenshots

No authenticated Rate/Edit screenshot is accepted in this packet.

- [`screenshots/ios-01-current.png`](screenshots/ios-01-current.png): local
  app and seeded catalog loaded at 393 x 852; context only.
- [`screenshots/ios-02-sign-in-blocker.png`](screenshots/ios-02-sign-in-blocker.png):
  Rate/Edit deep link stopped at the required Sign in gate; blocker evidence,
  not slider visual acceptance.

## GitHub disposition

Selected for PR #36 on `agent/task-17-my-rating-persistence`: `RESULT.md` plus
both context/blocker screenshots above. No authenticated slider visual proof is
claimed or uploaded.

## Limits

Automated tests verify the native slider contract and route configuration, not
UIKit gesture arbitration under a real curved thumb. Physical gesture PASS is
recorded only for SHA `1325198` as above.
