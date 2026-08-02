---
id: decision-machine-readable-agent-infrastructure-graph
date: 2026-08-01
status: accepted
area: agent-workflow
tasks: []
pr: null
tags: [agents, documentation, graph, tooling]
supersedes: []
---

# Layer a machine-readable document graph above existing loops

## Context

The repository's skills and bounded delegation loops were useful, but document
lifecycle, mirror ownership, cross-document dependencies, validation command
authority, and task parallelism lived only in prose. That allowed read-only
and mutating validation to blur together and made ownership drift difficult to
detect consistently.

## Decision

Keep the existing loop/skill system and add a lightweight graph above it.
`config/agent-infrastructure.json` is the machine-readable source for document
lifecycle, ownership, mirrors, generated-command declarations, dependencies,
stale terms, changed-path impacts, and the strict Task 13–29 metadata contract.
A Node-standard-library checker validates the graph and reports document
impact without introducing a graph runtime.

Registered documents exist in a clean checkout by default. Intentionally
transient, gitignored session state may remain registered with
`requiredOnDisk: false`; the checker validates it when present and permits it
to be absent from CI.

The graph owns dependencies, role authority, parallelism, review gates, and
human approval. Skills continue to own retries, hypotheses, verification, stop
conditions, memory, and handoff. Preparation and full Expo validation remain
parent/CI-owned; the verifier runs only read-only checks. Tasks 16–19 remain
parent-owned, verified-strong implementations, with only bounded
non-sensitive leaf packets available to the generic implementer.

## Consequences

- CI can reject structural document, mirror, task, and stale-term drift.
- Generated wrappers and the decision index retain their existing dedicated
  commands; the graph points to those commands instead of reimplementing them.
- Human and independent-reviewer judgment is still required for semantic
  correctness and affected-document decisions.
- No new skill, subagent role, graph database, orchestration dependency, or
  product runtime is introduced.

## Revisit when

A repository-native documentation/orchestration standard can enforce the same
lifecycle, ownership, dependency, authority, and impact contracts with less
project-specific code and equal reviewability.

## Related

- `config/agent-infrastructure.json`
- `scripts/check-agent-infrastructure.cjs`
- `docs/AGENT_WORKFLOW.md`
- `docs/DOCUMENTATION_POLICY.md`
- `docs/LOOP_ENGINEERING.md`
