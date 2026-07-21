# Task 10 — F4 runtime check

## Run report

- **Mode:** F4 verification across web + native (not full Phase 4 re-audit of F1–F8)
- **Journey:** Browse → Detail → Rate → back → Detail → back → Browse; plus deep-link checks where applicable
- **Evidence directory:** `docs/evidence/task-10-f4-check/`
- **Date:** 2026-07-18
- **Overall result:** **Resolved** for the original F4 defect (confusing accessible name / wrong href). **Not** Phase 4 completion. Deep-link Back → Feed remains a separate P3 limitation on web hard navigations.

### Environment matrix

| Environment | Status |
| --- | --- |
| Mobile web @ 393×852 (Expo web + Playwright MCP) | `pass` |
| iOS Simulator | `pass` (parent-reported 2026-07-18) |
| Physical device | `tested-pass` (parent-reported 2026-07-18) |

### Step-by-step

| Step | Result | Evidence |
| --- | --- | --- |
| Browse → Detail: Back a11y (web) | **pass** — `button` / `aria-label="Back"` / no `href`; no `a[aria-label*="tabs"]` | Snapshot + DOM inspect; `web-01-detail-back-button.png` |
| Detail → Rate: Back a11y (web) | **pass** — same | DOM inspect at `/product/2/rate` |
| Rate → Back → Detail (web) | **pass** — lands `/product/2` | Observed URL |
| Detail → Back → Browse (web) | **pass** — lands `/browse`; Back control gone | Observed URL |
| Fresh-tab deep-link `/product/2` (web) | **pass** on a11y name; Back still shown (`canGoBack` via Expo stack + `initialRouteName: '(tabs)'`); press → `/feed` | Fresh tab inspect |
| Deep-link `/product/unknown` (web) | **pass** on a11y name; Back still shown | DOM inspect |
| iOS Simulator Back chrome / navigation | **pass** | Parent-reported; no separate screenshot artifact in this folder |
| Physical device Back chrome / navigation | **tested-pass** | Parent-reported; no separate screenshot artifact in this folder |

### Findings and severity

| Id | Severity | Notes |
| --- | --- | --- |
| F4 original | **Resolved** | No more `"(tabs), back"` link or misleading `href` on web. Control is a `button` named `Back`. iOS Simulator `pass`; physical device `tested-pass`. |
| F4-deep-link dest | **P3 / known limitation** | On hard web `goto` `/product/:id`, Back remains visible and `router.back()` returns to `/feed` (tabs initial). Not the baseline F4 a11y bug; optional follow-up if parent wants Browse-aware escape. |

### GitHub evidence retention

- This folder’s screenshot `screenshots/web-01-detail-back-button.png` **is** part of Task 10’s repository proof set (1 of **12 committed PNGs** total for Task 10).
- The complete raw Task 10 capture set remains **local-only** and was **not deleted**: all **33 baseline PNGs** and **31** other re-audit PNGs stay on the working machine. GitHub hosts only this F4 proof PNG plus **11** representative re-audit PNGs (see `docs/evidence/task-10-reaudit/RESULT.md`).
- Filenames cited in baseline/re-audit reports for omitted captures are **local capture IDs**, not repository-hosted files.

### Known limitations

- Web Playwright run: native `click()` often timed out; interactions used `dispatchEvent('click')` after role/locator resolve. A11y tree and DOM props were still read from the live page.
- iOS / physical results are parent-reported for this F4 close-out; this folder only stores the web screenshot artifact.
- Screenshot path (committed): `docs/evidence/task-10-f4-check/screenshots/web-01-detail-back-button.png`.

### Automated checks run separately

- Not part of this run (`typecheck`/`lint` previously recorded as passing in handoff).

### Required next decision

- F4 is **Resolved** across web, iOS Simulator, and physical device for the original defect.
- Do **not** treat this as Phase 4 complete or as a Supabase GO input by itself.
- Optional: accept or defer deep-link → Feed as separate P3.
- Continue full Phase 4 re-audit for remaining accepted findings (F1–F3, F5–F8) before any GO decision.
