---
id: decision-forbid-agent-production-database-access
date: 2026-07-24
updated: 2026-07-30
status: accepted
area: auth-security
tasks: [19, 25, 26]
pr: 14
tags: [account-deletion, agents, mcp, production, security, supabase]
supersedes: []
---

# Forbid coding-agent production database access and account deletion

## Context

Approval labels can make high-impact tool actions possible, but production
database access carries data-loss, privacy, and environment-confusion risks
that are not appropriate for this repository's coding-agent workflow. The
product also needs a protected Delete Account flow, while executing that
destructive operation during agent-led implementation or verification can erase
identity and rating data even in local or staging environments.

## Decision

Coding agents and MCP tools must not read from or write to the production
database. This action is forbidden rather than merely high-impact or
approvable. Agent database work is limited to explicitly scoped local or
staging environments.

Coding agents and MCP tools must also never execute account deletion on local,
staging, or production through the app, MCP, SQL, or an admin API. Agents may
implement and non-destructively test the protected in-app Delete Account
feature, but its destructive end-to-end acceptance check is human-run and
recorded.

The authority classifier is mutually exclusive:

- **READ** permits schema inspection only in local or explicitly approved
  staging.
- **HIGH IMPACT** covers application/service deployment, non-account
  deletion, and credential changes only when they do not touch a production
  database.
- **FORBIDDEN** covers every production database read, schema inspection,
  write, drop, delete, migration, or credential action, plus account deletion
  in every environment.

When an action matches more than one description, the stricter classification
wins.

## Consequences

- An approval cannot turn a production database action into an allowed agent
  action.
- Environment identity must be confirmed before database tooling runs.
- Task 19 must separate implementation/non-destructive checks from the
  human-owned destructive deletion check.
- A coding agent cannot self-certify the Delete Account acceptance item by
  deleting a fixture account.
- Agents may prepare the manual deletion checklist, but may not execute it
  through a browser, MCP, SQL console, or admin API.
- Production investigation or change requires a separate human-controlled
  operating process.

## Revisit when

The project establishes a dedicated production operations process with
auditable least-privilege access, backups, rollback, and explicit human
ownership outside the coding-agent workflow, and any proposed account-deletion
test process is explicitly reviewed and recorded in a superseding decision.

## Related

- `docs/MCP_WORKFLOW.md`
- `docs/SECURITY.md`
- `docs/TASKS.md`
- `skills/feature-slice-builder/SKILL.md`
- `.cursor/rules/mcp-policy.mdc`
