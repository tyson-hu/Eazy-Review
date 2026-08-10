# Task 17 — My Rating Persistence (rubric + offline reliability)

## Status

**Task 17 — In progress.** Physical-device matrix A–G (and related checklist
items below) were recorded from human testing on **2026-08-10**. One remaining
implementation blocker is maximum Dynamic Type layout on physical hardware;
a focused correction is on this branch and awaits a **targeted** human retest
(not a full A–G re-run of network/auth).

| Surface | Status |
| --- | --- |
| Automated (unit / typecheck / lint / check:readonly) | See Final automated validation |
| Local database (`npm run test:db` / `test:db:reset`) | No DB change on Dynamic Type / incomplete-submit / evidence packets |
| Physical iPhone matrix A–G | **PASS** on SHA `1325198` (see provenance) |
| VoiceOver | **DEFERRED BY HUMAN SCOPE DECISION** → Task 23 |
| XXL / maximum Dynamic Type | **FAIL** on SHA `1325198`; correction on later tip; **targeted retest pending** |
| Human acceptance / merge | **NOT CLAIMED / NOT AUTHORIZED** (PR #36 remains draft) |

## Branch and SHAs

- Branch: `agent/task-17-my-rating-persistence` (PR #36, draft)
- Prior delivered commit (kept intact): `8c3e648` — Implement Task 17 My Rating
  persistence and Rated Products
- Rubric + offline reliability correction: `2c21317`
- Docs/ADR sync: `221396a`
- Evidence matrix update: `34ca88b`
- Product Detail restoration + Rate/Edit native slider: `6863a91`
- Auth zombie-session restore hardening: **`1325198`**
- Incomplete-submit UI feedback (sticky footer + field errors): `2c4c7f2`
- Incomplete-submit tip SHA bookkeeping: `09075af`
- Maximum Dynamic Type layout correction: `a635251`

### Physical evidence provenance (critical)

**Full physical matrix A–G, slider gestures, and normal Product Detail
hierarchy** were performed on:

```txt
1325198f19efb871e61badcf2065675bf283c5a1
```

Do **not** attribute that matrix to `2c4c7f2`, `09075af`, or any later Dynamic
Type fix SHA. Those later commits are incomplete-submit UI, evidence
bookkeeping, and layout/a11y correction only.

| Commit | Role |
| --- | --- |
| `1325198` | Physically tested Release build for A–G, sliders, Product Detail (normal size), XXL FAIL, VoiceOver not tested |
| `2c4c7f2` | Incomplete-submit sticky footer + field errors (after physical SHA) |
| `09075af` | Evidence bookkeeping for incomplete-submit tip |
| Later tip | Dynamic Type adaptive layouts; **targeted retest pending** |

## Human physical test environment (2026-08-10)

| Field | Value |
| --- | --- |
| Date | 2026-08-10 |
| Device | iPhone 17 Pro Max |
| OS | iOS 27 Beta 5 |
| Build | Release physical-device build |
| Git SHA physically tested | `1325198f19efb871e61badcf2065675bf283c5a1` |
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

### VoiceOver — **DEFERRED BY HUMAN SCOPE DECISION**

VoiceOver was **not** tested. Human decision: defer deeper accessibility /
VoiceOver verification to later release accessibility work (**Task 23**).

- Do **not** mark PASS
- Do **not** mark FAIL
- Do **not** treat as Task 17 merge blocker after this scope decision

### XXL / maximum Dynamic Type — **FAIL** (physical, SHA `1325198`)

Task 17 **blocker** for acceptance until targeted retest of the layout fix.

Device: iPhone 17 Pro Max, iOS 27 Beta 5, Release, SHA `1325198`.

| Surface | Human observations |
| --- | --- |
| Browse | Product-card text heavily clipped; score/metadata cut off; large text exceeds container bounds; portions unreadable |
| Rate/Edit | Descriptions grow dramatically; row composition excessively tall/wide; slider/value/controls awkward; Save footer extremely large; not acceptably usable at maximum setting |
| Account | Profile/account card content substantially clipped; text partially or almost entirely hidden in constrained containers |

Not polish-only: content becomes unreadable or poorly usable at maximum Dynamic
Type.

#### Layout correction (post-physical SHA)

Focused adaptive layout work (component-level score caps where needed; no
global `allowFontScaling={false}`):

- Score pairs stack at large font scale; chips use deliberate
  `maxFontSizeMultiplier` on large score display only
- Dimension steppers restack slider vs ±/Clear; min height touch targets
- Product Detail comparison stacks at large scale; normal size keeps columns
- Buttons allow vertical growth; chrome labels lightly capped
- LoadingState `fill={false}` inside Account profile card
- Rated Products / Browse use adaptive score stacking

**Targeted human retest** (new tip, not full A–G network matrix): see bottom of
this file.

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

### E — Maximum Dynamic Type clipping (physical FAIL → fix pending retest)

- Root cause: dense horizontal score/control rows and expanding Typography
  inside half-width or fixed-height chrome at accessibility font scales.
- Fix: adaptive stacking + deliberate score/chrome scale caps (see layout
  correction). Physical retest required on new tip.

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

### Final automated validation (Dynamic Type packet)

| Command | Result |
| --- | --- |
| Focused Dynamic Type / surface suites | PASS (fontScale, ProductCard, DimensionStepperRow, RateAndDetail, Browse, Account, Product Detail) |
| Full suite / typecheck / lint / check | Recorded at commit time |

## Targeted human retest checklist (post Dynamic Type fix SHA only)

Unless the fix touches auth/network/data unexpectedly (it should not):

1. Browse at largest Dynamic Type
2. Product Detail at largest Dynamic Type
3. Authenticated Rate/Edit at largest Dynamic Type
4. Account / Rated Products at largest Dynamic Type
5. Normal text-size Rate/Edit smoke
6. Incomplete Save feedback (`2c4c7f2` behavior)
7. One normal successful rating save
8. Quick slider horizontal/vertical gesture regression

**Do not** re-require full B/C/D/F/G matrix for this layout-only tip.

## Explicit non-claims

- Human acceptance / merge: **NOT CLAIMED / NOT AUTHORIZED**
- Staging / production: **untouched**
- VoiceOver: **not completed**; deferred to Task 23
- Offline write queue / optimistic rating: **not implemented**
- Task 18: **not started**
