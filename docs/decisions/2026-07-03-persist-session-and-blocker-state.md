---
id: decision-persist-session-and-blocker-state
date: 2026-07-03
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [blockers, handoff, session-state, workflow]
supersedes: []
---

# Persist session boundaries and stalled debugging in files

## Context

Long or stalled sessions lose important state when plans, failed hypotheses,
and the next action exist only in chat. Continuing in overloaded context also
causes repeated attempts and forgotten corrections.

## Decision

At a session boundary, stop new work and write `docs/notes/handoff.md` through
the session-handoff routine. When debugging reaches the stall threshold, write
a topic-specific blocker note and stop retrying. Task status and durable
decisions remain in their own canonical homes.

## Consequences

- Fresh sessions resume from repository state instead of old transcripts.
- Handoff notes stay transient; referenced blocker notes may be committed.
- A blocker is resolved through the bug-fix workflow, not by accumulating
  unbounded attempts.

## Revisit when

The collaboration environment provides durable, repository-scoped state with
the same reviewability and cross-tool portability.

## Related

- `docs/AGENT_WORKFLOW.md`
- `docs/LOOP_ENGINEERING.md`
- `docs/notes/README.md`
- `skills/session-handoff/SKILL.md`
- `skills/blocker-note/SKILL.md`
