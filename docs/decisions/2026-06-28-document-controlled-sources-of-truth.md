---
id: decision-document-controlled-sources-of-truth
date: 2026-06-28
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [documentation, source-of-truth, workflow]
supersedes: []
---

# Keep product and engineering direction in canonical documents

## Context

Multiple coding tools work in the repository. Without durable, scoped sources
of truth, each session can reconstruct product or technical direction
differently.

## Decision

Product, design, data, API, flow, task, security, and workflow direction live
in their dedicated canonical documents. `AGENTS.md` stays a compact operating
guide and router; tool-specific rules point to canonical homes instead of
duplicating their full content.

## Consequences

- The canonical-homes table determines where durable detail belongs.
- Context is loaded by task type instead of reading every document.
- Tool suggestions and generated output do not outrank the project documents.

## Revisit when

The repository adopts a different document-control system that gives every
supported tool an equally reliable and reviewable source of truth.

## Related

- `AGENTS.md`
- `docs/AGENT_WORKFLOW.md`
- `docs/BLUEBOOK.md`
- `docs/DOCUMENTATION_POLICY.md`
