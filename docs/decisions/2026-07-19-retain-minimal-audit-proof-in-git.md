---
id: decision-retain-minimal-audit-proof-in-git
date: 2026-07-19
status: accepted
area: tooling-ci
tasks: [10]
pr: null
tags: [audits, evidence, git]
supersedes: []
---

# Retain a minimal audit proof set in Git

## Context

Interactive UX audits produce many screenshots and diagnostics. Committing
every capture bloats the repository, while deleting or overwriting evidence
weakens reviewability and historical proof.

## Decision

Each audit keeps its report and the smallest representative, non-sensitive PNG
proof set in Git. Complete raw captures remain local and are not deleted or
overwritten merely to reduce the committed set. Omitted filenames are labeled
as local capture IDs.

## Consequences

- Audit reports remain reviewable without turning Git into raw capture storage.
- New runs use new evidence directories and preserve earlier evidence.
- Sensitive captures are never retained as valid evidence.

## Revisit when

The project adopts durable external artifact storage with stable links,
retention guarantees, and access controls suitable for audit evidence.

## Related

- `docs/EVIDENCE_GITHUB_UPLOAD_SOP.md`
- `docs/evidence/README.md`
- `skills/interactive-preview-loop/SKILL.md`
- `docs/SECURITY.md`
