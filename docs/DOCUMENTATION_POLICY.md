# Documentation Policy

Documentation is part of the change, not a cleanup task after the change.

Every meaningful code, configuration, workflow, design, schema, dependency, route, or product change must either:
- Update the affected project documents in the same branch before commit/PR handoff.
- Or explicitly state `No documentation update needed` with a short reason in the final response or PR description.

Tiny typo fixes, formatting-only edits, and internal implementation changes with no visible behavior, contract, workflow, or architecture impact may use the no-docs-needed path.

## Machine-Readable Enforcement

This prose explains the policy. `config/agent-infrastructure.json` is the
machine-readable enforcement source for document lifecycle, ownership,
source-to-mirror relationships, generated-command ownership, dependency
edges, stale-term rules, changed-path impact rules, and the strict Task 13–29
metadata contract.

Document registry entries declare whether they are files or directories, and
the checker rejects kind substitutions as well as missing paths. Entries are
required to exist by default. Only intentionally transient status documents
under `docs/notes/` may set `requiredOnDisk: false`, so the graph can retain
their lifecycle and ownership metadata without making a clean CI checkout
manufacture session state.

An active directory registration covers its current text descendants for
stale-term validation. Traversal excludes any nested path separately registered
as historical, so current ADR files remain active while
`docs/decisions/archive/**` remains point-in-time history.

- `npm run check:agent-infra` validates that contract without writing files.
- `node scripts/check-agent-infrastructure.cjs --report <changed-path>...`
  prints which documents require review for the supplied paths, including
  dependency, bidirectional source/mirror, and generated-artifact propagation.
  Report mode validates the manifest structure but remains available while
  active-document drift is being repaired; `npm run check:agent-infra`
  enforces the complete current-repository contract.

The checker catches structural drift; it does not decide whether prose is
semantically correct, whether an ADR is warranted, or whether a listed
document actually needs a content change. Parent and independent reviewer
judgment remain required. When the report and this prose differ, stop and
correct the config or policy together rather than silently choosing one.

### Task-ledger grammar enforced by the checker

`docs/TASKS.md` Task 13–29 metadata is validated against a narrow plain-Markdown
grammar, not against full CommonMark or GitHub Flavored Markdown rendering
equivalence:

- ATX level-two headings (`## Task N:` and `## Revised Sequence`) with
  canonical positive integers (`[1-9]\d*`; no leading zeros).
- Revised Sequence pipe table with the exact header
  `| Task | Title | Status |`, a Markdown delimiter row, and contiguous data
  rows immediately after that delimiter.
- Single-line `Field: value` metadata before each task's `Goal:` boundary.
- Task references use singular `Task N` for one number and plural
  `Tasks N–M` / comma-`and` lists for multiple numbers.
- HTML comments and fenced code (opening indent 0–3 spaces; bare closing
  fences) are inactive for machine parsing.
- Raw HTML block openers capable of hiding the ledger (`<pre`, `<script`,
  `<style`, `<table`, `<div`, and HTML declarations) are rejected inside the
  machine-parsed Revised Sequence / Task 13–29 region rather than interpreted.
  Container openers (`pre`/`script`/`style`) are detected across blank lines.

Arbitrary Markdown constructs (blockquotes, nested lists, indented code,
additional raw HTML block types, tabs with context-sensitive meaning, Setext
headings, or a full CommonMark state machine) are intentionally outside this
checker. Remaining rendering-equivalence risk is owned by the deferred
**Agent infrastructure checker v2** structured task-graph migration in
`docs/TASKS.md`, which replaces Markdown semantic parsing with
`config/task-graph.json`.

## Pre-Commit Documentation Gate

Before staging or committing, agents must:

1. Review the changed files with `git status --short` and `git diff --name-only`.
2. Identify which docs are affected by the change.
3. Update those docs before committing.
4. If the change introduces or changes a durable high-impact decision, add or update one ADR-style record under `docs/decisions/` using `docs/decisions/README.md`, then run `npm run decisions:build`.
5. Confirm in the final response or PR body which docs changed, or why no docs changed, and list proposed Project #4 board writes (or `none`) per the GitHub Project #4 Mirror section below; the agent applies them after human approval.

Do not leave docs stale because a change is "obvious from the code." Future agents use the docs as source of truth.

Do not record routine bug fixes, review-finding closure, task progress,
validation runs, patch alignment, or documentation synchronization as
decisions. `docs/DECISIONS.md` is generated and must not be edited directly;
`npm run decisions:check` validates the records and index.

## Document Update Map

Product scope, positioning, MVP boundaries, or success criteria:
- `docs/BLUEBOOK.md`
- `docs/ROADMAP.md`
- `docs/TASKS.md`
- `docs/decisions/*.md` only for a qualifying durable product decision

UI design, visual system, components, screen layouts, or Stitch direction:
- `docs/DESIGN.md` (sole product UI source of truth)
- `tailwind.config.js` when configured token values change
- `docs/STITCH_PROMPTS.md` only when reusable prompt copy or its deliberately
  inlined token values change
- `docs/USER_FLOWS.md` only when navigation or screen behavior changes
- `docs/decisions/*.md` only for a qualifying durable design-system decision

`docs/research/*` is historical/non-authoritative and is not a routine
implementation sync target. `docs/UI_STYLE.md` is a migration pointer only.

Navigation, routes, user flows, auth gates, or screen behavior:
- `docs/USER_FLOWS.md`
- `docs/TASKS.md`
- `docs/BLUEBOOK.md` when scope changes
- `docs/decisions/*.md` only for a qualifying durable flow decision

Data model, Supabase, auth, RLS, storage, triggers, or migrations:
- `docs/DATA_MODEL.md`
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `docs/decisions/*.md` only for a qualifying durable data, auth, or security decision

Frontend API shape, query hooks, mutation hooks, types, mock data, or folder structure:
- `docs/API_CONTRACTS.md`
- `docs/TASKS.md`
- `docs/DATA_MODEL.md` when database contracts change
- `docs/decisions/*.md` only for a qualifying durable contract decision

Tooling, scripts, dependencies, quality checks, local setup, or developer workflow:
- `README.md`
- `AGENTS.md`
- `docs/TASKS.md`
- `docs/AGENT_WORKFLOW.md` (Validation Commands) when a check, gate, or
  generated-command changes
- `docs/DOCUMENTATION_POLICY.md` when the documentation gate itself changes
- `docs/SECURITY.md` when install, shell, dependency-approval, or secret rules change
- `docs/MCP_WORKFLOW.md` when agent/tool workflow changes
- `docs/RELEASE_CHECKLIST.md` when release validation changes
- `docs/decisions/*.md` only for a qualifying durable workflow, tooling, or dependency decision

Agent behavior, Cursor rules, MCP setup, or AI workflow:
- `AGENTS.md`
- `.cursor/rules/*`
- `.cursor/agents/*` (subagent definitions; keep aligned with the Delegation And Subagent Policy and its Roles And Rollout Status table in `docs/AGENT_WORKFLOW.md`)
- `config/agent-infrastructure.json` when a registered document, mirror,
  dependency, generated command, stale-term rule, or impact rule changes
- `docs/SECURITY.md` when security rules change (keep `.cursor/rules/security.mdc` mirrored)
- `docs/AGENT_WORKFLOW.md`
- `docs/LOOP_ENGINEERING.md`
- `docs/MOBILE_SIMULATOR_SOP.md`, `docs/WEB_MOBILE_PREVIEW_SOP.md`, `docs/UX_SCREENSHOT_AUDIT_SOP.md`, `docs/EVIDENCE_GITHUB_UPLOAD_SOP.md`, `docs/evidence/README.md`, and `skills/interactive-preview-loop` when interactive preview, UX audit, or evidence upload procedure changes
- `skills/*/SKILL.md` (canonical skill bodies) and the generated discovery
  wrappers in `.claude/skills/*` and `.agents/skills/*`. The two wrapper trees
  are byte-for-byte identical to each other; each wrapper points to its
  canonical skill and intentionally does not copy the canonical body.
- `docs/MCP_WORKFLOW.md`
- `docs/DOCUMENTATION_POLICY.md`
- `docs/decisions/*.md` only for a qualifying durable agent-workflow decision

Release readiness, QA criteria, security checks, or store-readiness work:
- `docs/RELEASE_CHECKLIST.md`
- `docs/TASKS.md`
- `README.md` when setup or release instructions change
- `docs/decisions/*.md` only for a qualifying durable release-process decision

Approved implementation plans and design specs under `docs/superpowers/plans/`
and `docs/superpowers/specs/` are registered status documents (planning
artifacts). Editing one requires `docs/TASKS.md` to still agree with it
(`docs/LOOP_ENGINEERING.md`, Memory Rule).

## GitHub Project #4 Mirror

GitHub Project #4 ("Eazy Review Roadmap", owner `tyson-hu`) is a derived public
mirror of `docs/TASKS.md`. The ledger is authoritative and the board never
leads it. Board inclusion or status authorizes nothing — not implementation,
merge, deployment, hosted configuration, database changes, production access,
or account deletion. The board is not a project-memory category
(`docs/LOOP_ENGINEERING.md`, Memory Rule) and is not a checker or CI input.

Item identity is the board `ID` field: `T01`–`T29` for numbered tasks,
`INF-nn` for unnumbered agent-infrastructure gates and follow-ups, packet codes
(`S1`, `E1`, …) plus `O1`, `O2` for the staged-simplification initiative, and
`F01`+ for Future Ideas. Lanes are Core Roadmap, Infrastructure,
Simplification, and Future Ideas.

Status mapping (`docs/TASKS.md` wording → board `Status`):

| Ledger status | Board `Status` |
| --- | --- |
| Done / human accepted / merged | `Completed` |
| Conditional | `Conditional` |
| Pending — waiting on a dependency or human gate | `Gated` |
| Post-MVP, optional workstream, or deferred follow-up | `Deferred` |
| Selected task or packet under implementation | `In Progress` |
| Locally complete with an open PR | `In Review` |
| Specified but unselected (for example E2) | `Ready` |
| Needs runtime proof before selection (for example S3) | `Proof First` |
| Fold-only finding | `Fold Only` |
| Explicitly deferred idea (Post–Task 12 Review Gate list; `docs/BLUEBOOK.md` non-MVP items) | `Candidate` |

When: at Completion Sequence step 9 in `docs/AGENT_WORKFLOW.md`, after the
ledger edit is written. If the change moved a `docs/TASKS.md` status that has a
board item, added a ledger item that needs one, or changed a fact a card
restates (title, summary, gate, delivery PR), retired a ledger item whose card
should leave the board, or changed a fact the board README states, list each
proposed board write as `ID: from → to`, `create ID (Lane): Status`,
`ID: update <field → value, …>`, `archive ID`, or `README: update <the exact
changed lines>`, otherwise write `none`, on the PR body's `Project #4 moves:`
line (`.github/pull_request_template.md`). These five forms are the only writes
the line can carry; anything else needs its own explicit approval. Every write
states the value it will set, not just the field: a `create` names every field
the card will carry (Title, ID, Lane, Status, Priority, Potential work,
Benefit, Confidence, Difficulty, Gate or next move, body) with its value, the
body in the format of the existing cards in its Lane; an `update` pairs each
field with its new value; a README write quotes the changed lines. A field
listed without a value is not approved. Before a PR exists, list the same writes
under "What needs review" in the handoff. Propose `Completed` only when the
ledger already records human acceptance, which happens inside the PR being
accepted (Acceptance And Merge below): the agent records acceptance in
`docs/TASKS.md` in that PR, the human merges, and the agent applies `Completed`
immediately after the merge. Merge is the last repository action for a task;
there is no post-merge closeout PR.

Who: the agent applies every board write, after human approval. This is an
agent-operated project: humans review and approve, agents execute. The human
reviews the ledger change and the listed writes, then tells the agent — PR
acceptance or merge, or an explicit go-ahead in chat. Only after that approval
does the agent apply the listed writes, one approved write per listed item — a
`create` is `item-create` plus the field edits that fill the card, still one
write — using the `gh project` classification, recipe, and stop conditions in
`docs/MCP_WORKFLOW.md`, and a task is not reported complete until the board
matches the ledger. Approval covers exactly the listed writes and values; more
items, other fields, different values, or schema changes need their own
approval. The agent fills every field
on cards it creates and keeps card details consistent with the ledger; humans
do not hand-edit the board as routine. When the board and the ledger disagree,
correct the board or report the mismatch; never edit the ledger to match the
board.

## Commit And PR Expectations

Every commit should keep documents and implementation synchronized as much as practical. If a task needs multiple commits, docs may be updated in the final commit of that task, but they must be current before pushing or opening/merging a PR.

PR bodies use the PR summary template in `docs/AGENT_WORKFLOW.md`, and every task ends against the Definition Of Done there.

### Acceptance And Merge

Merge is the last repository action for a task; the next session starts the
next task, so nothing about the finished task is written after the merge.

1. The human reviews the PR and tells the agent it is accepted.
2. Before merge, the agent records acceptance in `docs/TASKS.md` inside the
   same PR (for example `Done — human accepted in PR #N on <date>`),
   regenerates any affected generated document, re-runs `npm run
   check:readonly`, and pushes. Record the acceptance only, never the merge:
   the text reaches `master` solely through that merge, so it can never claim
   one that did not happen, and a PR that stalls or is abandoned leaves the
   ledger untouched. The PR body's `Project #4 moves:` line lists the resulting
   `ID: In Review → Completed` write.
3. Merge requires exact-head CI green and zero unresolved review threads: every
   automated (Codex, Bugbot, security) or human review comment on the current
   head is either fixed and resolved, or answered with evidence and resolved,
   before the human merges. Resolving a thread is a GitHub write the human
   authorizes together with the fix (`docs/MCP_WORKFLOW.md`).
4. Immediately after the merge the agent applies the listed `Completed` board
   write (GitHub Project #4 Mirror above). No post-merge status-sync PR,
   closeout commit, or evidence note follows; post-merge CI is observed, not
   recorded.
