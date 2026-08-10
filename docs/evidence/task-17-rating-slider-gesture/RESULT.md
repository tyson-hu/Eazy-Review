# Task 17 Rating Slider Gesture Evidence

Date: 2026-08-09

## Scope

Local evidence for the Task 17 Rate/Edit gesture correction: replace the
custom responder-driven score track with the supported native community
slider, keep non-drag alternatives, and prevent iOS full-screen Back from
competing with slider adjustment on the Rate/Edit route.

## Build And Device

- Checkout: `agent/task-17-my-rating-persistence` (uncommitted local changes).
- Simulator: `Eazy-Review-iPhone-15`, iOS 26.5.
- Logical viewport: 393 x 852 points.
- Runtime: Expo Go with the local Expo SDK 57 Metro bundle.
- Product route: Nike Air Force 1 Low White,
  `a1000000-0000-4000-8000-000000000001`.

## Automated Validation

Status: **pass**

- Focused slider, Rate/Edit, and authentication tests: 3 suites, 17 tests
  passed.
- Full repository Jest run: 34 suites, 243 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run check:readonly`: passed.
- `npm run check` outside the agent sandbox: passed, including Expo Doctor
  20/20 and Expo dependency alignment.
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

- Approximately 60 points horizontal / 20 points vertical: blocked.
- Approximately 10 points horizontal / 60 points vertical: blocked.
- At least 40 points vertical drift after horizontal activation: blocked.
- Slider drag cannot dismiss Rate/Edit: blocked.
- Leading-edge Back outside the slider still works: blocked.

## Accessibility And Dynamic Type

- Unit-level adjustable role, accessible value, label, and half-step actions:
  **pass**.
- VoiceOver announcement and adjustment on the native control: **not-tested**.
- XXL Dynamic Type visual overlap on the authenticated Rate/Edit form:
  **not-tested**.
- Minus, plus, and Clear keep 44-point control heights in component tests:
  **pass**.

## Physical Device

Status: **not-tested**

One-handed curved-thumb behavior, scroll arbitration, Back isolation,
VoiceOver, and Dynamic Type still require the Task 17 physical-device matrix.
Human acceptance is not claimed.

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
UIKit gesture arbitration under a real curved thumb. This packet deliberately
does not infer simulator or physical-device acceptance from unit tests or from
the Sign in screenshot.
