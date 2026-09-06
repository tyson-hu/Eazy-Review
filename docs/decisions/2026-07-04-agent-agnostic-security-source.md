---
id: decision-agent-agnostic-security-source
date: 2026-07-04
status: superseded
updated: 2026-09-05
superseded_by: decision-simplify-agent-infrastructure
area: auth-security
tasks: []
pr: null
tags: [agents, guardrails, security]
supersedes: []
---

# Keep security rules agent-agnostic

## Context

Security-sensitive instructions originally lived in a Cursor-specific rule,
which made their visibility depend on the tool running the session.

## Decision

Historical decision. The replacement preserves its substantive boundaries and
changes only the infrastructure ownership/continuation rules described there.

`docs/SECURITY.md` is the canonical security policy for every human and coding
agent. Tool-specific security rules are thin mirrors or pointers. Agents that
do not auto-attach domain rules must read the matching rule before touching
Expo routing, Supabase/data, or UI code.

## Consequences

- Install, shell, secret, destructive-action, and environment rules have one
  authoritative home.
- Changes to the canonical policy must keep its mirrors synchronized.
- Tool choice cannot weaken the repository's security boundary.

## Revisit when

All supported tools consume one shared policy file directly and no mirrors are
needed.

## Related

- `docs/SECURITY.md`
- `.cursor/rules/security.mdc`
- `AGENTS.md`
- `docs/DOCUMENTATION_POLICY.md`
- `docs/decisions/2026-09-05-simplify-agent-infrastructure.md`
