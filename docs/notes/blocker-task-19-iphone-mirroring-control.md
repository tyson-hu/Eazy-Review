# Blocker — task-19-iphone-mirroring-control — 2026-08-29

## Problem

The physical iPhone successfully ran the freshly cleaned Eazy Review
development build and displayed Browse through iPhone Mirroring, but Computer
Use pointer actions failed before reaching the phone. The expected real
Browse → Account tab navigation therefore cannot be driven by the agent, so
the non-destructive H1 walk cannot continue safely.

## Attempts so far

1. Cleaned the generated Debug build, rebuilt the app, and attempted physical
   install/launch. The first launch was blocked by the locked device; after the
   phone was unlocked, the app was installed and launched.
2. Confirmed the installed bundle through Xcode device information, launched it
   with the Xcode device launcher, and observed Metro bundle the app. After the
   phone was locked again, iPhone Mirroring showed anonymous Browse.
3. Used Computer Use `sky.click` on the Account-tab coordinates with the
   `iPhone Mirroring` display name. It returned the pipe error below and the
   subsequent mirror screen remained Browse.
4. Resolved the app identifier to `com.apple.ScreenContinuity`, refreshed its
   state as required, and retried pointer and window-focus clicks. Each pointer
   attempt returned the same pipe error. A refreshed `Tab` key action was
   accepted but did not navigate the app.
5. In a fresh continuation session, initialized a new Computer Use bridge,
   refreshed the full `com.apple.ScreenContinuity` state, and confirmed that
   iPhone Mirroring still displayed the physical anonymous Browse screen. The
   first safe Account-tab coordinate click again returned `Sky Computer Use
   native pipe closed before response` before reaching the mirrored phone.

## Ruled out

- Native compilation is not the blocker: the clean and both Debug builds
  reported success with 0 errors.
- Physical installation and app launch are not the blocker: Xcode reported the
  Eazy Review bundle installed, its device launcher reported the app launched,
  and Metro served the physical bundle.
- Device availability and mirroring are not the blocker: the physical iPhone
  reported connected and iPhone Mirroring visibly showed Browse.
- The Task 19 UI is not implicated: no Account or confirmation UI was reached.
  No sign-in, credential entry, Cancel, Function invocation, or deletion action
  occurred.

## Evidence

```text
Sky Computer Use native pipe closed before response

Computer Use is not active for '/System/Applications/iPhone Mirroring.app'. You first must call `get_app_state` to get the latest state before doing other Computer Use actions.

sent Tab
```

The state-refresh requirement was then satisfied with
`get_app_state({ app: "com.apple.ScreenContinuity" })`; pointer clicks still
returned the first error. The physical bundle observation was:

```text
iOS Bundled 607ms node_modules/expo-router/entry.js (1848 modules)
```

## Environment facts

- Reviewed branch/head: `codex/task-19-guarded-account-deletion` at
  `f64cb3d45dbab5ead4c31e9c1566f5bab94a6b1e`.
- Physical target: paired iPhone 17 Pro Max, used through the pre-existing
  macOS iPhone Mirroring app.
- The local Debug build loaded `.env.local` and `.env`; no values were logged.
- The generated `ios/` workspace is gitignored. Metro was stopped after the
  blocked attempt so no agent-owned dev server remains running.

## Next hypothesis

The host's Computer Use input transport for `com.apple.ScreenContinuity` lacks
a working pointer path. In a fresh session, repair/re-authorize that input
bridge or use an explicitly available touch-capable device hub, then re-run the
real H1 journey from Browse. Do not substitute a deep link, and never submit
`Delete my account`.
