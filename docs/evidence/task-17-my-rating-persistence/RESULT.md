# Task 17 — My Rating Persistence (rubric + offline reliability)

## Status

**Task 17 — Done — human accepted.**

Physical-device matrix A–G (and related checklist items below) were recorded
from human testing on **2026-08-10** at SHA `1325198`. After incomplete-submit
feedback, accessibility deferral, Expo SDK patch alignment, and agent
web/simulator packets, the human completed a **final physical regression
smoke** on the final accepted Task 17 branch tip and **accepted** Task 17.

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / check:readonly) | See Final automated validation |
| Local database (`npm run test:db` / `test:db:reset`) | No DB schema change in cleanup / reverify / acceptance packets |
| Physical iPhone matrix A–G | **PASS** on SHA `1325198` (see provenance) |
| Slider gestures (physical) | **PASS** on SHA `1325198` |
| Product Detail normal text size (physical) | **PASS** on SHA `1325198` |
| VoiceOver | **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** → Task 27 |
| XXL / maximum Dynamic Type | Physical **FAIL** (initial + post-fix retest); **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** → Task 27 |
| Web verification (agent) | **PASS** on final tip (see Web verification packet) |
| iOS Simulator (agent, normal text size) | **PASS with documented limits** (see iOS Simulator packet) |
| Human-reported final physical smoke | **PASS** on final accepted tip (regression smoke; not full A–G re-run) |
| Human acceptance | **Done — human accepted** (PR #36) |

## Branch and SHAs

- Branch: `agent/task-17-my-rating-persistence` (PR #36)
- Prior delivered commit (kept intact): `8c3e648` — Implement Task 17 My Rating
  persistence and Rated Products
- Rubric + offline reliability correction: `2c21317`
- Docs/ADR sync: `221396a`
- Evidence matrix update: `34ca88b`
- Product Detail restoration + Rate/Edit native slider: `6863a91`
- Auth zombie-session restore hardening: **`1325198`**
- Incomplete-submit UI feedback (sticky footer + field errors): `2c4c7f2`
- Incomplete-submit tip SHA bookkeeping: `09075af`
- Maximum Dynamic Type layout attempt (did **not** resolve physical FAIL):
  `a635251`
- Dynamic Type attempt record / first accessibility deferral docs: `2ad4794`
- Revert of `a635251` (cleanup; human deferred XXL work post-launch): see
  branch tip history after `2ad4794`

### Physical evidence provenance (critical)

**Full physical matrix A–G, slider gestures, and normal Product Detail
hierarchy** were performed on:

```txt
1325198f19efb871e61badcf2065675bf283c5a1
```

Do **not** attribute that full A–G matrix to `2c4c7f2`, `09075af`, `a635251`,
the revert of `a635251`, or any later tip SHA. Later commits are incomplete-
submit UI, evidence bookkeeping, a failed Dynamic Type layout attempt,
revert, accessibility ownership cleanup, Expo dependency alignment, agent
web/simulator verification, and human final acceptance documentation only.

| Commit | Role |
| --- | --- |
| `1325198` | Physically tested Release build for full A–G, sliders, Product Detail (normal size), initial XXL FAIL, VoiceOver not tested |
| `2c4c7f2` | Incomplete-submit sticky footer + field errors (after physical SHA) |
| `09075af` | Evidence bookkeeping for incomplete-submit tip |
| `a635251` | Attempted maximum Dynamic Type adaptive-layout correction |
| Post-`a635251` human retest | Targeted XXL retest only — **STILL FAIL** |
| Revert of `a635251` | Removes failed XXL patch after human post-launch deferral |
| Pre-acceptance tip (`f33be2b`) | Docs ownership (Task 27), Expo SDK patch alignment, web + iOS simulator agent verification |
| Human final smoke | Regression smoke **PASS** on final accepted branch state (not full B/C/D/F/G re-run) |
| Acceptance commit | Records Done — human accepted (this packet) |

## Human-reported final physical smoke (acceptance)

| Field | Value |
| --- | --- |
| Result | **Human-reported final physical smoke: PASS** |
| Device | iPhone 17 Pro Max |
| OS | iOS 27 Beta 5 |
| Build | Release |
| Backend | local Supabase on Mac via LAN |
| Provenance | final accepted Task 17 branch tip (after incomplete-submit, Accessibility deferral, Expo alignment, agent web/simulator packets) |
| Scope | Regression smoke — **not** a full re-run of the B/C/D/F/G network/auth matrix |

Covered routes/actions (human-reported):

- launch / Browse / Product Detail
- authenticated Rate/Edit
- slider interaction
- vertical scrolling
- − / + / Clear controls
- incomplete Save feedback
- complete rating Save
- Product Detail refresh
- Account
- Rated Products

Do not invent per-action timestamps or additional screenshots for this smoke.
Full A–G network/auth matrix provenance remains exclusively SHA `1325198`.

## Human physical test environment (2026-08-10)

| Field | Value |
| --- | --- |
| Date | 2026-08-10 |
| Device | iPhone 17 Pro Max |
| OS | iOS 27 Beta 5 |
| Build | Release physical-device build |
| Git SHA physically tested (full A–G) | `1325198f19efb871e61badcf2065675bf283c5a1` |
| Backend | Local Supabase on Mac; phone via LAN / Mac-reachable local URL (not phone `localhost`) |
| Scenario G wipe | Local Auth/database reset only; **staging and production untouched** |

## Physical-device checklist (human)

### A — Normal online rating save/edit — **PASS**

Human verified: online save completes; spinner terminates; navigation returns;
My Rating refreshes; Community data refreshes; Edit flow works.

#### A1 — score-scale regression — **PASS**

Human verified sneaker-10-v1 0–100 composite behavior; prior 1–10 vs 0–100
defect (e.g. all 9.0 → 90, not 9/100) no longer reproduced.

#### A2 — zero vs unanswered — **PASS**

Human verified unanswered/null remains distinct from a real zero rating.

### B — Known offline before Save — **PASS**

Observed copy: `You're offline. Connect to save this rating.`

Immediate feedback; no endless spinner; form intact; reconnect Save succeeds.

### C — Connection drops during request — **PASS**

Observed sequence included `The request took too long`, then offline
presentation once connectivity state changed. Acceptable settlement:

- in-flight request settled via timeout
- offline presentation after connectivity change
- form preserved
- no indefinite spinner

Do not summarize as a single static message only.

### D — Device online, local Supabase unreachable — **PASS**

Observed copy: `Could not reach the server.`

Device/network remained available; local Supabase unreachable; **not**
mislabeled as “You're offline”; request settled; no infinite Saving.

### E — Rate offline, no cached owner rating — **PASS WITH COPY NOTE**

Functional accept: no infinite `Loading your rating...`; settled explicit
error; Retry available.

After Retry (observed copy): `Could not load your rating`.

**Copy note:** when known offline, preferred offline-specific wording is more
explicit than the generic load-failure title. **Not** a Task 17 blocker unless
code inspection shows a real offline/state misclassification bug (none filed as
blocker here). No opportunistic copy redesign.

### F — Offline with cached data — **PASS**

Cached Product Detail / owner data remain usable; no endless loading.

### G — Zombie local session recovery — **PASS**

Human local Auth-reset scenario (do last):

- phone retained pre-reset local session (no Sign out first)
- local Supabase/Auth user wiped via local reset
- app relaunched while local Supabase reachable
- stale principal did **not** remain falsely signed in
- settled signed-out; stale user-scoped data not exposed
- authentication usable again afterward

Physically validates `restoreSession` hardening in `1325198`.

### Slider gestures — **PASS**

On physical hardware: horizontal slider adjustment; vertical form scroll;
curved-thumb interaction; slider does not dismiss Rate/Edit; normal Back
usable. Does **not** include VoiceOver.

### Product Detail (normal text size) — **PASS**

Physical hierarchy/readability at the main verification text size: identity →
Eazy/Community → Decision → offers → comparison → My Rating → description →
Rate/Edit CTA. Offers ahead of long comparison. Early community presentation
acceptable.

### VoiceOver — **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH**

VoiceOver was **not** tested. Human decision (updated): defer VoiceOver
end-to-end verification and related extreme accessibility work until
**after the initial product ships**, owned by **Task 27** (Post-Launch
Operations). Task 23 may still own ordinary release reliability / device QA,
but VoiceOver physical acceptance no longer blocks Task 17 or initial release
acceptance for Tasks 23/26 after this scope decision.

- Do **not** mark PASS
- Do **not** mark FAIL
- Do **not** treat as a Task 17 merge blocker

### XXL / maximum Dynamic Type — chronological physical FAIL record

#### Initial physical FAIL (SHA `1325198`)

**FAIL** on iPhone 17 Pro Max, iOS 27 Beta 5, Release, SHA `1325198`.

| Surface | Human observations |
| --- | --- |
| Browse | Product-card text heavily clipped; score/metadata cut off; large text exceeds container bounds; portions unreadable |
| Rate/Edit | Descriptions grow dramatically; row composition excessively tall/wide; slider/value/controls awkward; Save footer extremely large; not acceptably usable at maximum setting |
| Account | Profile/account card content substantially clipped; text partially or almost entirely hidden in constrained containers |

Not polish-only: content becomes unreadable or poorly usable at maximum Dynamic
Type.

#### Layout correction attempt (`a635251`)

Commit `a635251` attempted adaptive layout correction (component-level score
caps, stacking, content-growing cards; no global `allowFontScaling={false}`).

That attempt **did not** solve the physical-device failure.

#### Second physical FAIL (targeted retest after `a635251`)

Human targeted physical retest after `a635251`:

| Item | Result |
| --- | --- |
| Maximum / XXL Dynamic Type | **STILL FAIL** |

The adaptive-layout patch is **not** accepted as having passed. History must
not be rewritten to imply the attempt succeeded.

#### Human scope decision (post-second FAIL)

Because UI continues to evolve before launch, further extreme Dynamic Type /
VoiceOver hardening is **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** to
**Task 27**. Commit `a635251` was **reverted** on the Task 17 branch so the
failed XXL-specific complexity is not retained on the accepted-path UI.

- Do **not** mark maximum Dynamic Type PASS
- Do **not** treat XXL Dynamic Type as a Task 17 merge blocker after this decision
- Do **not** claim the full A–G matrix re-ran on post-`1325198` tips
- Historical FAIL (initial + second) remains documented

## Defects corrected (earlier packets; historical)

### A — Rating model / score contract

- Root cause: editable Overall 1–10 was shown through 0–100 ScoreBadge semantics;
  Community dimensions did not match Eazy structure.
- Fix: shared **sneaker-10-v1** ten-dimension rubric; composites always 0–100
  derived by `round(sum of dimensions)`; no client-written composite;
  forward-only migration; ScoreBadge `score100`; RatingRow `score10`.

### B — Offline / timeout / infinite pending

- Root cause: TanStack mutation `networkMode: 'online'` paused save offline;
  UI treated any pending as “Saving…”; no bounded abort for unreachable host.
- Fix: save mutation `networkMode: 'always'`; NetInfo fail-fast offline;
  `withRequestTimeout` (10s) aborting PostgREST; paused query/mutation
  presentation; form state preserved; no offline write queue.

### C — Zombie restored local session after local Auth wipe

- Root cause: `restoreSession()` used local `getSession()` only. After local
  Supabase reset, AsyncStorage could still hold tokens for a deleted principal;
  the app published signed-in while Account/Rate could not operate against a
  missing Auth user / profile.
- Fix: when online, validate with Auth `getUser()`; clear current-device
  session only on definitive invalid identity/session Auth errors; preserve
  local session when offline or validation fails transiently.

### D — Incomplete Save looked like a no-op

- Root cause: missing dimensions only marked field errors on rows often scrolled
  out of view; sticky footer error region stayed empty.
- Fix (`2c4c7f2`): sticky footer summary plus per-field incomplete copy; no
  network write until all ten dimensions are set.

### E — Maximum Dynamic Type clipping (physical FAIL → deferred post-launch)

- Observed: dense horizontal score/control rows and expanding Typography at
  maximum accessibility font scales (initial physical FAIL on `1325198`).
- Attempt: `a635251` adaptive stacking + deliberate score/chrome caps — **did
  not pass** targeted physical retest (second FAIL).
- Disposition: patch **reverted**; ownership moved to **Task 27** post-launch
  accessibility hardening. Initial + second FAIL history retained.

## Companion Task 17 UX packets (same branch / PR #36)

- Product Detail restoration:
  [`docs/evidence/task-17-product-detail-restoration/RESULT.md`](../task-17-product-detail-restoration/RESULT.md)
- Rate/Edit native slider gesture:
  [`docs/evidence/task-17-rating-slider-gesture/RESULT.md`](../task-17-rating-slider-gesture/RESULT.md)

## Scenario G procedure (human-only; retained)

1. Sign in on the physical device against local Supabase.
2. Confirm Account is valid.
3. Reset/wipe the local Supabase stack so that user no longer exists.
4. Keep the app's local persisted session intact (do not Sign out first).
5. Relaunch/reload the app while the phone can reach local Supabase.
6. Expected: signed out, no stale user-scoped data, new sign-up/sign-in works.

## Security / privacy notes

- Identity columns never appear in UPDATE payloads.
- Private note is owner-only.
- No service-role credential in Expo.
- Client never writes `rating_aggregates` or `score` / `methodology_version`.
- Staging / production databases: **untouched**.
- Auth restore cleanup uses local/current-device session scope only.

## Automated validation history

### Earlier branch run (correction-era record; not the final tip)

| Command | Result (historical) |
| --- | --- |
| `npm test` | PASS — 33 suites, 232 tests (pre-slider packet) |
| `npm run test:db:reset` | PASS — pgTAP 479 tests; concurrency harness 2 scenarios |

### Dynamic Type attempt era (historical; pre-revert)

| Command | Result (historical) |
| --- | --- |
| Focused Dynamic Type / surface suites | PASS at `a635251` tip (later reverted) |

Final cleanup validation is recorded on the final tip after revert,
dependency alignment, and agent web/simulator verification.

## Agent web verification packet (2026-08-10)

| Field | Value |
| --- | --- |
| Date | 2026-08-10 |
| Browser | Playwright Chromium (MCP `user-playwright`) |
| Viewport | 393 × 852 |
| Runtime | Live Expo Metro web (`npx expo start --web --port 8081`) |
| Backend | Local Supabase only (staging/production untouched) |
| Branch tip at capture | record final push SHA in TASKS when committed |
| Disposable local user | local sign-up for the Rate path (not a production principal) |

### Surface results

| Surface | Result |
| --- | --- |
| A. Browse | **PASS** — default Browse, search, cards, scores/offers, tabs |
| B. Product Detail | **PASS** — identity → Eazy/Community → Decision → offers → comparison → My Rating → description → Rate/Edit CTA; hierarchy intact after Dynamic Type revert |
| C. Auth gate | **PASS** — Sign in to rate → sign-up UI; local create-account returned to Product Detail |
| D. Rate/Edit | **PASS** — ten dimensions, 0 valid distinct path via half-step +, Clear present after set, sliders present, private note, live My Rating preview (85 after 8.5×10), incomplete Save footer (`10 categories still need…`) + per-row errors, complete save to local Supabase, Detail My Rating + Community 85 |
| E. Account / Rated Products | **PASS** — profile email/member/count, Rated Products list row 85/100 My Rating + Community, row opens Product Detail |
| F. Console | **PASS for Task 17** — no React/route exceptions on the success path; historical `ERR_CONNECTION_REFUSED` noise only while Metro was stopped; benign React DevTools info on hard reload |

### Screenshots

Directory: `docs/evidence/task-17-my-rating-persistence/screenshots/`

- `web-01-browse.png`
- `web-02-product-detail-top.png`
- `web-03-product-detail-comparison.png`
- `web-04-rate-edit.png`
- `web-05-incomplete-save.png`
- `web-06-account-rated-products.png`

### Web limitations

- One hard navigation briefly showed a false “You're offline.” product shell after
  a full-page reload; reconnect/retry recovered authentication and My Rating
  (NetInfo/web transient; local API remained healthy). Not treated as a Task 17
  product regression when Browse/Rate paths were healthy.
- Metro once OOMed mid-session (`exit 134`); restarted with
  `NODE_OPTIONS=--max-old-space-size=8192`.

## Agent iOS Simulator verification packet (2026-08-10)

| Field | Value |
| --- | --- |
| Date | 2026-08-10 |
| Simulator | `Eazy-Review-iPhone-15` (UDID `95761BEB-…`), 393×852 logical pts |
| Runtime | iOS 26.5 Simulator runtime (device record) |
| Build | Expo Go `host.exp.Exponent` + live Metro JS bundle (normal text size) |
| Backend | Local Supabase via Metro env |
| Dynamic Type / VoiceOver | **Not tested** (post-launch Task 27 ownership) |

### Surface results

| Surface | Result |
| --- | --- |
| A. Launch / navigation | **PASS** — Expo Go loads Browse; tab chrome present |
| B. Browse | **PASS** — search, cards, scores readable after Dynamic Type revert |
| C. Product Detail (first viewport) | **PASS** — identity, Eazy 79, Community 85 (local truth after web rating), Decision summary, Verified Offers header, Sign in to rate |
| D. Authentication gate | **PASS** — Rate deep link enforces Sign in form |
| E–G. Authenticated Rate/Edit / edit / Rated Products UI | **not-run / blocked for interactive entry** — host has no Simulator.app GUI and no keyboard/UI-automation tool for form typing in this session; deep links + screenshots only |
| H. Slider/navigation gestures | **not-run** on simulator (physical gesture **PASS** on SHA `1325198` remains authoritative) |

### Screenshots

- `ios-01-browse.png`
- `ios-02-product-detail-top.png` (includes Community 85 + Verified Offers header before fold)
- `ios-03-product-detail-offers.png` (same first-viewport frame; no scroll automation available)
- `ios-04-auth-gate-or-rate.png` (Sign in after `/rate` deep link)
- `ios-05-account.png` (signed-out Account)

### Simulator limits

- No full authenticated Rate/Edit form fill on iOS Simulator in this environment
  (Simulator GUI missing; `applesimutils` has no tap/type). Physical A–G and
  agent web cover that path.
- Does **not** replace physical evidence on SHA `1325198`.

## Explicit non-claims

- Human acceptance: **Done — human accepted** (this record)
- Merge: claimed only after PR #36 merge succeeds on master
- Staging / production: **untouched**
- VoiceOver: **not completed**; **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** (Task 27)
- Maximum Dynamic Type: **physical FAIL (twice)**; fix attempt reverted; **DEFERRED BY HUMAN SCOPE DECISION — POST-LAUNCH** (Task 27)
- Full physical A–G matrix: belongs **only** to SHA `1325198` — not re-run on
  the final tip; final smoke is regression-only
- Offline write queue / optimistic rating: **not implemented**
- Task 18: **not started** / **not authorized by Task 17 acceptance**
