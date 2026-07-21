# Web Mobile Preview SOP

Canonical procedure for interactive **Expo web** validation at a mobile viewport using the **Playwright MCP** (`user-playwright`). Use this as the secondary cross-platform check beside `docs/MOBILE_SIMULATOR_SOP.md`, or as the primary interactive driver when simulator UI automation is unavailable. Orchestrated UX audits: `docs/UX_SCREENSHOT_AUDIT_SOP.md`.

## When To Use

- Driving search, forms, validation, submit, and recovery flows with evidence.
- Capturing full-page screenshots and accessibility snapshots at **393×852**.
- Reproducing web-only navigation / header quirks.
- Measuring whether a control (e.g. Submit) can scroll into the viewport.

Do **not** treat web-only results as a full iOS acceptance substitute when the task requires a simulator walk. Do **not** add Playwright as a repo dependency for ad-hoc audits — use the MCP (or an explicit approved tooling change).

## Prerequisites

- Metro serving the app (`npx expo start`, same session as mobile when possible).
- Web reachable at `http://localhost:8081` (or the port Expo prints). Confirm with HTTP 200 before automating.
- Playwright MCP available and authenticated if required (`docs/MCP_WORKFLOW.md` policy still applies).
- Absolute paths when saving screenshots into the repo (MCP path resolution may not use the workspace cwd).

## MCP Tool Classification

| Action | Level |
| --- | --- |
| `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_wait_for` | READ |
| `browser_click`, `browser_type`, `browser_fill_form`, `browser_resize` | REVERSIBLE WRITE (state intended UI change before long destructive sequences) |
| `browser_run_code_unsafe` | Prefer narrow built-ins first; use only when a single built-in cannot express the step; never for secrets or prod systems |

## Boot Sequence

1. Ensure Expo/Metro is running for this repo.
2. Open the target route: `browser_navigate` → `http://localhost:8081/browse` (or the flow’s entry URL).
3. Resize immediately: `browser_resize` → **width 393**, **height 852** (design reference width from `docs/DESIGN.md`).
4. Wait for real content (`browser_wait_for` on a product name, CTA label, etc.) — do not screenshot the loading placeholder unless testing loading itself.

## Screenshots And Snapshots

Evidence folder for audits:

```txt
docs/evidence/<task-or-topic>/screenshots/
```

See `docs/evidence/README.md`. Naming:

- `web-01-short-kebab-description.png` (or `01-…` when web-only)
- Keep flow order aligned with the audit step table when one exists.

Capture:

- Viewport: default `browser_take_screenshot` (first paint / above the fold).
- Full page: `fullPage: true` when proving below-the-fold CTAs or long forms.
- Always pair critical claims with `browser_snapshot` (accessibility tree). Snapshots survive when an image file is wrong or overwritten.

Checksum discipline:

- After a batch of shots, compare hashes (`shasum`) across differently named files.
- **Unexpected** identical hashes are a bad capture when the steps claim different UI states (e.g. Browse vs Detail, unknown Detail vs unknown Rate with distinct chrome). Recapture or replace with route-specific snapshot / observed-step evidence before citing.
- **Intentional convergence** is allowed when two journeys legitimately end on the same rendered screen (e.g. post-submit Detail and Detail opened from Browse). Document the shared hash in the step notes with route or observed-step proof; do not force a meaningless recapture.

## Interaction Patterns

### Search And Lists

1. Target the search field by accessible name (Browse uses `accessibilityLabel="Search products"`).
2. Prefer `fill` for replacing the query; use `slowly` / sequential typing only when testing live filter-as-you-type.
3. Wait for result text or empty/error copy before screenshotting.

Deterministic Browse error (mock): query `__error__` → expect recovery via **Try again** (clears query and reloads list).

### Forms And Dialogs

1. Invalid submit: click primary submit with empty required fields; wait for field error text; screenshot full page.
2. Valid submit on web: RN `Alert` is unreliable — the app uses `window.alert` then navigates. After submit, expect a browser dialog:

   - Handle with `browser_handle_dialog` (`accept: true`), **or**
   - Register `page.once('dialog', …)` inside `browser_run_code_unsafe` before click.

3. If MCP reports a stuck modal state after accept, open a **new tab** (`browser_tabs` action `new`) rather than fighting the dead dialog handle.
4. Prefer SPA transitions (`click` / in-app navigation) to keep session mock ratings. A full `browser_navigate` / `page.goto` remounts JS and **resets** session-only My Rating fixtures.

### Reachability Checks

To prove Submit (or another control) is reachable after focus/scroll:

```js
async (page) => {
  const el = page.getByRole('button', { name: 'Submit rating' });
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  const vp = page.viewportSize();
  return {
    inViewport: !!(box && vp && box.y >= 0 && box.y + box.height <= vp.height),
    box,
    vp,
  };
}
```

Web does **not** prove iOS soft-keyboard occlusion; mark keyboard criteria Partial unless the simulator SOP covers them.

## Navigation Integrity

- Prefer: Browse → tap product card → Detail → Rate/Edit → back.
- Direct URLs (`/product/2`, `/product/2/rate`) are fine for static states.
- Web headers may expose odd accessible names (e.g. `(tabs), back`) or surprising `href` values while the visual back still works. File findings only when reproduced on the real user path; cite snapshot refs.

## What Web Proves Well

- Scripted multi-step journeys with stable evidence.
- Full-page layout and below-the-fold CTAs.
- Accessibility tree / labels for forms and errors.
- Session Alert copy (via `window.alert` text).
- Reload-reset behavior (`goto` same Detail URL).

## What Web Does Not Prove Alone

- Native tab/header chrome and `Alert.alert` button UX.
- Soft keyboard + safe-area interaction.
- Touch target feel on a physical device.

## Failure Handling

| Symptom | Action |
| --- | --- |
| Navigate timeout / blank page | Confirm Metro URL; wait for bundle; retry once |
| Dialog blocks later tools | `browser_handle_dialog` or new tab |
| Full-page files identical across steps | If steps claim different UI: recapture or use snapshot/observed-step. If intentional convergence: document shared hash + route proof |
| Session rating “lost” after navigate | Expected after hard `goto`; keep submit→assert in one SPA session |

## Report Requirements

1. Viewport size used (must include 393 width for mobile-web claims).
2. MCP vs other driver.
3. Which steps were web-only vs also on simulator.
4. Dialog / session-reset limits called out.
5. Evidence paths + snapshot or observed-step citations for each finding.
