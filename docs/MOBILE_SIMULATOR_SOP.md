# Mobile Simulator Preview SOP

Canonical procedure for interactive mobile validation on the **iOS Simulator** with Expo Go. Use this for human-walk equivalents, screenshot audits, and parent acceptance of mobile-first flows. Web cross-check procedure: `docs/WEB_MOBILE_PREVIEW_SOP.md`. Orchestrated UX audits: `docs/UX_SCREENSHOT_AUDIT_SOP.md`.

## When To Use

- Integrated completion / human simulator walk for a feature task.
- Screenshot or UX audit where mobile viewport is primary.
- Verifying native navigation, headers, tabs, and Alert dialogs.
- Confirming layouts near the design reference width (**393px**).

Do **not** use this SOP to replace `npm run typecheck` / `lint` / `check`. Commands prove types and tooling; this SOP proves interactive UX.

## Prerequisites

- macOS with Xcode Simulator runtimes installed.
- Repo dependencies present (`node_modules`; prefer `npm ci` when installing — `docs/SECURITY.md`).
- Clean enough working tree that Metro serves the intended branch.
- Shell commands that touch the Simulator need unrestricted host access (sandbox often blocks `simctl` / Simulator.app).

## Environment Matrix (record every run)

Use the exact status vocabulary from `docs/evidence/README.md` (one value per slot):

| Slot | Allowed status |
| --- | --- |
| iOS Simulator (record device model + iOS runtime) | `pass` \| `fail` \| `blocked` \| `not-run` |
| Mobile web (secondary; see `docs/WEB_MOBILE_PREVIEW_SOP.md`) | `pass` \| `fail` \| `blocked` \| `not-run` |
| Physical device | `tested-pass` \| `tested-fail` \| `not-tested` (never imply tested) |

Reference layout width from `docs/DESIGN.md`: **393px**.

## Boot Sequence

1. List available devices: `xcrun simctl list devices available`.
2. Boot a phone-class device (prefer a current iPhone):
   `xcrun simctl boot "iPhone 16"` (or equivalent) then `open -a Simulator`.
3. From the repo root, start Expo against that simulator:
   `npx expo start --ios --port 8081`
   Wait until Metro reports the bundle (e.g. `iOS Bundled …`) and Expo Go has opened the project URL (`exp://…`).
4. Confirm the app is interactive with a probe screenshot (next section). If Expo Go is still installing, wait; do not capture evidence during the install splash.

Keep the Metro process running for the whole capture/walk session.

## Screenshots

Save under a durable evidence folder when auditing:

```txt
docs/evidence/<task-or-topic>/screenshots/
```

See `docs/evidence/README.md`. Naming:

- `01-short-kebab-description.png` for simulator captures (flow order).
- Prefix `probe-` only for throwaway boot checks.
- Optional `ios-` prefix when sharing a folder with `web-` captures.

Capture command:

```bash
xcrun simctl io booted screenshot /absolute/path/to/file.png
```

Rules:

- Capture **after** the target UI is stable (loading finished, Alert dismissed if irrelevant).
- Prefer viewport captures for “what the user sees first”; use scrolling + a second shot when the acceptance criterion requires below-the-fold content (e.g. primary CTA).
- Never put secrets, tokens, or `.env` values in screenshots (`docs/SECURITY.md`).

## Navigation Patterns

### Preferred — real user path

Drive the journey the user takes: tab → list → card → detail → form. This produces a trustworthy back stack and header titles.

Without UI automation tools, use Expo deep links carefully (next), then re-walk critical back/nav steps via the real path before accepting navigation findings.

### Deep links (static states)

Open a route on the booted simulator (replace host/port with the Metro URL from the Expo terminal):

```bash
xcrun simctl openurl booted "exp://127.0.0.1:8081/--/browse"
xcrun simctl openurl booted "exp://127.0.0.1:8081/--/product/2"
xcrun simctl openurl booted "exp://127.0.0.1:8081/--/product/2/rate"
```

Limits (must state in findings when relevant):

- Rapid successive deep links **pollute the navigation stack**. Back button titles may show the previous deep-linked screen, not the product under test.
- Do **not** file stack-title bugs from deep-link-only sequences unless reproduced on Browse → Detail → Rate.
- Unknown-id and edge fixtures are fine via deep link (`/product/999`, `/product/6`, `/product/8`).

### Session-only mock state

Mock My Rating writes live in the JS session (`saveMockMyRating`). Reloading the JS context (full app reload / Metro refresh / new Expo Go open that remounts the bundle) **resets** fixtures. Plan capture order so submit → Detail evidence happens **before** an intentional reload-reset check.

## What Simulator Proves Well

- Native tab bar and header chrome.
- `Alert.alert` success copy and button dismissal.
- True device-pixel mobile layout and safe areas.
- Visual hierarchy at phone width.

## What Simulator Does Not Prove Alone

- Soft-keyboard + scroll-to-Submit unless you actually open the keyboard and scroll (hard to automate without extra tooling). Mark **Partial** and cross-check web scroll reachability.
- Cross-platform web header/`href` quirks — use the web SOP.
- Physical device performance, notches, and input — record `not-tested` when skipped.

## Interactive Walk Checklist (core product)

Use when the task asks for a simulator walk or integrated completion:

```txt
Browse tab → default list
→ search (brand / name / SKU)
→ empty search (recover by editing query)
→ open product card
→ Product Detail (scores, My Rating, CTA)
→ Rate or Edit
→ invalid submit (stay on form; field errors)
→ valid submit → session honesty feedback → Detail My Rating updated
→ Back to prior meaningful screen
```

Record pass/fail per step with screenshot or “observed step” notes. Findings must cite evidence.

## Failure Handling

| Symptom | Action |
| --- | --- |
| `simctl` connection refused / no runtimes | Re-run outside sandbox; confirm Xcode Simulator works manually |
| Expo Go install hung | Wait or reinstall Expo Go on the simulator; re-open `exp://` URL |
| Blank / wrong branch UI | Confirm Metro cwd is the repo; restart Expo; hard reload |
| Deep-link back titles wrong | Re-test via real Browse → Detail path before filing |

## Report Requirements

Every mobile preview run that gates task acceptance must state:

1. Device + runtime.
2. Environment matrix with exact statuses (`pass` / `fail` / `blocked` / `not-run`; device `tested-pass` / `tested-fail` / `not-tested`).
3. Evidence paths or observed-step log.
4. Explicit **limits** (keyboard, automation, deep-link artifacts).
5. Full run report fields when this walk is driven by `skills/interactive-preview-loop`.
