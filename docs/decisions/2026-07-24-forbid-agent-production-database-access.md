---
id: decision-forbid-agent-production-database-access
date: 2026-07-24
status: accepted
area: auth-security
tasks: []
pr: 14
tags: [agents, mcp, production, security, supabase]
supersedes: []
---

# Forbid coding-agent access to the production database

## Context

Approval labels can make high-impact tool actions possible, but production
database access carries data-loss, privacy, and environment-confusion risks
that are not appropriate for this repository's coding-agent workflow.

## Decision

Coding agents and MCP tools must not read from or write to the production
database. This action is forbidden rather than merely high-impact or
approvable. Agent database work is limited to explicitly scoped local or
staging environments.

## Consequences

- An approval cannot turn a production database action into an allowed agent
  action.
- Environment identity must be confirmed before database tooling runs.
- Production investigation or change requires a separate human-controlled
  operating process.

## Revisit when

The project establishes a dedicated production operations process with
auditable least-privilege access, backups, rollback, and explicit human
ownership outside the coding-agent workflow.

## Related

- `docs/MCP_WORKFLOW.md`
- `docs/SECURITY.md`
- `.cursor/rules/mcp-policy.mdc`
