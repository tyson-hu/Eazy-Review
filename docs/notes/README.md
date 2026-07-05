# Session Notes

Working state for cross-session continuity — the next session reads these files, not old chat transcripts.

- `handoff.md` — written at a session boundary via `skills/session-handoff`; overwritten by each new handoff.
- `blocker-<topic>.md` — written when debugging stalls via `skills/blocker-note`; deleted or marked resolved when the blocker is cleared.

These are working state, not project documentation. Durable task status belongs in `docs/TASKS.md`; durable decisions belong in `docs/DECISIONS.md`.

## Commit Policy

- `handoff.md` is transient session state: do not commit it (ignored via `.gitignore`).
- `blocker-<topic>.md` files are durable project state: commit them when they are referenced from `docs/TASKS.md`, so other machines and reviewers can resolve the pointer.
- When a blocker is resolved, remove the `docs/TASKS.md` pointer and either delete the blocker note or mark it resolved if the history remains useful (resolution is owned by `skills/bugfix-debug-loop`).
