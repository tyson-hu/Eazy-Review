# Task 16 — Web mobile preview verification

## Run report

- **Mode:** `web-preview`
- **Journey:** Task 16 auth return / Account / isolation (post-`dismissTo` correction)
- **Viewport:** 393×852
- **Driver:** Playwright MCP (`user-playwright`) against Expo web (`http://localhost:8081`)
- **Local backend:** local Supabase auth + catalog (dev keys; disposable local users only)
- **Branch / SHA at run:** `agent/task-16-core-auth-account-state` @ `c556a14`

## Environment matrix

| Slot | Status |
| --- | --- |
| Web mobile preview (393×852) | **pass** (web stack/navigation evidence) |
| Physical iPhone | **PENDING HUMAN CONFIRMATION** on the corrected build — web does not substitute |
| iOS Simulator | **not-run** |

## Overall result

**PASS** for the **web** navigation, sign-out, and A→B isolation journeys below.

This is **web stack/navigation evidence only**. It does **not** prove:

- native iOS stack animation;
- iOS header behavior;
- native session persistence;
- physical-device network transitions.

Corrected physical-device re-verification and final human acceptance remain
**pending**. A prior physical run that discovered the duplicate-Product bug is
not proof that the corrected `dismissTo` implementation passes on device.

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
- `screenshots/web-05-back-to-browse.png` (proves one Back → Browse on web)
- `screenshots/web-06-account-signed-in-a.png`
- `screenshots/web-07-account-signed-in-b.png`

### Local/raw

- Playwright session snapshots under MCP tooling cache (not committed).
- Disposable local emails only; no production credentials.

## Findings and severity

None (P0–P3) on the completed web journeys above.

## Known limitations

- Web does not prove native stack animation or iOS header chrome.
- Create-Account full success path was not re-driven on web.
- Temporary network-loss / reconnect was **not** re-run on web this session;
  final human device acceptance must still verify that journey.
- Metro process crashed once mid-session (`exit 134`); remaining steps continued after restart.
- Password was typed into local disposable accounts; do not reuse those credentials outside local Supabase.

## Automated checks

Auth-generation race correction and full automated gate are recorded on the
branch after this web-preview SHA; see PR #35 and `RESULT.md` Validation
section for current-head results.

## Required next decision

Human must re-run the corrected-build **physical iPhone** checklist before
Task 16 can be marked human-accepted. Web PASS alone is insufficient.

Do not start Task 17 until Task 16 is human-accepted per `docs/TASKS.md`.
