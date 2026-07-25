---
id: decision-documentation-ships-with-changes
date: 2026-06-28
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [documentation, workflow]
supersedes: []
---

# Ship affected documentation with meaningful changes

## Context

Future sessions use repository documents as operating state. Deferring
documentation updates leaves task order, contracts, product behavior, and
validation guidance inconsistent with the change that introduced the drift.

## Decision

Every meaningful code, configuration, workflow, design, schema, dependency,
route, or product change updates its affected canonical documents before
handoff. When no document is affected, the handoff or PR states
`No documentation update needed` with a reason.

## Consequences

- The document update map is part of the definition of done.
- Routine implementation work does not create an ADR unless it also introduces
  a durable high-impact decision.
- PRs and completion reports identify the documents updated or the reason none
  changed.

## Revisit when

An automated contract or documentation system can prove the same consistency
without requiring updates in the implementation branch.

## Related

- `docs/DOCUMENTATION_POLICY.md`
- `docs/AGENT_WORKFLOW.md`
- `.github/pull_request_template.md`
