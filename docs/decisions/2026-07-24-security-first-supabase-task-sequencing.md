---
id: decision-security-first-supabase-task-sequencing
date: 2026-07-24
updated: 2026-07-30
status: superseded
superseded_by: decision-sequence-connected-client-before-screen-integration
area: data-supabase
tasks: [11, 12, 13, 14, 15, 16, 17, 18]
pr: 14
tags: [security, supabase, task-sequencing]
supersedes: []
---

# Sequence Supabase work as security-first milestones

## Context

After the mock UX gate passed, one broad “add Supabase” task would mix schema,
authorization, reads, auth, writes, aggregation, and client caching. That makes
security boundaries hard to review and encourages the UI to connect before the
backend contract is safe.

## Decision

Implement Tasks 11–18 as ordered milestones: environments and locked-down core
schema; policies, grants, and authorization tests; seed data; real reads; auth;
My Rating persistence; trusted aggregates; then TanStack Query integration.
Do not expand unrelated UI, Feed, agents, MCP, scraping, social, or AI scope
while the foundation is open.

## Consequences

- Each milestone has a narrow contract and review boundary.
- Data API exposure is not used to accelerate an earlier task.
- `docs/TASKS.md` owns packet detail and progress; this record owns only the
  durable sequencing rationale.

## Revisit when

An earlier milestone proves the documented order unsafe or impossible and the
replacement sequence preserves the same authorization and review guarantees.

## Related

- `docs/TASKS.md`
- `docs/ROADMAP.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
