---
id: decision-github-project-board-derived-mirror
date: 2026-09-02
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [agents, documentation, github, workflow]
supersedes: []
---

# Treat GitHub Project #4 as a derived mirror of the task ledger

## Context

GitHub Project #4 ("Eazy Review Roadmap") publicly tracks every numbered task,
unnumbered gate, simplification packet, and future idea with its own ten-value
`Status` vocabulary. Until now nothing in the repository said when the board is
refreshed, who may move a card, how its statuses map to `docs/TASKS.md`
wording, or how agents classify those writes. The only role statement lived in
an unregistered plan file and in the board's own off-repository README, so the
board was drifting toward a fourth, unversioned source of truth beside the
ledger, the decision records, and session notes.

## Decision

`docs/TASKS.md` remains the sole owner of task and initiative status. GitHub
Project #4 is a derived public mirror that never leads the ledger and never
authorizes work.

- The status mapping, item-identity convention, sync timing, and write
  ownership live once in `docs/DOCUMENTATION_POLICY.md` (GitHub Project #4
  Mirror). `gh project` call classification lives in `docs/MCP_WORKFLOW.md`.
- Sync attaches to the existing documentation gate (Completion Sequence
  step 9): after a ledger status changes, the agent lists proposed card moves
  on the mandatory `Project #4 moves:` line of the PR body, or writes `none`.
- A human applies the moves at merge or acceptance. An agent may apply only
  the listed moves after explicit authorization, one REVERSIBLE WRITE per
  item, resolving board IDs at call time rather than storing them in the repo.
  Bulk, schema, or unbacked `Completed` moves are HIGH IMPACT; item or project
  deletion is FORBIDDEN.
- The board is not a project-memory category, not a checker input, and not a
  CI dependency. No token-bearing CI job, generator, snapshot file, or skill is
  introduced for it.

## Consequences

- Future sessions have one place that says how and when the board follows the
  ledger, so board updates stop being an ad hoc verification note.
- The board may lag the ledger between merge and the human's card move; it can
  never contradict the ledger with authority.
- The `Project #4 moves:` line must be filled (or `none`) on every PR, like
  `Docs updated:`.
- The Memory Rule is unchanged: three memory kinds, with the board and the
  approved plans under `docs/superpowers/` named as non-memory surfaces.

## Revisit when

Manual board sync is missed on three or more merged PRs, or the ledger grows
enough that a checker-validated snapshot (a `config/project-board.json` compared
against a read-only `gh project item-list`) would cost less than the manual
step. Either trigger reopens this record together with the deferred Agent
infrastructure checker v2 follow-up in `docs/TASKS.md`; neither makes the board
canonical.

## Related

- `docs/DOCUMENTATION_POLICY.md`
- `docs/MCP_WORKFLOW.md`
- `docs/AGENT_WORKFLOW.md`
- `docs/LOOP_ENGINEERING.md`
- `docs/TASKS.md`
- `.github/pull_request_template.md`
