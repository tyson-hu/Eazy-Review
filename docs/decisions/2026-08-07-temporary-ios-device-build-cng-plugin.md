---
id: decision-temporary-ios-device-build-cng-plugin
date: 2026-08-07
status: accepted
area: tooling-ci
tasks: [15]
pr: 32
tags: [cng, expo, ios, physical-device, xcode]
supersedes: []
---

# Use temporary Expo CNG plugin for Xcode 27 physical-device compatibility

## Context

Physical iPhone development builds under Expo SDK 57 continuous native
generation (CNG) and the project's Xcode 27 / iOS 27 SDK environment hit
reproducible native-generation, build, or launch failures when relying on the
stock Expo template alone. Hand-editing generated `/ios` or committing that
tree would fight CNG and create drift. Ejecting or upgrading Expo mid-Task 15
would expand scope without product need.

A controlled Task 15 A/B experiment (plugin removed → clean prebuild → device
install/launch → plugin restored → same path) reproduced the UIKit scene
lifecycle launch crash without the plugin and cleared it with the plugin
restored. See `docs/evidence/task-15-public-catalog/RESULT.md`.

## Decision

Keep the tracked Expo config plugin
`plugins/withIosDeviceBuildFixes.js` (listed in `app.json`) as a **temporary**
CNG compatibility layer for local physical-iPhone Debug and Release workflows.

Do **not**:

- Commit generated `/ios`
- Rely only on untracked hand-edits under `/ios`
- Eject from Expo for this compatibility need
- Upgrade Expo solely to satisfy this workaround while Task 15 is in flight

Expo development builds remain the primary iOS development runtime for
connected and offline work; Expo Go is not the acceptance runtime for those
paths. Continuous Native Generation stays enabled.

## Consequences

- The plugin owns three native adjustments applied on every iOS prebuild:
  1. `ENABLE_USER_SCRIPT_SANDBOXING = NO` (User Script Sandbox / Bundle phase)
  2. `EXPO_USE_PRECOMPILED_MODULES = false` (build Expo iOS modules from source
     so device codesign covers them)
  3. UIKit UIScene lifecycle (`UIApplicationSceneManifest`, `SceneDelegate.swift`,
     scene-owned AppDelegate boot)
- Future generated iOS trees inherit these overrides; the plugin must not become
  invisible permanent infrastructure.
- Automated coverage in `plugins/withIosDeviceBuildFixes.test.js` asserts
  prebuild **output**, not plugin source text alone.

## Revisit when

Any of:

- The installed Expo SDK / prebuild template includes equivalent upstream fixes
  (for example the scene lifecycle work tracked in Expo issues/PRs such as
  #46663 / #46734)
- Expo SDK is upgraded and stock generation is re-verified on a physical device
- Xcode or iOS SDK defaults change so the generated project no longer needs a
  given sub-fix
- Task 25 begins TestFlight / release-build work (re-validate and remove or
  replace unused sub-fixes)
- Any plugin-owned override conflicts with current Expo-generated native output

When revisiting, prefer removing or narrowing the plugin after a clean
no-plugin regeneration still installs and launches successfully on the same
physical-device path.

## Related

- `plugins/withIosDeviceBuildFixes.js`
- `plugins/withIosDeviceBuildFixes.test.js`
- `app.json`
- `README.md` (physical iPhone development)
- `docs/evidence/task-15-public-catalog/RESULT.md`
- PR #32
- Apple TN3187 (UIKit scene lifecycle adoption)
