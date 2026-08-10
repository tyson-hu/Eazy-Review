# Task 17 Product Detail Restoration — Preview Result

- **Mode:** Scoped `simulator-walk` for Product Detail, with a static-export
  mobile-web adjunct for below-fold inspection.
- **Journey:** Local deep link → Product Detail first viewport → XXL Dynamic
  Type; adjunct Browse → Air Force 1 card → Product Detail → offers → score
  comparison → My Rating → description.
- **Overall result:** **Pass** for the scoped 393px native visual check. The
  canonical live-Metro web preview was blocked by the host environment; the
  exported web bundle was inspected only as an adjunct.

## Environment matrix

| Slot | Status | Environment |
| --- | --- | --- |
| iOS Simulator | `pass` | Eazy-Review-iPhone-15, iOS 26.5; 1179×2556 pixels at 3× = 393×852 logical points |
| Mobile web | `blocked` | Existing Metro web route returned 500; isolated Metro start hit host `EMFILE`. A 393×852 static-export adjunct was captured and is not counted as the canonical live-Metro result. |
| Physical device | `not-tested` | Required before physical-device completion is claimed. |

## Step results

1. **Native first viewport — pass.** `Editorial assessment` and
   `Early score · 1 rating` stay on one line. Decision summary follows the
   score overview, and the persistent Sign in to rate footer remains clear.
2. **XXL Dynamic Type — pass.** Product identity, score metadata, decision
   summary, and persistent footer remain readable without horizontal clipping.
   The simulator was restored to the standard `large` content size afterward.
3. **Adjunct section order — pass.** Verified offers appear before Score
   comparison; My Rating and Description follow the expanded comparison.
4. **Adjunct comparison layout — pass.** `Dimension`, `Eazy`, and `Community`
   have distinct columns; Craftsmanship, Collectibility, Product Value, Resale
   Potential, and Acquisition Ease remain readable; all ten rows stay expanded.
5. **Accessibility snapshot — pass.** The tree announced complete row labels,
   including `Appearance. Eazy 8 out of 10. Community 8 out of 10.`,
   `Craftsmanship. Eazy 8 out of 10. Community 4.5 out of 10.`, and
   `Acquisition Ease. Eazy 8 out of 10. Community 7.5 out of 10.`

## Evidence

Directory: `docs/evidence/task-17-product-detail-restoration/screenshots/`

- `ios-01-product-detail-top.png`
- `ios-02-product-detail-xxl.png`
- `web-01-product-detail-top.png`
- `web-02-offers-comparison-top.png`
- `web-03-comparison-rating-description.png`

All five captures have distinct SHA-1 hashes. The iOS images are native 3×
captures; each web adjunct image is exactly 393×852.

## GitHub disposition

Selected for PR #36 on `agent/task-17-my-rating-persistence`: `RESULT.md` plus
representative screenshots `ios-01`, `ios-02`, `web-02`, and `web-03`.
`web-01` is included only as first-viewport adjunct context. Full raw captures
remain non-sensitive local working-tree files under `screenshots/`.

## Findings and severity

- No Product Detail P0–P3 visual finding was observed in this scoped pass.
- The live web-preview failure is classified as an environment limitation, not
  a Product Detail finding; the same source passed native bundling and a fresh
  static web export.

## Known limitations

- The native capture used a direct product deep link and first-viewport proof;
  the locked Mac prevented native UI scrolling. Below-fold layout was therefore
  inspected in the exported web adjunct.
- The fresh simulator was signed out. Rated compact My Rating and its loading,
  offline, error, and unrated branches are covered by automated tests rather
  than this screenshot set.
- No physical-device, keyboard, performance, or touch-feel claim is made.

## Automated checks run separately

- Focused Product Detail and Rate/Edit Jest suites.
- `npm run typecheck`.
- `npm run lint`.
- `npm run check:readonly`.
- Full `npm run check` outside the sandbox, including all Jest suites, Expo
  Doctor, and Expo dependency alignment.

## Required next decision

Human review should accept the restored hierarchy or request a targeted visual
refinement. Physical-device completion remains pending a separate rerun.
