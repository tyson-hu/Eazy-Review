# Candidate C — ego-browser capability check

Mode: local synthetic browser-driver fixture, 2026-09-05 (America/Chicago).
User selected ego-browser for browser-based work throughout Eazy Review's SDLC.
This selection is implemented in project policy; the check is not an Expo app
journey, release acceptance, or a claim of driver equivalence.

Environment status: web preview `not-run`; iOS Simulator `not-run`;
physical device `not-tested`. The synthetic fixture comparison has a blocked
dialog-automation criterion; other observed criteria are listed below.

## Results

| Criterion | Observation |
| --- | --- |
| URL and state | Both drivers read the local fixture; ego-browser filled Search products with sneaker, clicked Apply query, observed Result: sneaker and the #result URL |
| Mobile viewport | ego-browser pageInfo verified 393×852 CSS pixels after CDP metrics override |
| Viewport capture | captureScreenshot with an absolute string path produced a 393×852 PNG; the attempted options-object signature failed and was corrected |
| Full-page capture | Page.getLayoutMetrics cssContentSize plus Page.captureScreenshot captureBeyondViewport/clip produced a visually inspected 393×1535 PNG containing top content and bottom control |
| Scrolled viewport capture | Visual inspection found ego-04-scrolled-bottom blank. The two repeats ego-05-bottom-clicked and ego-06-bottom-repeat share that hash: stable bytes do not establish correct capture. These are diagnostic-only, not proof |
| Console errors | Runtime.enable followed by the fixture error button and drainEvents captured Runtime.consoleAPICalled with EXPECTED_PREVIEW_DRIVER_ERROR |
| Reachability | An offscreen click did not change state. After explicit scrollIntoView, bounding box left20/right152.05/top805.73/bottom832.23 was inside 393×852; a subsequent click produced Bottom reached |
| Semantic snapshot | Captured controls and status text; textbox accessible name was not emitted as in Playwright's accessibility snapshot. Do not assume equivalent accessibility coverage |
| Dialog | Initial helper click timed out; runtime reported user-control stops. After explicit user continuation, no dialog was showing and Cancelled was observed. Automated dismissal was not established; user intervention contaminates that result |
| Recovery | A new local fixture tab within the same owned space restored URL/snapshot reads after repeated evaluation timeouts. This does not prove application session restoration |
| Ownership | Stopped on each user-control signal; resumed only after explicit continue. Final completeTaskSpace(5,{keep:false}) returned done:true |
| Cleanup | Owned ego task space closed, comparison Playwright tab closed, fixture HTTP server stopped |

The Playwright baseline previously exercised its form, full-page capture, dialog
dismissal, console error and bottom-control click. It remains historical evidence;
no further Playwright task execution is the selected workflow.

## Evidence and disposition

Selected for a future GitHub delivery: this report, semantic text records,
SHA256 manifest, local ignore rules, and one visually verified screenshot:

- screenshots/ego-02-full-result.png — full-page result and bottom control.

Other PNGs are retained locally and excluded by this folder's .gitignore.
The hash manifest includes those local capture IDs to preserve provenance;
it does not claim they are repository-hosted. Selected proof is included in the combined B/C delivery.
The parent-authored static HTML fixture is local at
`.codex/experiments/preview-driver-c/fixture/index.html`; it has no backend,
credentials, external assets or installs. Historical MCP snapshots are retained
under that experiment directory. No app or external account mutation occurred.

## Limits and next use

No product defect was found by this synthetic check. Dialog automation, scrolled viewport capture and full
accessibility evidence remain capability gaps, not accepted app criteria.
Use ego-browser for future browser work; verify required capabilities per task,
record blocked/not-run criteria, and diagnose or seek an explicit tooling
change instead of silently switching drivers. Native/physical gates stay intact.

Independent documentation review approved the migration. Structural checks and
final verification are recorded in the candidate C progress note.
