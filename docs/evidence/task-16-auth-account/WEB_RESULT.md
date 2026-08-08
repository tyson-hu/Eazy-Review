# Task 16 — Web mobile preview verification

## Run report

- **Mode:** `web-preview`
- **Journey:** Task 16 auth return / Account / isolation (post-correction)
- **Viewport:** 393×852
- **Driver:** Playwright MCP (`user-playwright`) against Expo web (`http://localhost:8081`)
- **Local backend:** local Supabase auth + catalog (dev keys; disposable local users only)
- **Branch / SHA at run:** `agent/task-16-core-auth-account-state` @ `c556a14`

## Environment matrix

| Slot | Status |
| --- | --- |
| Web mobile preview (393×852) | **pass** |
| Physical iPhone | **tested-pass** (human-reported 2026-08-08; agent did not retest device) |
| iOS Simulator | **not-run** (not required after physical + web) |

## Overall result

**PASS** for the web navigation, sign-out, and A→B isolation journeys below.
Combined with human physical-device pass, interactive verification for the
correction pass is complete. Final product “Task 16 Done” remains a human
acceptance step if required by repo workflow.

## Step-by-step

| Step | Expected | Result | Evidence |
| --- | --- | --- | --- |
| 1. Browse | Two published products, tabs | **pass** | `web-01-browse.png` |
| 2. Product A (signed out) | Sign in to rate + honest My Rating copy | **pass** | `web-02-product-signed-out.png`; snapshot had `Sign in to rate` and “Sign in to rate this product.” |
| 3. Sign in | Form with prepare-for-saved-ratings copy; `returnTo` product | **pass** | `web-03-sign-in.png`; URL `…/auth/sign-in?returnTo=%2Fproduct%2Fa1000000-…` |
| 4. After successful sign-in | Existing Product A; rating unavailable truthfully | **pass** | Observed-step: URL stayed/returned to `…/product/a1000000-…`; a11y tree showed `Rating isn't available yet.`, disabled `Rating unavailable`. *(No separate PNG: web-04 was discarded after checksum collision with web-03.)* |
| 5. One Back | Browse (not Product again) | **pass** | `web-05-back-to-browse.png`; URL `…/browse`; Browse heading present |
| 6. Account as A | Shows A email | **pass** | `web-06-account-signed-in-a.png`; `task16-web-a@example.com` |
| 7. Sign out | Signed-out Account CTA | **pass** | Observed-step: “Your Eazy Review account” / Sign in / Create account |
| 8. Sign in as B from Account | Returns to Account as B | **pass** | `web-07-account-signed-in-b.png`; `task16-web-b@example.com` |
| 9. A→B isolation | No A email on B session | **pass** | Scripted check `hasA:0`, `hasB:1` on Account |
| 10. `/rate` while signed out | Redirect Sign in with product (not `/rate`) `returnTo` | **pass** | URL: `…/auth/sign-in?returnTo=%2Fproduct%2Fa1000000-…` (product path only) |

## Evidence directory

`docs/evidence/task-16-auth-account/`

### Screenshots (GitHub-ready web set)

- `screenshots/web-01-browse.png`
- `screenshots/web-02-product-signed-out.png`
- `screenshots/web-03-sign-in.png`
- `screenshots/web-05-back-to-browse.png` (proves one Back → Browse)
- `screenshots/web-06-account-signed-in-a.png`
- `screenshots/web-07-account-signed-in-b.png`

### Local/raw

- Playwright session snapshots under MCP tooling cache (not committed).
- Disposable local emails only; no production credentials.

## Findings and severity

None (P0–P3) on the completed web journeys above.

## Known limitations

- Web does not prove native stack animation or iOS header chrome (physical device covered that).
- Create-Account full success path was not re-driven on web (physical covered it).
- Temporary network-loss reconnect was not re-run on web this session.
- Metro process crashed once mid-session (`exit 134`); remaining steps continued after restart.
- Password was typed into local disposable accounts; do not reuse those credentials outside local Supabase.

## Automated checks run separately

Correction-pass automated gate (prior session): `npm test` 172 pass, typecheck,
lint, `check:readonly`, web export, `check`, `test:db:reset` — all pass. Not
re-run in this web-preview loop.

## Required next decision

Human may mark Task 16 **acceptance complete** if satisfied with:

1. Physical iPhone checklist (already reported pass)
2. This web verification (pass)
3. Existing automated gate on branch `c556a14` (and later evidence commits)

Do not start Task 17 until Task 16 is human-accepted per `docs/TASKS.md`.
