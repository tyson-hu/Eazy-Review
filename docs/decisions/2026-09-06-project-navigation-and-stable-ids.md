---
id: decision-project-navigation-and-stable-ids
date: 2026-09-06
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [documentation, github, navigation, workflow]
supersedes: []
---

# Separate permanent project identity from navigation and task numbers

## Context

Project #4 grew to 70 draft items with several ID formats. All three views
showed the full inventory; completed work and ideas crowded the starting view,
and the timeline had no date fields. GitHub's visible row numbers could be
confused with the actual ID column. The maintainer approved a six-view design
and an exact ID migration on 2026-09-06.

## Decision

Keep the existing Project and draft objects. Give each item one permanent
ER ID and retain its original ID in Alias. IDs remain independent of lane,
workflow status, priority, task number and PR number. Allocate new IDs against
active and archived items and never reuse one. Resolve either reference to a
unique item before using or changing it.

Use focused saved table views, with Open work as the default, and retain
unfiltered All items for complete search. Put the permanent ID in each title,
show compact daily columns and expose a Source link to the repository contract.
Preserve all historical evidence and document task numbers. Renaming two
planning fields changes their labels, not their values or authority.

The existing derived-mirror decision remains binding. DOCUMENTATION_POLICY
owns the identity, view and card contract; MCP_WORKFLOW owns tool execution.
This is a navigation redesign, not a second task ledger, CI dependency,
automatic synchronization job, or new skill. Approval of the design does not
claim that the hosted migration or repository publication has occurred.

## Consequences

- People can find work by outcome, stable ID or a reference from an old chat.
- Agents have exact ID/Alias lookup and a direct route to the canonical source.
- A one-time mapping and collision check are required; thereafter moving an
  item between categories does not change its identity.
- The initial alignment between ER-001–ER-029 and Tasks 1–29 is convenience,
  not a rule assigning future task numbers to ER IDs.
- Completed history and unscheduled ideas stay available without crowding the
  default view. Gated and deferred work remains explicitly unselected.
- Repository-policy publication and the approved hosted migration must be
  coordinated so readers do not receive conflicting identity instructions.

## Revisit when

The saved views no longer answer ordinary lookup questions, aliases become
ambiguous, or a selected workflow needs native issue relationships. Revisit
those specific needs without renumbering existing IDs or making the board
authoritative over the task ledger.

## Related

- `docs/DOCUMENTATION_POLICY.md`
- `docs/MCP_WORKFLOW.md`
- `docs/TASKS.md`
- `docs/decisions/2026-09-02-github-project-board-derived-mirror.md`
