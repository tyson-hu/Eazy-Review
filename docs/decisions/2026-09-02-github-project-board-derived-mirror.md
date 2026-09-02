---
id: decision-github-project-board-derived-mirror
date: 2026-09-02
status: accepted
area: agent-workflow
tasks: []
pr: 48
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
  step 9): after a ledger status changes, the agent lists the proposed board
  writes — status moves, item creation with every card field, detail updates —
  on the mandatory `Project #4 moves:` line of the PR body, or writes `none`.
- The agent applies every board write; the human approves. Eazy Review is an
  agent-operated project — humans review and approve, agents execute — so the
  human reviews the ledger change and the listed writes and tells the agent
  (PR acceptance or merge, or an explicit go-ahead), and only then does the
  agent apply exactly those writes, one approved write per listed item (a
  create includes the field edits that fill the card), resolving board IDs at
  call time rather than storing them in the repo. A task is not
  complete until the board matches the ledger. Bulk or unlisted writes,
  schema changes, and unbacked `Completed` moves are HIGH IMPACT; item or
  project deletion is FORBIDDEN.
- The board is not a project-memory category, not a checker input, and not a
  CI dependency. No token-bearing CI job, generator, snapshot file, or skill is
  introduced for it.

## Consequences

- Future sessions have one place that says how and when the board follows the
  ledger, so board updates stop being an ad hoc verification note.
- The board may lag the ledger between the ledger change and the human's
  approval; once approved, the agent closes the gap before reporting the task
  complete. The board can never contradict the ledger with authority.
- Acceptance is recorded in `docs/TASKS.md` inside the PR being accepted, and
  merge is the last repository action for a task: the `Completed` board write
  follows the merge immediately and no post-merge closeout PR exists. Merge
  itself requires green exact-head CI and zero unresolved review threads
  (`docs/DOCUMENTATION_POLICY.md`, Acceptance And Merge).
- The `Project #4 moves:` line must be filled (or `none`) on every PR, like
  `Docs updated:`, and it is the approval unit: the human approves that list,
  and the agent writes nothing beyond it without a further approval.
- Card details are agent-maintained. Humans do not hand-edit the board as
  routine; if they do, the agent reconciles the board to the ledger on the next
  sync.
- The Memory Rule is unchanged: three memory kinds, with the board and the
  approved plans under `docs/superpowers/` named as non-memory surfaces.

## Revisit when

Board sync is missed — board and ledger disagree after acceptance — on three or
more merged PRs, or the ledger grows
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
