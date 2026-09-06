# Session Notes

Working state for cross-session continuity — the next session reads these files, not old chat transcripts.

- `handoff.md` — written for interruption, task change, approval boundary or context loss; overwritten by each new handoff.
- `blocker-<topic>.md` — written for an unresolved repair path under `docs/AGENT_WORKFLOW.md`; deleted or marked resolved when the blocker is cleared.

These are working state, not project documentation. Durable task status belongs in `docs/TASKS.md`; durable high-impact decisions belong in individual `docs/decisions/*.md` records and appear in the generated `docs/DECISIONS.md` index.

Interactive preview and UX audit **evidence** (screenshots, findings) belongs in `docs/evidence/` — see `docs/evidence/README.md` and `skills/interactive-preview-loop`. Do not store verification artifacts here.

## Commit Policy

- `handoff.md` is transient session state: do not commit it (ignored via `.gitignore`).
- `blocker-<topic>.md` files are durable project state: commit them when they are referenced from `docs/TASKS.md`, so other machines and reviewers can resolve the pointer.
- When a blocker is resolved, remove the `docs/TASKS.md` pointer and either delete the blocker note or mark it resolved if the history remains useful (the agent resolving the failure owns this update).

## Continuation record

Write enough for another agent to resume without chat history. Use these six
sections in handoff.md, including current branch/SHA and the actual next action:

- What we are doing
- Spec or issue link
- Files changed
- Tests run and results
- Current blockers
- Next recommended step

Keep current authorization and unresolved decisions distinct; compare stale
state with the live tree on resumption. Routine phase transitions within the
same authorized task do not require a new session. Long work may maintain a
linked working plan here; update it instead of repeatedly copying its history.

## Blocker record

Record the expected and observed behavior, exact redacted failing command/error,
branch/SHA and affected files, attempted hypotheses and their outcomes, ruled-out
causes, remaining uncertainty, and the specific decision or prerequisite needed.
Never persist credentials or PR-epoch authorization in these records. Do not
restart a spent repair budget by opening a new note or child task.
