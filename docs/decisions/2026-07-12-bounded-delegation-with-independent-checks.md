---
id: decision-bounded-delegation-with-independent-checks
date: 2026-07-12
status: superseded
updated: 2026-09-05
superseded_by: decision-simplify-agent-infrastructure
area: agent-workflow
tasks: []
pr: null
tags: [delegation, review, subagents, verification]
supersedes: []
---

# Bound delegated writes and keep review independent

## Context

Delegation can isolate context and improve checking, but unconstrained write
authority or self-acceptance makes scope and risk harder to control.

## Decision

Historical decision. The replacement preserves its substantive boundaries and
changes only the infrastructure ownership/continuation rules described there.

The parent owns scope, decomposition, escalation, and acceptance. Write-enabled
subagents receive one explicit task packet and file boundary. Meaningful work
gets independent read-only review and final verification; high-risk schema,
auth, security, production-infrastructure, and destructive work returns to the
parent.

## Consequences

- Subagents never accept their own work.
- Retry budgets and stop conditions remain bounded across delegated phases.
- Delegation is skipped when its handoff cost exceeds the value of isolation or
  independent checking.

## Revisit when

The execution environment can enforce file, capability, and acceptance
boundaries mechanically with equivalent or stronger guarantees.

## Related

- `docs/AGENT_WORKFLOW.md`
- `.cursor/rules/orchestration.mdc`
- `.cursor/agents/`
- `docs/decisions/2026-09-05-simplify-agent-infrastructure.md`
