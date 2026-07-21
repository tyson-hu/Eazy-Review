# Task 10 — Phase 1 Baseline Audit Findings

## Run report

- **Mode:** `screenshot-audit`
- **Journey:** Browse → Product Detail → Rating Form (new + edit); capture set steps 1–18
- **Evidence directory:** `docs/evidence/task-10-baseline-ux/`
- **Branch / base:** `cursor/task-10-ux-review` from `master` @ `15109ec`
- **Date:** 2026-07-18
- **Overall result:** Phase 1 baseline `pass` (no P0/P1). Phase 2 triage: **all F1–F8 Accepted**. Phase 3 fix packets applied. **F4 Resolved** (web + iOS Simulator `pass` + physical `tested-pass`; evidence `docs/evidence/task-10-f4-check/`). Phase 4 re-audit still pending for remaining findings.
- **Automated checks:** run after Phase 3 code changes via `skills/test-and-validation-loop` / `npm run typecheck` (+ lint as needed).
- **Required next decision:** Phase 4 integrated re-audit → Supabase readiness **GO** / **CONDITIONAL GO** / **NO-GO**.
- **Procedure:** `skills/interactive-preview-loop` → `docs/UX_SCREENSHOT_AUDIT_SOP.md`, `docs/MOBILE_SIMULATOR_SOP.md`, `docs/WEB_MOBILE_PREVIEW_SOP.md`

### Environment matrix

| Environment | Status |
| --- | --- |
| iOS Simulator (iPhone 16, Expo Go) | `pass` |
| Mobile web @ 393×852 (Expo web + Playwright MCP) | `pass` |
| Physical device | `tested-pass` (parent-reported 2026-07-18; F4 close-out also `tested-pass`) |

Screenshots: `docs/evidence/task-10-baseline-ux/screenshots/`. Unprefixed / `NN-` = iOS Simulator; `web-` = mobile web.

### GitHub evidence retention

- The complete raw baseline capture set (**33 PNGs**, including `probe.png`) remains **local-only** and was **not deleted**.
- GitHub does **not** host baseline PNGs. Filenames in this report (for example `01-…`, `web-06-…`) are **local capture IDs** for the working-machine archive, not repository-hosted files.
- Task 10’s repository proof set is **12 committed PNGs** total elsewhere: 1 under `docs/evidence/task-10-f4-check/screenshots/` and 11 under `docs/evidence/task-10-reaudit/screenshots/` (see those reports). The other **31** re-audit PNGs also remain local-only.

### Known limitations

- iOS soft-keyboard + Submit not captured (step 12 Partial; web scroll reachability measured).
- Some full-page web files were recaptured after duplicate-hash review; intentional convergent states (same Detail UI via different journeys) may share hashes when documented.
- Deep-link-only stacks can pollute back titles — navigation findings require Browse → Detail reproduction.

---

## Capture set coverage

| Step | State | Evidence | Notes / limits |
| --- | --- | --- | --- |
| 1 | Tab nav, Browse discoverable | `01-…`, `web-01-…` | Pass |
| 2 | Browse default list | `02-…`, `web-02-…` | Pass; dual "Browse" title (nav + page) |
| 3 | Positive search brand/name/SKU | `web-03-…`, `web-03b-…` | Pass (Nike brand; SKU `DD1391-100`) |
| 4 | Search empty | `web-04-…` | Pass; recoverable by editing search (no extra CTA) |
| 5 | Deterministic error + recovery | `web-05-…`, `web-05b-…` | Pass; `__error__` + Try again clears query and restores list |
| 6 | Unrated Detail `2` | `06-…`, `web-06-…` | Pass; CTA / My Rating below fold on 393 viewport |
| 7 | Rated Detail `1` | `07-…`, `web-07-…` | Pass; same below-fold CTA |
| 8 | Zero community `6` | `08-…`, `web-08-…` | Pass; `—` / No score yet + "No community ratings yet" |
| 9 | Null Eazy `8` | `09-…`, `web-09-…` | Pass |
| 10 | New rating empty | `10-…`, `web-10-…` | Pass; Submit below fold until scroll |
| 11 | Invalid submit errors | `web-11-…` | Pass; all six fields show "This field is required." |
| 12 | Keyboard + Submit reachability | `web-12-…` + measured scroll | **Partial:** web — Submit scrollable into viewport; **iOS soft keyboard not captured** |
| 13 | Success + updated My Rating | Observed step + a11y snapshot (product `2`); `web-13-…` | Pass; honest session Alert; Community Score unchanged |
| 14 | Back Detail → Browse / Detail from Browse | `web-14-…` | Pass functionally; web a11y back label odd (see F4). `web-13` / `web-14-detail-from-browse` may share hash when both show the same Detail state (intentional convergence). |
| 15 | Edit form prefilled | `15-…`, `web-15-…` | Pass; title "Edit rating" / "Save rating" |
| 16 | Direct `/product/:id/rate` submit | Observed step; `web-16-…` | Pass; lands on Detail after session Alert |
| 17 | Unknown Detail / Rate | `17a/b-…`, `web-17a/b-…` | Pass; empty state only (back is recovery); distinct header chrome (Product vs Rate) |
| 18 | Reload resets session rating | `web-18-…` + hard `goto` | Pass; Overall edit `9` → fixture `8` after reload |

---

## Findings (for parent triage)

### F1 — Rate / Edit primary CTA is below the fold on mobile Detail

| Field | Value |
| --- | --- |
| **Severity** | **P2** (core-flow friction) |
| **Screenshot / step** | Steps 6–7; `06-…`, `07-…`, `web-06-…`, `web-07-…` (viewport cuts off before CTA) |
| **User impact** | User must scroll past Community breakdown + Purchase to discover the only primary action. Conflicts with "one obvious primary action" / decision-first hierarchy. |
| **Evidence** | iOS viewport shots end in Community rows; web full-page shows CTA only after scroll; a11y confirms CTA exists at end. |
| **Recommended correction** | Keep CTA sticky/footer, or move Rate/Edit higher (near scores / My Rating), or shorten above-the-fold content. Prefer sticky primary button without new abstractions if possible. |
| **Owning files** | `app/product/[id]/index.tsx` (Packet B) |
| **Must fix now?** | **Recommend accept** — core journey P2 |
| **Revalidation** | Steps 6–7 viewport: CTA or clear path to CTA visible without hunting; full new-rating journey |

### F2 — Filter / Sort look tappable but are disabled with no explanation

| Field | Value |
| --- | --- |
| **Severity** | **P2** |
| **Screenshot / step** | Steps 2–5; `02-…`, `web-02-…` |
| **User impact** | Users may think filtering is broken. Placeholders are opaque. |
| **Evidence** | Buttons render as secondary actions but `disabled`; no "Coming soon" / helper text. |
| **Recommended correction** | Label as unavailable (e.g. "Filter (soon)") or add caption under the row. |
| **Owning files** | `app/(tabs)/browse.tsx` (Packet A) |
| **Must fix now?** | **Recommend accept** if treated as Browse clarity; else defer P3 |
| **Revalidation** | Step 2 — placeholders communicate non-availability |

### F3 — Rating field errors are not programmatically associated with inputs

| Field | Value |
| --- | --- |
| **Severity** | **P2** (accessibility) |
| **Screenshot / step** | Step 11; `web-11-…` |
| **User impact** | Sighted users see errors; screen-reader / a11y tree may not announce which field failed (`aria-invalid` / `aria-describedby` absent). |
| **Evidence** | Snapshot shows error text as sibling captions only; `RatingInputRow` renders error as separate `AppText`. |
| **Recommended correction** | Wire `accessibilityInvalid` / described-by (or RN equivalent) on the input from `error`. |
| **Owning files** | `src/components/ui/RatingInputRow.tsx`, optionally `Input.tsx` (Packet C) |
| **Must fix now?** | **Recommend accept** for core rating a11y |
| **Revalidation** | Step 11 — invalid submit; a11y snapshot shows invalid state on fields |

### F4 — Web stack back control exposes confusing accessible name / href

| Field | Value |
| --- | --- |
| **Severity** | **P2** (web / navigation clarity); likely lower on iOS |
| **Screenshot / step** | Steps 6, 10, 14; a11y snapshots: link `"(tabs), back"` with `href="/account"` (sometimes `?id=…`) while visual back returns to Browse |
| **User impact** | Assistive tech / link inspection misleads; deep-link stacks also produced wrong back titles on iOS (`10-…` back showed unrelated product). |
| **Evidence** | Playwright snapshots on Detail/Rate; iOS deep-link stack pollution in `10-…`, `17a-…`. Clean Browse→card→back visually returned to Browse. |
| **Recommended correction** | Confirm Expo Router header back behavior on web; avoid relying on deep-link stacks in QA. Fix only if reproducible from Browse→Detail→Rate (not audit deep-link artifact alone). |
| **Owning files** | Product stack layout / Expo Router headers (investigate `app/product/` layout) |
| **Must fix now?** | **Accept** — reproducible on web Browse→Detail |
| **Revalidation** | Browse → Detail → Rate → back → Detail → back → Browse; check labels |
| **Fix status** | **Resolved** — Phase 3 `HeaderBackButton`; web runtime check + iOS Simulator `pass` + physical `tested-pass` (`docs/evidence/task-10-f4-check/RESULT.md`). Not Phase 4 complete. |

### F5 — Empty search has no explicit recovery action

| Field | Value |
| --- | --- |
| **Severity** | **P3** |
| **Screenshot / step** | Step 4; `web-04-…` |
| **User impact** | Mild; search field remains editable with guidance text. |
| **Evidence** | EmptyState title/message only; no Clear / Try again. |
| **Recommended correction** | Optional Clear search button. |
| **Owning files** | `app/(tabs)/browse.tsx` |
| **Must fix now?** | **Defer** |
| **Revalidation** | Step 4 |

### F6 — Duplicate Browse title (header + in-screen title)

| Field | Value |
| --- | --- |
| **Severity** | **P3** |
| **Screenshot / step** | Step 2; `02-…`, `web-02-…` |
| **User impact** | Cosmetic redundancy. |
| **Evidence** | Tabs `headerShown: true` plus page `AppText` "Browse". |
| **Recommended correction** | Hide tab header on Browse or remove in-page title. |
| **Owning files** | `app/(tabs)/browse.tsx` and/or `app/(tabs)/_layout.tsx` |
| **Must fix now?** | **Defer** |
| **Revalidation** | Step 2 |

### F7 — Overall score not visually emphasized on Rating form

| Field | Value |
| --- | --- |
| **Severity** | **P3** |
| **Screenshot / step** | Steps 10, 15; `web-10-…`, `web-15-…` |
| **User impact** | DESIGN asks overall emphasized; all six rows are equal. |
| **Evidence** | Uniform `RatingInputRow` list. |
| **Recommended correction** | Slightly larger Overall row or section separation. |
| **Owning files** | `app/product/[id]/rate.tsx` |
| **Must fix now?** | **Defer** |
| **Revalidation** | Steps 10 / 15 |

### F8 — `docs/USER_FLOWS.md` Flow 2–3 still describe post-auth / community recalculation as the main path

| Field | Value |
| --- | --- |
| **Severity** | **P3** (docs honesty for Supabase readiness) |
| **Screenshot / step** | N/A — docs vs mock Alert (step 13) |
| **User impact** | Agents/humans may expect Community Score to update after mock submit; UI Alert is already honest. |
| **Evidence** | Flow 2–3 still say login gate + Community Score update; Task 9 mock notes exist later in the same doc. |
| **Recommended correction** | Frame Flow 2–3 with mock vs future-backend callouts at the flow level. |
| **Owning files** | `docs/USER_FLOWS.md` |
| **Must fix now?** | **Defer** or docs-only packet if parent wants GO cleanliness |
| **Revalidation** | Doc read-through |

---

## What passed (no finding)

- Browse discoverable; catalog communicates products; search brand/name/SKU.
- Score sources labeled (Eazy vs Community vs My Rating); null/zero edge products usable.
- Unrated → **Rate this product**; rated → **Edit my rating**; edit prefills.
- Invalid submit stays on form and marks every empty score field.
- Valid submit: session Alert is honest (no backend / no community recalc claim); Detail My Rating updates; Community Score unchanged.
- `dismissTo` / navigation returns to Detail without requiring a duplicate stack for the happy path observed on web after submit.
- Unknown id → Product not found on Detail and Rate.
- Hard reload resets session My Rating (step 18).
- Browse `__error__` recoverable via Try again.

---

## Suggested packet mapping (only after acceptance)

| Packet | Findings | Status | Likely files |
| --- | --- | --- | --- |
| A — Browse clarity | F2, F5, F6 | **Done** (Phase 3) | `browse.tsx` |
| B — Detail decision clarity | F1 | **Done** (Phase 3) | `index.tsx` sticky CTA |
| C — Rating friction / a11y | F3, F7 | **Done** (Phase 3) | `rate.tsx`, `RatingInputRow.tsx` |
| Docs-only | F8 | **Done** (Phase 3) | `USER_FLOWS.md` |
| Investigate / fix | F4 | **Resolved** (web + iOS + device; not Phase 4) | `HeaderBackButton.tsx`; evidence `docs/evidence/task-10-f4-check/` |

Packets sharing files must run sequentially.

---

## Parent triage checklist

| Finding | Decision | Notes |
| --- | --- | --- |
| F1 | **Accept** | Sticky Detail CTA |
| F2 | **Accept** | Filter/Sort unavailable labeling |
| F3 | **Accept** | Rating field a11y: web `aria-invalid`/`aria-describedby`; native folds error into `accessibilityLabel` |
| F4 | **Accept** → **Resolved** | Web + iOS Simulator `pass` + physical `tested-pass`. Evidence: `docs/evidence/task-10-f4-check/`. Deep-link → Feed remains separate P3. **Not** Phase 4 completion. |
| F5 | **Accept** | Clear search on empty results |
| F6 | **Accept** | Remove duplicate in-page Browse title |
| F7 | **Accept** | Emphasize Overall on rating form |
| F8 | **Accept** | Frame Flow 2–3 mock vs backend |

Phase 3 fix packets applied 2026-07-18. F4 marked **Resolved** after web check plus parent-reported iOS Simulator / physical device pass (not a substitute for Phase 4). **Next:** Phase 4 integrated re-audit for F1–F8.

For historical reference — original triage prompt: For each finding F1–F8: **Accept** / **Reject** / **Defer**.
