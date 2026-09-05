---
id: decision-proportional-agent-validation
date: 2026-09-05
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [agents, documentation, validation]
supersedes: []
---

# Select agent validation from the changed contract

## Context

The infrastructure audit found conflicting requirements for documentation-only
validation: targeted checks were permitted, but the completion sequence also
required the full application/type/lint gate after any registered document
edit. Literal-copy requests could inherit screen-building verification despite
leaving behavior unchanged. The user authorized implementing the audit's
corrections on a separate branch.

## Decision

Keep validation selection in `docs/AGENT_WORKFLOW.md`. A narrowly defined
spelling/literal-copy exception uses Git state, the intended diff, whitespace
validation, and inspection of any affected layout/accessibility meaning.
Behavior, routes, contracts, commands, policies, skill metadata, generated
content, and machine-parsed fields are outside that exception.

Other documentation-only changes use their affected structural checks.
Meaningful code, executable configuration, validation-contract changes, and
combined final trees containing them retain `npm run check:readonly`.
Explicitly requested broader checks and PR/exact-head requirements still apply.
Every executable check remains subject to trusted-base review or exact-SHA,
disposable, credential-free isolation. Parent preparation and full Expo
validation retain their existing ownership.

## Consequences

- Agents can finish literal-copy work without unrelated checks or a forced
  session transition; a parsed field or policy change cannot use that shortcut.
- The command definitions and existing security, acceptance, merge, deployment,
  and board-write boundaries remain in their canonical homes.
- Decision simulations support the narrower wording, but do not establish
  runtime savings or reliability across agent hosts. Structural tests alone
  do not validate instruction usefulness.

## Revisit when

A copy-only classification misses a relevant effect, a required gate is skipped,
or host-specific decision probes show that agents cannot apply the boundary
consistently. Correct the demonstrated case before adding another router or
validation framework.

## Related

- `AGENTS.md`
- `docs/AGENT_WORKFLOW.md`
- `docs/DOCUMENTATION_POLICY.md`
- `docs/notes/agent-infrastructure-audit.md`
