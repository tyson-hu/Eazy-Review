# S2 Mock-Catalog Retirement — Interactive Verification

Date: 2026-09-01

- **Mode:** `simulator-walk`
- **Journey:** connected Browse → complete Product Detail → Back to Browse →
  sparse Product Detail → signed-out rating gate → local sign-up → Rate → save
  → terminate Expo Go → relaunch the same Detail → restored My Rating
- **Overall result:** pass

## Environment matrix

| Environment | Status | Runtime |
| --- | --- | --- |
| iOS Simulator | `pass` | iPhone 15 (`Eazy-Review-iPhone-15`), iOS 26.5, Expo Go 57.0.6, local Metro and local Supabase |
| Mobile web | `pass` | 393 × 852 local-Supabase walk completed 2026-08-31 |
| Physical device | `tested-pass` | Human-reported 2026-09-01; device/runtime and detailed step log were not supplied |

## Step-by-step result

1. **Browse — pass.** The connected list rendered the complete Nike row and
   sparse Adidas row. The complete row used its public HTTP image; the sparse
   row showed the deliberate no-image state.
2. **Complete Product Detail — pass.** Opening the Nike card through the real
   Browse path rendered the public image, 79 Eazy Score, Community Score,
   verified offer, score comparison, and signed-out `Sign in to rate` action.
3. **Back to Browse — pass.** Product Detail Back returned to the prior Browse
   list before the sparse card was opened.
4. **Sparse Product Detail — pass.** The Adidas card rendered `No image
   available`, `Not assessed yet`, 80 Community Score, and `No verified offer
   available` without falling back to a retired mock field or asset.
5. **Signed-out gate — pass.** The sparse Detail exposed `Sign in to rate` and
   routed to Auth.
6. **Local sign-up — pass after automation-input recovery.** The first secure
   field injection delivered one character and local Auth correctly rejected
   it with HTTP 422; no user was created. One controlled character-by-character
   retry delivered all 13 characters, created a disposable local-only user, and
   returned to the requested product. This was simulator-driver input loss,
   not an app failure.
7. **Rate and save — pass.** All ten dimensions were set through the native
   form, save returned to Detail, and `My Rating` rendered as 46 / 100 with
   `Edit my rating`.
8. **Restoration — pass.** Expo Go was terminated and relaunched on the same
   connected Detail. The authenticated session and 46 / 100 My Rating restored
   from local Supabase.

## Evidence filenames

Selected Git proof:

- [`ios-02-complete-detail.png`](screenshots/ios-02-complete-detail.png) —
  complete connected Detail and signed-out CTA
- [`ios-03-sparse-detail.png`](screenshots/ios-03-sparse-detail.png) — sparse
  connected Detail without mock fallback
- [`ios-05-my-rating-restored.png`](screenshots/ios-05-my-rating-restored.png) —
  My Rating after Expo Go termination and relaunch

Local-only raw captures are retained under
`/private/tmp/eazy-review-s2-ios-raw/`: the Browse screen, immediate post-save
My Rating, and full-resolution copies of the selected proof. They are local
capture IDs, not repository-hosted files.

## GitHub disposition

Commit this report and the three resized, non-sensitive screenshots above.
Keep the full-resolution and redundant captures local only. The selected set
proves three distinct S2 claims without reintroducing a broad fixture-asset
payload.

## Findings and severity

None. No product, navigation, data-shape, or visual blocker was observed.

## Known limitations

- The Auth form was reached by a static local deep link because the simulator
  accessibility driver did not expose the Sign In screen's Create Account link
  as tappable. No Back-stack finding was inferred from that deep link.
- The simulator walk did not claim soft-keyboard/scroll ergonomics; it only used
  the keyboard to establish the disposable fixture.
- The human physical-device report did not include device/runtime or a detailed
  observed-step log, so this report preserves it as human-reported
  `tested-pass` only.
- Two disposable local-only Auth users and ratings remain from the web and
  simulator smoke runs. No deletion, local reset, staging, or production action
  was performed.
- The already-running Metro process belonged to this repository and was reused;
  it was not stopped by this run.

## Automated checks run separately

The exact S2 code tree passed the five focused suites (43/43 tests), full
frontend suite (39/39 suites, 496/496 tests), `npm run check:readonly`, residue
searches, and `git diff --check`. The final documentation/evidence tree is
revalidated before the authorized local commit.

## Required next decision

Remote lifecycle work was later authorized through draft PR #46. Program-level
human acceptance is the next gate; PR readiness, merge, deployment, hosted
configuration, database work, and production access remain separate decisions.
