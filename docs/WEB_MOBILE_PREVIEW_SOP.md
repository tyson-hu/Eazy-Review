# Web Mobile Preview SOP

Canonical procedure for interactive **Expo web** validation at a mobile viewport using **ego-browser**. Use this as the secondary cross-platform check beside `docs/MOBILE_SIMULATOR_SOP.md`, or as the primary interactive driver when simulator UI automation is unavailable. Orchestrated UX audits: `docs/UX_SCREENSHOT_AUDIT_SOP.md`.

## When To Use

- Driving search, forms, validation, submit, and recovery flows with evidence.
- Capturing full-page screenshots and accessibility snapshots at **393×852**.
- Reproducing web-only navigation / header quirks.
- Measuring whether a control (e.g. Submit) can scroll into the viewport.

Do **not** treat web-only results as a full iOS acceptance substitute when the task requires a simulator walk. Use the installed ego-browser runtime; do not add a browser dependency or substitute another driver incidentally.

## Prerequisites

- Metro serving the app (`npx expo start`, same session as mobile when possible).
- Web reachable at `http://localhost:8081` (or the port Expo prints). Confirm with HTTP 200 before automating.
- Installed ego-browser skill and runtime available (`docs/MCP_WORKFLOW.md` policy still applies). Use an owned task space; it may inherit login state, so verify the target environment before interaction.
- Absolute paths when saving screenshots into the repo (runtime path resolution may not use the workspace cwd).

## Browser Action Classification

Classify each action by its actual effect and target under
`docs/MCP_WORKFLOW.md`. Navigation, reading, screenshots, snapshots, and
resizing are read-only when they cause no external mutation. Clicking or
typing may be a reversible write, high-impact action, or forbidden operation;
the tool name does not establish authority. Account deletion remains
human-only, production database access remains forbidden, and external
submission requires its existing authorization.

Prefer semantic helpers for navigation and interaction. Use bounded `js()`
for page measurements and `cdp()` for capabilities without helpers; inspect
that code and limit it to the scoped page. Neither grants extra authority.

## Boot Sequence

1. Ensure Expo/Metro is running for this repo and confirm the target URL.
2. Load the installed ego-browser skill. Create or resume an owned task space
   with `useOrCreateTaskSpace`, then `openOrReuseTab` the approved entry URL.
3. Set the mobile-web viewport with
   `cdp('Emulation.setDeviceMetricsOverride', {width:393, height:852,
   deviceScaleFactor:1, mobile:false})`. Verify `pageInfo()` reports 393×852;
   this is a CSS viewport, not native-device emulation.
4. Wait for real content with `waitForElement` or observed `snapshotText()`
   state; record URL/title/viewport with `pageInfo()` before capture.

Respect user-control and inactive-space stops exactly as the ego-browser skill
requires. After explicit continuation, use its takeover/claim procedure. Close
only the owned task space with `completeTaskSpace(id, {keep:false})` in a
separate final heredoc after the preceding result confirms the work is done.

## Screenshots And Snapshots

Evidence folder for audits:

```txt
docs/evidence/<task-or-topic>/screenshots/
```

See `docs/evidence/README.md`. Naming:

- `web-01-short-kebab-description.png` (or `01-…` when web-only)
- Keep flow order aligned with the audit step table when one exists.

Capture:

- `captureScreenshot(absolutePath)` can return a blank image after scrolling
  in the installed runtime. For scrolled evidence, use explicit CDP capture
  with document scroll coordinates, then inspect the actual saved image:

  ```js
  const info = await pageInfo();
  const shot = await cdp('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: {x: info.sx, y: info.sy, width: info.w, height: info.h, scale: 1}
  });
  const fs = await import('node:fs/promises');
  await fs.writeFile(absolutePath, Buffer.from(shot.data, 'base64'));
  ```

  Run inside the installed skill's owned `ego-browser nodejs` heredoc. This
  captures the visible document rectangle, including current nested-scroll
  rendering. Record CSS viewport and PNG dimensions separately: device scale
  can produce more image pixels than CSS pixels.
- For full-document capture, obtain `Page.getLayoutMetrics` and use
  `cssContentSize` for the clip's x/y/width/height. Nested scroll containers
  may still hide content; do not call it a full journey capture without inspection.
- Pair critical claims with `snapshotText()` and observed state. For accessible
  names/roles missing from that simplified output, use
  `cdp('Accessibility.getFullAXTree')` and inspect the relevant nodes' role,
  name and ignored fields. A web accessibility tree does not prove VoiceOver
  behavior or complete accessibility conformance.

Checksum discipline:

- After a batch of shots, compare hashes (`shasum`) across differently named files.
- **Unexpected** identical hashes are a bad capture when the steps claim different UI states (e.g. Browse vs Detail, unknown Detail vs unknown Rate with distinct chrome). Recapture or replace with route-specific snapshot / observed-step evidence before citing.
- **Intentional convergence** is allowed when two journeys legitimately end on the same rendered screen (e.g. post-submit Detail and Detail opened from Browse). Document the shared hash in the step notes with route or observed-step proof; do not force a meaningless recapture.

## Interaction Patterns

### Search And Lists

1. Target the search field by accessible name (Browse uses `accessibilityLabel="Search products"`).
2. Use `fillInput` with a fresh snapshot ref or stable locator to replace the
   query; use `typeText` only when testing incremental typing.
3. Wait for result text or empty/error copy before screenshotting.

The former `__error__` query trigger belongs only to archived mock audits. For
connected Browse, reproduce error/retry through the task's approved backend or
focused test setup; ordinary search text must not manufacture a network error.

### Forms And Dialogs

1. Invalid submit: click primary submit with empty required fields; wait for field error text; capture the relevant form and errors with verified viewport or full-page evidence.
2. After a valid connected submit, wait for the routed destination and verify
   the refreshed server-backed state; do not expect a mock-save alert.
3. Native JavaScript dialogs (`alert`/`confirm`/`prompt`) remain a runtime
   limitation on this host: the controlled fixture triggered a user-control
   stop before automated handling completed. Do not repeat the click or keep
   probing after that stop. Follow the installed skill's handoff/continuation
   rules and record human handling separately from automated proof. A future
   runtime may support `Page.handleJavaScriptDialog`; establish that with a
   controlled test before depending on it. This does not apply automatically
   to ordinary in-page DOM dialogs, which use the normal interaction helpers.
4. Prefer SPA transitions (`click` / in-app navigation) for navigation fidelity.
   A full `gotoAndWait` navigation remounts JavaScript and exercises
   auth/session restoration; a persisted My Rating should return when the same
   account and backend remain available.

### Reachability Checks

To prove Submit (or another control) is reachable after focus/scroll:

Use `snapshotText()` to identify the control, scroll it into view, then
measure it with bounded `js()` using `getBoundingClientRect()` and
`innerHeight`/`innerWidth`. Record the bounding box and viewport; verify all
four edges are visible. A successful click alone does not prove reachability.
Do not reuse a ref after refreshing the snapshot.

Web does **not** prove iOS soft-keyboard occlusion; mark keyboard criteria Partial unless the simulator SOP covers them.

Partial describes this criterion's coverage only. Record the limitation and
select the environment status solely from `docs/evidence/README.md`; do not
add a Partial environment status.

## Navigation Integrity

- Prefer: Browse → tap product card → Detail → Rate/Edit → back.
- Direct URLs using a seeded Supabase product UUID are fine for static states.
- Web headers may expose odd accessible names (e.g. `(tabs), back`) or surprising `href` values while the visual back still works. File findings only when reproduced on the real user path; cite snapshot refs.

## What Web Proves Well

- Scripted multi-step journeys with stable evidence.
- Full-page layout and below-the-fold CTAs.
- Accessibility tree / labels for forms and errors.
- Connected form validation, mutation failures, and routed success states.
- Auth/session and PostgreSQL-backed My Rating restoration after a hard reload.

## What Web Does Not Prove Alone

- Native tab/header chrome and `Alert.alert` button UX.
- Soft keyboard + safe-area interaction.
- Touch target feel on a physical device.

## Failure Handling

| Symptom | Action |
| --- | --- |
| Navigate timeout / blank page | Confirm Metro URL; wait for bundle; retry once |
| Dialog blocks later tools | Follow Forms And Dialogs above; honor ownership stops and distinguish human handling from automated proof |
| Full-page files identical across steps | If steps claim different UI: recapture or use snapshot/observed-step. If intentional convergence: document shared hash + route proof |
| Persisted rating missing after hard navigate | Verify the same account restored and Supabase is reachable; do not classify it as expected session-only behavior |

## Report Requirements

1. Viewport size used (must include 393 width for mobile-web claims).
2. ego-browser runtime and capture method used; ownership and cleanup outcome.
3. Which steps were web-only vs also on simulator.
4. Dialog, auth-restoration, and backend-reachability limits called out.
5. Evidence paths + snapshot or observed-step citations for each finding.

For console/error claims, verify the runtime event mechanism (for example,
`drainEvents()`) captures a known test event before relying on an empty log.
Absence of captured events alone is not evidence of an error-free page.
