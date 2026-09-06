# Candidate C — SDLC browser migration

Status: ego-browser policy implemented and independently reviewed; final
structural verification passed. Combined B/C PR delivery authorized. Branch remains
codex/global-skill-cleanup with the candidate B operation receipt.

User authority: Move to next selected the capability comparison; the subsequent
instruction explicitly replaced Playwright with ego-browser throughout SDLC.
User approved continuation after each runtime control stop. Browser ownership
is now cleaned up; no control grant is inferred for future user-owned spaces.

Changed owners: AGENTS, README, MCP_WORKFLOW, WEB_MOBILE_PREVIEW_SOP,
UX_SCREENSHOT_AUDIT_SOP; accepted ADR and generated DECISIONS index. Existing
preview skill routes to these owners, so no skill/manifest/wrapper change was
needed. Historical reports and the original approved candidate remain unchanged.
Corrected obsolete eleven-field delegation wording in the touched UX SOP to
match AGENT_WORKFLOW. No package, provider cache, global tool configuration or
application code changes.

Proof: docs/evidence/preview-driver-c/RESULT.md. Fixture verifies basic web
operations, captures, error events and scrolling; dialog automation remains
unproven after ownership interruptions, and scrolled helper captures were blank
on visual inspection (excluded from selected proof). Web app/native/physical acceptance was
not run. This is a policy adoption with stated capability limits, not parity.

Recovery: revert only C's project doc/ADR/index changes if the user reverses
the driver decision. Retain evidence. Candidate B's global quarantine has its
own independent manifest and undo procedure in global-skill-cleanup.md.

Remaining audit: distinct plugin/provider overlaps and downstream hook behavior.
Project #4 remains deferred until remaining audit work finishes. No global
plugin uninstall or hook change is authorized by the browser-driver selection.

Final independent verification: decisions:check passes (36 records, 1 test);
check:agent-infra passes (58 tests; 86 documents, 37 dependencies, 17 tasks,
91 active files); secret scan and whitespace pass. Executable inputs unchanged
from trusted base 39a28a6. Active guidance contains no old Playwright recipes.
Impacted mirror/owner review found existing pointers sufficient; no graph or
wrapper changes required. Runtime proof remains parent-observed fixture evidence.

## Reliability follow-up in progress

User selected diagnosis and a real Expo web check. On a fresh task space,
reproduced blank scrolled helper capture; explicit Page.captureScreenshot with
pageInfo scroll coordinates captured the control correctly. Accessibility.getFullAXTree
returned the fixture textbox name omitted by snapshotText. Expo server on
localhost:18764 uses EXPO_NO_DOTENV and local Supabase public configuration
without changing env files. Existing port8081 server is untouched. Local Browse
empty search, matching search, Detail and sign-in gate were exercised; no login
or rating mutation. Evidence under docs/evidence/ego-browser-reliability.
Owned browser space6 and fixture18763/Expo18764 servers need cleanup. Final
controlled dialog attempt and integrated documentation/verification remain.

## Reliability follow-up outcome

The scrolled viewport CDP workaround and raw Accessibility.getFullAXTree
retrieval passed. Representative local Expo Browse/search/Detail/sign-in-gate
journey passed without auth submission. Controlled native-dialog handling
again triggered a user-control stop; no automated dismissal is claimed. No
more dialog retries. Updated WEB_MOBILE_PREVIEW_SOP with supported capture/AX
procedure and the runtime-specific dialog limitation. Full report and selected
proof: docs/evidence/ego-browser-reliability/RESULT.md. Owned browser space6
closed successfully; fixture18763 and Expo18764 stopped, no listeners remain.
Final follow-up review approved after aligning the failure-table dialog pointer.
Structural, secret and whitespace checks pass; executable inputs unchanged.
User authorized combined B/C commit, push and PR delivery.

## Delivery acceptance

User directed completion of PR #54 delivery on 2026-09-05. B/C accepted with
the documented native-dialog limitation; no native/physical or automated-dialog
proof is added by acceptance. PR #53's late Cursor agent impact-report finding
is confirmed and remains unresolved for a separate corrective PR, as requested.
Project #4 remains deferred.
